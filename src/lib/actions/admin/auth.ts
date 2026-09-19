"use server";

import { redirect } from "next/navigation";
import { login, logout } from "@/lib/auth/session";
import type { LoginState } from "../state";

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!email || !password) return { error: "Please enter both email and password." };

  const result = await login(email, password);
  if (!result.ok) return { error: result.error };

  // Only same-origin paths are accepted, so ?next= cannot bounce to another site.
  const target =
    next.startsWith("/admin-panel/dashboard") && !next.startsWith("//")
      ? next
      : "/admin-panel/dashboard";

  redirect(target);
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/admin-panel/login");
}
