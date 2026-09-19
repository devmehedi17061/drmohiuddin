import type { AppointmentStatus } from "@/lib/types";

/**
 * Shared form-state shapes and constants for the admin server actions.
 *
 * These deliberately live outside the `"use server"` modules: such a file may only
 * export async functions, so exporting a plain object from one throws at runtime
 * ("A 'use server' file can only export async functions").
 */
export interface FormState {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

export const EMPTY_STATE: FormState = { ok: false, message: "" };
export const SETTINGS_INITIAL: FormState = { ok: false, message: "" };
export const GALLERY_INITIAL: FormState = { ok: false, message: "" };
export const VIDEO_INITIAL: FormState = { ok: false, message: "" };
export const USER_INITIAL: FormState = { ok: false, message: "" };
export const PROFILE_INITIAL: FormState = { ok: false, message: "" };

export interface LoginState {
  error: string;
}

export const LOGIN_INITIAL: LoginState = { error: "" };

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  new: "New",
  contacted: "Contacted",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};
