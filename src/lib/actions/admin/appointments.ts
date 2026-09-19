"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { audit, authorize } from "@/lib/auth/session";
import type { AppointmentStatus } from "@/lib/types";
import { STATUS_LABELS, type FormState } from "../state";

const STATUSES: AppointmentStatus[] = ["new", "contacted", "confirmed", "cancelled"];

function authFail(err: unknown): FormState {
  const code = err instanceof Error ? err.message : "";
  return {
    ok: false,
    message:
      code === "FORBIDDEN"
        ? "You don't have permission to do this."
        : "Your session has expired. Please log in again.",
  };
}

export async function setAppointmentStatus(id: number, status: string): Promise<FormState> {
  let user;
  try {
    user = await authorize("update", "appointments");
  } catch (err) {
    return authFail(err);
  }

  if (!Number.isInteger(id) || id < 1) return { ok: false, message: "Invalid ID." };
  if (!STATUSES.includes(status as AppointmentStatus)) {
    return { ok: false, message: "Unknown status." };
  }

  await execute("UPDATE appointments SET status = ? WHERE id = ?", [status, id]);
  await audit(user, "status", "appointments", id, status);
  revalidatePath("/admin-panel/dashboard/appointments");
  revalidatePath("/admin-panel/dashboard");

  return { ok: true, message: `Status set to "${STATUS_LABELS[status as AppointmentStatus]}".` };
}

export async function deleteAppointment(id: number): Promise<FormState> {
  let user;
  try {
    user = await authorize("delete", "appointments");
  } catch (err) {
    return authFail(err);
  }

  if (!Number.isInteger(id) || id < 1) return { ok: false, message: "Invalid ID." };

  await execute("DELETE FROM appointments WHERE id = ?", [id]);
  await audit(user, "delete", "appointments", id);
  revalidatePath("/admin-panel/dashboard/appointments");
  revalidatePath("/admin-panel/dashboard");

  return { ok: true, message: "Request deleted." };
}
