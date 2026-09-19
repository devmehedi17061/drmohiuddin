"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Save } from "lucide-react";
import { saveProfile } from "@/lib/actions/admin/profile";
import { PROFILE_INITIAL } from "@/lib/actions/state";
import { Alert, Card, btnPrimary, inputClass, labelClass } from "./ui";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      <Save className="size-4" aria-hidden="true" />
      {pending ? "Saving…" : "Save Changes"}
    </button>
  );
}

function PasswordField({
  id,
  name,
  autoComplete,
  error,
}: {
  id: string;
  name: string;
  autoComplete: string;
  error?: string;
}) {
  const [reveal, setReveal] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={reveal ? "text" : "password"}
          autoComplete={autoComplete}
          className={`${inputClass} pr-11`}
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "Hide password" : "Show password"}
          title={reveal ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-colors hover:text-slate-600"
        >
          {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction] = useActionState(saveProfile, PROFILE_INITIAL);

  return (
    <Card
      title="Personal Info & Password"
      description="Change your own name and login password here. This only affects your own account."
    >
      <form action={formAction} className="space-y-5" key={state.ok ? "saved" : "form"}>
        {state.message ? <Alert ok={state.ok}>{state.message}</Alert> : null}

        <div>
          <label htmlFor="p-email" className={labelClass}>
            Email
          </label>
          <input id="p-email" value={email} disabled className={inputClass} />
          <p className="mt-1 text-xs text-slate-500">Email cannot be changed.</p>
        </div>

        <div>
          <label htmlFor="p-name" className={labelClass}>
            Name
          </label>
          <input
            id="p-name"
            name="name"
            required
            maxLength={120}
            defaultValue={name}
            className={inputClass}
          />
          {state.errors?.name ? <p className="mt-1 text-xs text-rose-600">{state.errors.name}</p> : null}
        </div>

        <div className="border-t border-slate-200 pt-5">
          <label htmlFor="p-current" className={labelClass}>
            Current Password <span className="text-rose-500">*</span>
          </label>
          <PasswordField
            id="p-current"
            name="current_password"
            autoComplete="current-password"
            error={state.errors?.current_password}
          />
          <p className="mt-1 text-xs text-slate-500">
            For security, your current password is required for any change — name or password.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-new" className={labelClass}>
              New Password <span className="text-slate-400">(if changing)</span>
            </label>
            <PasswordField
              id="p-new"
              name="new_password"
              autoComplete="new-password"
              error={state.errors?.new_password}
            />
          </div>
          <div>
            <label htmlFor="p-confirm" className={labelClass}>
              Confirm New Password
            </label>
            <PasswordField
              id="p-confirm"
              name="confirm_password"
              autoComplete="new-password"
              error={state.errors?.confirm_password}
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <SaveButton />
        </div>
      </form>
    </Card>
  );
}
