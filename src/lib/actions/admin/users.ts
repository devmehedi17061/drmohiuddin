"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne } from "@/lib/db";
import { audit, authorize, hashPassword, revokeSessions } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/jwt";
import type { FormState } from "../state";

const MIN_PASSWORD = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function authFail(err: unknown): FormState {
  const code = err instanceof Error ? err.message : "";
  return {
    ok: false,
    message:
      code === "FORBIDDEN"
        ? "Only an admin can manage users."
        : "Your session has expired. Please log in again.",
  };
}

/** Blocks the change that would leave the panel with no way in. */
async function wouldOrphanAdmins(excludeUserId: number): Promise<boolean> {
  const row = await queryOne<{ n: number }>(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN' AND is_active = 1 AND id <> ?",
    [excludeUserId],
  );
  return Number(row?.n ?? 0) === 0;
}

export async function saveUser(_prev: FormState, formData: FormData): Promise<FormState> {
  let actor;
  try {
    actor = await authorize("create", "users");
  } catch (err) {
    return authFail(err);
  }

  const rawId = String(formData.get("id") ?? "").trim();
  const id = rawId ? Number(rawId) : null;
  if (rawId && (!Number.isInteger(id) || id! < 1)) return { ok: false, message: "Invalid ID." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "EDITOR") as Role;
  const isActive = formData.get("is_active") === "1";

  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Please enter a name.";
  if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email address.";
  if (role !== "ADMIN" && role !== "EDITOR") errors.role = "Invalid role.";
  if (!id && password.length < MIN_PASSWORD) {
    errors.password = `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  if (id && password && password.length < MIN_PASSWORD) {
    errors.password = `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  if (Object.keys(errors).length) {
    return { ok: false, message: "There are some errors in the form.", errors };
  }

  const clash = await queryOne<{ id: number }>(
    `SELECT id FROM users WHERE email = ? ${id ? "AND id <> ?" : ""} LIMIT 1`,
    id ? [email, id] : [email],
  );
  if (clash) {
    return { ok: false, message: "Another account already uses this email.", errors: { email: "Email already in use." } };
  }

  try {
    if (id) {
      const existing = await queryOne<{ role: Role; is_active: number }>(
        "SELECT role, is_active FROM users WHERE id = ?",
        [id],
      );
      if (!existing) return { ok: false, message: "User not found." };

      const losesAdmin =
        existing.role === "ADMIN" && existing.is_active === 1 && (role !== "ADMIN" || !isActive);
      if (losesAdmin && (await wouldOrphanAdmins(id))) {
        return { ok: false, message: "There must be at least one active admin." };
      }
      if (id === actor.id && (!isActive || role !== "ADMIN")) {
        return { ok: false, message: "You cannot remove your own admin role or deactivate yourself." };
      }

      await execute("UPDATE users SET name = ?, email = ?, role = ?, is_active = ? WHERE id = ?", [
        name,
        email,
        role,
        isActive ? 1 : 0,
        id,
      ]);

      if (password) {
        await execute("UPDATE users SET password_hash = ? WHERE id = ?", [
          await hashPassword(password),
          id,
        ]);
        // Force a fresh login everywhere with the old password.
        await revokeSessions(id);
      }
      if (!isActive) await revokeSessions(id);

      await audit(actor, "update", "users", id, password ? "password changed" : undefined);
      revalidatePath("/admin-panel/dashboard/users");
      return { ok: true, message: "User details saved." };
    }

    const result = await execute(
      "INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?)",
      [name, email, await hashPassword(password), role, isActive ? 1 : 0],
    );

    await audit(actor, "create", "users", result.insertId, role);
    revalidatePath("/admin-panel/dashboard/users");
    return { ok: true, message: "New user created." };
  } catch (err) {
    console.error("[users] create failed", err);
    return { ok: false, message: "Could not save. Please try again." };
  }
}

export async function deleteUser(id: number): Promise<FormState> {
  let actor;
  try {
    actor = await authorize("delete", "users");
  } catch (err) {
    return authFail(err);
  }

  if (!Number.isInteger(id) || id < 1) return { ok: false, message: "Invalid ID." };
  if (id === actor.id) return { ok: false, message: "You cannot delete your own account." };

  const target = await queryOne<{ role: Role; is_active: number; email: string }>(
    "SELECT role, is_active, email FROM users WHERE id = ?",
    [id],
  );
  if (!target) return { ok: false, message: "User not found." };

  if (target.role === "ADMIN" && target.is_active === 1 && (await wouldOrphanAdmins(id))) {
    return { ok: false, message: "The last active admin cannot be deleted." };
  }

  await execute("DELETE FROM users WHERE id = ?", [id]);
  await audit(actor, "delete", "users", id, target.email);
  revalidatePath("/admin-panel/dashboard/users");

  return { ok: true, message: "User deleted." };
}

/** Signs the user out of every device without touching their password. */
export async function forceLogout(id: number): Promise<FormState> {
  let actor;
  try {
    actor = await authorize("update", "users");
  } catch (err) {
    return authFail(err);
  }

  if (!Number.isInteger(id) || id < 1) return { ok: false, message: "Invalid ID." };

  await revokeSessions(id);
  await audit(actor, "revoke-sessions", "users", id);
  revalidatePath("/admin-panel/dashboard/users");

  return { ok: true, message: "That user's sessions have all been signed out." };
}
