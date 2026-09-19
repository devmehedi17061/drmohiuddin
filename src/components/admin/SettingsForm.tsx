"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save } from "lucide-react";
import { saveSettings } from "@/lib/actions/admin/settings";
import { SETTINGS_INITIAL } from "@/lib/actions/state";
import type { SettingGroup } from "@/lib/admin/settings-fields";
import { Alert, Card, inputClass, labelClass, btnPrimary } from "./ui";

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={btnPrimary}>
      <Save className="size-4" aria-hidden="true" />
      {pending ? "Saving…" : "Save"}
    </button>
  );
}

export function SettingsForm({
  group,
  values,
  readOnly,
}: {
  group: SettingGroup;
  values: Record<string, string>;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(async (prev: typeof SETTINGS_INITIAL, fd: FormData) => {
    const result = await saveSettings(prev, fd);
    if (result.ok) router.refresh();
    return result;
  }, SETTINGS_INITIAL);

  return (
    <Card title={group.title} description={group.description}>
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="__group" value={group.id} />

        {state.message ? <Alert ok={state.ok}>{state.message}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {group.fields.map((field) => {
            const id = `s-${field.key}`;
            const value = values[field.key] ?? "";
            const error = state.errors?.[field.key];

            return (
              <div key={field.key} className={field.half ? undefined : "sm:col-span-2"}>
                <label htmlFor={id} className={labelClass}>
                  {field.label}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    id={id}
                    name={field.key}
                    rows={field.rows ?? 3}
                    defaultValue={value}
                    placeholder={field.placeholder}
                    disabled={readOnly}
                    className={`${inputClass} resize-y`}
                  />
                ) : field.type === "image" ? (
                  <SettingImage name={field.key} current={value} disabled={readOnly} />
                ) : (
                  <input
                    id={id}
                    name={field.key}
                    type={field.type === "tel" ? "tel" : field.type === "email" ? "email" : "text"}
                    defaultValue={value}
                    placeholder={field.placeholder}
                    disabled={readOnly}
                    className={inputClass}
                  />
                )}

                {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
                {field.help && !error ? (
                  <p className="mt-1 text-xs text-slate-500">{field.help}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        {!readOnly ? (
          <div className="border-t border-slate-200 pt-4">
            <SaveButton disabled={readOnly} />
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            You have permission to view site settings, but only an admin can change them.
          </p>
        )}
      </form>
    </Card>
  );
}

function SettingImage({
  name,
  current,
  disabled,
}: {
  name: string;
  current: string;
  disabled: boolean;
}) {
  const [remove, setRemove] = useState(false);

  return (
    <div className="space-y-3">
      <input type="hidden" name={`${name}__current`} value={current} />
      <input type="hidden" name={`${name}__remove`} value={remove ? "1" : "0"} />

      {current && !remove ? (
        <div className="flex items-center gap-4">
          <span className="relative size-24 overflow-hidden rounded-xl bg-slate-100">
            <Image src={current} alt="" fill sizes="96px" className="object-cover" />
          </span>
          {!disabled ? (
            <button
              type="button"
              onClick={() => setRemove(true)}
              className="text-sm font-medium text-rose-600 hover:underline"
            >
              Remove image
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        type="file"
        name={name}
        accept="image/*"
        disabled={disabled}
        className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-50"
      />
    </div>
  );
}
