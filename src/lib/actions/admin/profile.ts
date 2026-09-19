"use server";

import { getCurrentUser, updateOwnProfile } from "@/lib/auth/session";
import type { FormState } from "../state";

const MIN_PASSWORD = 10;

/**
 * Lets the signed-in user change their own name and/or password from a
 * dedicated "My Profile" page - unlike User Management (ADMIN-only, for
 * managing *other* staff accounts), this works for both roles and is scoped to
 * the caller's own account only.
 */
export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session has expired. Please log in again." };

  const currentPassword = String(formData.get("current_password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  const errors: Record<string, string> = {};
  if (!currentPassword) errors.current_password = "Please enter your current password.";
  if (name.length < 2) errors.name = "Please enter a name.";
  if (newPassword && newPassword.length < MIN_PASSWORD) {
    errors.new_password = `New password must be at least ${MIN_PASSWORD} characters.`;
  }
  if (newPassword && newPassword !== confirmPassword) {
    errors.confirm_password = "The two passwords don't match.";
  }
  if (Object.keys(errors).length) {
    return { ok: false, message: "There are some errors in the form.", errors };
  }

  const result = await updateOwnProfile(currentPassword, {
    name,
    newPassword: newPassword || undefined,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.error,
      errors: result.field ? { [result.field === "currentPassword" ? "current_password" : result.field === "newPassword" ? "new_password" : "name"]: result.error } : undefined,
    };
  }

  return {
    ok: true,
    message: newPassword
      ? "Password changed. Any sessions on other devices have been signed out."
      : "Details saved.",
  };
}
