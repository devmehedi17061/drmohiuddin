"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteRecord,
  moveRecord,
  saveRecord,
  toggleActive,
} from "@/lib/actions/admin/crud";
import { EMPTY_STATE, type FormState } from "@/lib/actions/state";
import { BADGE_LABELS, type FieldDef, type ResourceConfig } from "@/lib/admin/resources";
import { ICON_NAMES } from "@/components/ui/Icon";
import { Alert, Badge, btnGhost, btnIcon, btnPrimary, EmptyState, inputClass, labelClass } from "./ui";
import { cn } from "@/lib/format";

export type RecordRow = Record<string, string | number | null>;

export interface Permissions {
  create: boolean;
  update: boolean;
  delete: boolean;
}

function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      <Save className="size-4" aria-hidden="true" />
      {pending ? "Saving…" : isEdit ? "Save Changes" : "Add"}
    </button>
  );
}

export function ResourceManager({
  config,
  rows,
  permissions,
}: {
  config: ResourceConfig;
  rows: RecordRow[];
  permissions: Permissions;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<RecordRow | "new" | null>(null);
  const [notice, setNotice] = useState<FormState | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const formTop = useRef<HTMLDivElement>(null);

  // Closing the editor and refreshing happens here, inside the action, so the
  // component never has to react to `state` from an effect.
  const [state, formAction] = useActionState(async (prev: FormState, fd: FormData) => {
    const result = await saveRecord(prev, fd);
    if (result.ok) {
      setEditing(null);
      setNotice(result);
      router.refresh();
    }
    return result;
  }, EMPTY_STATE);

  useEffect(() => {
    if (editing) formTop.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editing]);

  async function run(fn: () => Promise<FormState>, id: number) {
    setBusyId(id);
    const result = await fn();
    setBusyId(null);
    if (result.message) setNotice(result);
    if (result.ok) router.refresh();
  }

  const record = editing === "new" || editing === null ? null : editing;
  const isEdit = !!record;

  return (
    <div className="space-y-5">
      <div ref={formTop} />

      {notice?.message && !editing ? <Alert ok={notice.ok}>{notice.message}</Alert> : null}

      {permissions.create && !editing ? (
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          <Plus className="size-4" aria-hidden="true" />
          Add New {config.singular}
        </button>
      ) : null}

      {editing ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              {isEdit ? `Edit ${config.singular}` : `New ${config.singular}`}
            </h2>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className={btnIcon}
              aria-label="Close"
              title="Close"
            >
              <X className="size-4" />
            </button>
          </header>

          <form action={formAction} className="space-y-5 px-5 py-5">
            <input type="hidden" name="__resource" value={config.key} />
            <input type="hidden" name="__id" value={record ? String(record.id) : ""} />

            {state.message && !state.ok ? <Alert ok={false}>{state.message}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              {config.fields.map((field) => (
                <FieldInput
                  key={field.name}
                  field={field}
                  value={record?.[field.name] ?? null}
                  error={state.errors?.[field.name]}
                />
              ))}
            </div>

            <label className="flex w-fit items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_active"
                value="1"
                defaultChecked={record ? record.is_active === 1 : true}
                className="size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              />
              Show on the site
            </label>

            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
              <SaveButton isEdit={isEdit} />
              <button type="button" onClick={() => setEditing(null)} className={btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState>{config.emptyHint}</EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row, index) => {
            const id = Number(row.id);
            const active = row.is_active === 1;
            const busy = busyId === id;

            return (
              <li
                key={id}
                className={cn(
                  "flex flex-wrap items-center gap-4 rounded-2xl border bg-white px-4 py-3.5 shadow-sm transition-opacity sm:px-5",
                  active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70",
                  busy && "pointer-events-none opacity-50",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  {config.listColumns
                    .filter((c) => c.type === "image")
                    .map((column) => {
                      const src = row[column.name];
                      return (
                        <span
                          key={column.name}
                          className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-slate-100"
                        >
                          {typeof src === "string" && src ? (
                            <Image
                              src={src}
                              alt=""
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          ) : null}
                        </span>
                      );
                    })}

                  <div className="min-w-0">
                    {config.listColumns
                      .filter((c) => c.type !== "image")
                      .map((column, i) => {
                        const value = row[column.name];
                        if (value === null || value === "") return null;
                        const text = String(value);

                        if (column.type === "badge") {
                          return (
                            <span key={column.name} className="mr-2 inline-block align-middle">
                              <Badge tone="blue">{BADGE_LABELS[text] ?? text}</Badge>
                            </span>
                          );
                        }

                        return (
                          <p
                            key={column.name}
                            className={cn(
                              i === 0 || column.type !== "muted"
                                ? "font-medium text-slate-900"
                                : "mt-0.5 line-clamp-1 text-sm text-slate-500",
                            )}
                          >
                            {text}
                          </p>
                        );
                      })}

                    {!active ? (
                      <span className="mt-1.5 inline-block">
                        <Badge tone="amber">Hidden</Badge>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {permissions.update ? (
                    <>
                      <button
                        type="button"
                        className={btnIcon}
                        disabled={index === 0}
                        onClick={() => run(() => moveRecord(config.key, id, "up"), id)}
                        aria-label="Move up"
                        title="Move up (reorder)"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        className={btnIcon}
                        disabled={index === rows.length - 1}
                        onClick={() => run(() => moveRecord(config.key, id, "down"), id)}
                        aria-label="Move down"
                        title="Move down (reorder)"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                      <button
                        type="button"
                        className={btnIcon}
                        onClick={() => run(() => toggleActive(config.key, id, !active), id)}
                        aria-label={active ? "Hide from the site" : "Show on the site"}
                        title={active ? "Hide from the site" : "Show on the site"}
                      >
                        {active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </button>
                      <button
                        type="button"
                        className={btnIcon}
                        onClick={() => setEditing(row)}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </button>
                    </>
                  ) : null}

                  {permissions.delete ? (
                    <button
                      type="button"
                      className={cn(btnIcon, "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600")}
                      aria-label="Delete"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`This ${config.singular} will be permanently deleted. Are you sure?`)) {
                          run(() => deleteRecord(config.key, id), id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ fields

function FieldInput({
  field,
  value,
  error,
}: {
  field: FieldDef;
  value: string | number | null;
  error?: string;
}) {
  const id = `f-${field.name}`;
  const current = value === null ? "" : String(value);
  const wide = !field.half;

  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className={labelClass}>
        {field.label}
        {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
      </label>

      {field.type === "textarea" ? (
        <textarea
          id={id}
          name={field.name}
          rows={field.rows ?? 3}
          maxLength={field.max}
          defaultValue={current}
          placeholder={field.placeholder}
          className={`${inputClass} resize-y`}
        />
      ) : field.type === "select" ? (
        <select id={id} name={field.name} defaultValue={current} className={inputClass}>
          {!field.required ? <option value="">— Select —</option> : null}
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "rating" ? (
        <select id={id} name={field.name} defaultValue={current || "5"} className={inputClass}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
              {"☆".repeat(5 - n)}
            </option>
          ))}
        </select>
      ) : field.type === "icon" ? (
        <select id={id} name={field.name} defaultValue={current} className={inputClass}>
          <option value="">— No icon —</option>
          {ICON_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : field.type === "image" ? (
        <ImageField name={field.name} current={current} />
      ) : (
        <input
          id={id}
          name={field.name}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          maxLength={field.max}
          defaultValue={current}
          placeholder={field.placeholder}
          className={inputClass}
        />
      )}

      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      {field.help && !error ? <p className="mt-1 text-xs text-slate-500">{field.help}</p> : null}
    </div>
  );
}

function ImageField({ name, current }: { name: string; current: string }) {
  const [remove, setRemove] = useState(false);

  return (
    <div className="space-y-2.5">
      <input type="hidden" name={`${name}__current`} value={current} />
      <input type="hidden" name={`${name}__remove`} value={remove ? "1" : "0"} />

      {current && !remove ? (
        <div className="flex items-center gap-3">
          <span className="relative size-16 overflow-hidden rounded-xl bg-slate-100">
            <Image src={current} alt="" fill sizes="64px" className="object-cover" />
          </span>
          <button
            type="button"
            onClick={() => setRemove(true)}
            className="text-sm font-medium text-rose-600 hover:underline"
          >
            Remove image
          </button>
        </div>
      ) : null}

      <input
        type="file"
        name={name}
        accept="image/*"
        className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
      />
    </div>
  );
}
