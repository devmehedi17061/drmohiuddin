"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { submitAppointment } from "@/lib/actions/appointment";
import type { AppointmentState } from "@/lib/actions/public-state";
import type { Chamber } from "@/lib/types";

const INITIAL: AppointmentState = { ok: false, message: "" };

const field =
  "w-full rounded-xl border border-line bg-white px-4 py-3 text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 px-7 py-3.5 text-base font-semibold text-white shadow-soft transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Send className="size-4.5" aria-hidden="true" />
      {pending ? "পাঠানো হচ্ছে…" : "অনুরোধ পাঠান"}
    </button>
  );
}

export function AppointmentForm({ chambers }: { chambers: Chamber[] }) {
  const [state, formAction] = useActionState(submitAppointment, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.message ? (
        <p
          role="status"
          className={
            state.ok
              ? "flex items-start gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              : "flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {state.ok ? (
            <CheckCircle2 className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
          )}
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="ap-name" className="mb-1.5 block text-sm font-medium text-ink-700">
            আপনার নাম <span className="text-red-500">*</span>
          </label>
          <input id="ap-name" name="name" required maxLength={160} className={field} placeholder="পুরো নাম" />
          {state.errors?.name ? (
            <p className="mt-1 text-xs text-red-600">{state.errors.name}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="ap-phone" className="mb-1.5 block text-sm font-medium text-ink-700">
            মোবাইল নম্বর <span className="text-red-500">*</span>
          </label>
          <input
            id="ap-phone"
            name="phone"
            required
            inputMode="tel"
            maxLength={40}
            className={field}
            placeholder="01XXXXXXXXX"
          />
          {state.errors?.phone ? (
            <p className="mt-1 text-xs text-red-600">{state.errors.phone}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="ap-email" className="mb-1.5 block text-sm font-medium text-ink-700">
            ইমেইল <span className="text-ink-400">(ঐচ্ছিক)</span>
          </label>
          <input
            id="ap-email"
            name="email"
            type="email"
            maxLength={190}
            className={field}
            placeholder="you@example.com"
          />
          {state.errors?.email ? (
            <p className="mt-1 text-xs text-red-600">{state.errors.email}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="ap-date" className="mb-1.5 block text-sm font-medium text-ink-700">
            পছন্দের তারিখ <span className="text-ink-400">(ঐচ্ছিক)</span>
          </label>
          <input id="ap-date" name="preferred_date" type="date" className={field} />
        </div>
      </div>

      {chambers.length ? (
        <div>
          <label htmlFor="ap-chamber" className="mb-1.5 block text-sm font-medium text-ink-700">
            চেম্বার নির্বাচন করুন
          </label>
          <select id="ap-chamber" name="chamber_id" className={field} defaultValue="">
            <option value="">— যেকোনো চেম্বার —</option>
            {chambers.map((chamber) => (
              <option key={chamber.id} value={chamber.id}>
                {chamber.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="ap-message" className="mb-1.5 block text-sm font-medium text-ink-700">
          সমস্যার সংক্ষিপ্ত বিবরণ
        </label>
        <textarea
          id="ap-message"
          name="message"
          rows={4}
          maxLength={2000}
          className={`${field} resize-y`}
          placeholder="আপনার সমস্যা সংক্ষেপে লিখুন…"
        />
      </div>

      {/* Honeypot - hidden from users, attractive to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] size-0 opacity-0"
      />

      <SubmitButton />

      <p className="text-center text-xs leading-relaxed text-ink-400">
        জরুরি প্রয়োজনে ফর্মের উপর ভরসা না করে সরাসরি ফোন করুন।
      </p>
    </form>
  );
}
