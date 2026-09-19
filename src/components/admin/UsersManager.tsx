"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { LogOut, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { deleteUser, forceLogout, saveUser } from "@/lib/actions/admin/users";
import { USER_INITIAL, type FormState } from "@/lib/actions/state";
import { Alert, Badge, btnGhost, btnIcon, btnPrimary, inputClass, labelClass } from "./ui";
import { cn, formatDate } from "@/lib/format";

export interface AdminUserRow {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "EDITOR";
  is_active: number;
  last_login_at: string | null;
}

function SaveButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btnPrimary}>
      <Save className="size-4" aria-hidden="true" />
      {pending ? "Saving…" : isEdit ? "Save Changes" : "Create User"}
    </button>
  );
}

export function UsersManager({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminUserRow | "new" | null>(null);
  const [notice, setNotice] = useState<FormState | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [state, formAction] = useActionState(async (prev: FormState, fd: FormData) => {
    const result = await saveUser(prev, fd);
    if (result.ok) {
      setEditing(null);
      setNotice(result);
      router.refresh();
    }
    return result;
  }, USER_INITIAL);

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
      {notice?.message && !editing ? <Alert ok={notice.ok}>{notice.message}</Alert> : null}

      {!editing ? (
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          <Plus className="size-4" aria-hidden="true" />
          Add New User
        </button>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              {isEdit ? "Edit User" : "New User"}
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
            <input type="hidden" name="id" value={record ? String(record.id) : ""} />

            {state.message && !state.ok ? <Alert ok={false}>{state.message}</Alert> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="u-name" className={labelClass}>
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="u-name"
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={record?.name ?? ""}
                  className={inputClass}
                />
                {state.errors?.name ? (
                  <p className="mt-1 text-xs text-rose-600">{state.errors.name}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="u-email" className={labelClass}>
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  id="u-email"
                  name="email"
                  type="email"
                  required
                  maxLength={190}
                  defaultValue={record?.email ?? ""}
                  className={inputClass}
                />
                {state.errors?.email ? (
                  <p className="mt-1 text-xs text-rose-600">{state.errors.email}</p>
                ) : null}
              </div>

              <div>
                <label htmlFor="u-role" className={labelClass}>
                  Role
                </label>
                <select
                  id="u-role"
                  name="role"
                  defaultValue={record?.role ?? "EDITOR"}
                  className={inputClass}
                >
                  <option value="EDITOR">Editor — content only</option>
                  <option value="ADMIN">Admin — everything</option>
                </select>
              </div>

              <div>
                <label htmlFor="u-password" className={labelClass}>
                  Password {isEdit ? <span className="text-slate-400">(if changing)</span> : <span className="text-rose-500">*</span>}
                </label>
                <input
                  id="u-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  required={!isEdit}
                  placeholder={isEdit ? "Leave blank to keep unchanged" : "At least 10 characters"}
                  className={inputClass}
                />
                {state.errors?.password ? (
                  <p className="mt-1 text-xs text-rose-600">{state.errors.password}</p>
                ) : null}
              </div>
            </div>

            <label className="flex w-fit items-center gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_active"
                value="1"
                defaultChecked={record ? record.is_active === 1 : true}
                className="size-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              />
              Account is active
            </label>

            <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
              <SaveButton isEdit={isEdit} />
              <button type="button" onClick={() => setEditing(null)} className={btnGhost}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <ul className="space-y-2.5">
        {users.map((user) => {
          const busy = busyId === user.id;
          const isSelf = user.id === currentUserId;

          return (
            <li
              key={user.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white px-4 py-4 shadow-sm transition-opacity sm:px-5",
                user.is_active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70",
                busy && "pointer-events-none opacity-50",
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  <Badge tone={user.role === "ADMIN" ? "green" : "slate"}>
                    {user.role === "ADMIN" ? "Admin" : "Editor"}
                  </Badge>
                  {isSelf ? <Badge tone="blue">You</Badge> : null}
                  {!user.is_active ? <Badge tone="amber">Inactive</Badge> : null}
                </div>
                <p className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Last login:{" "}
                  {user.last_login_at ? formatDate(user.last_login_at) : "Never logged in"}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className={btnIcon}
                  onClick={() => setEditing(user)}
                  aria-label="Edit"
                  title="Edit"
                >
                  <Pencil className="size-4" />
                </button>

                <button
                  type="button"
                  className={btnIcon}
                  aria-label="Revoke all sessions"
                  title="Sign out of all devices"
                  onClick={() => {
                    if (confirm(`All sessions for ${user.name} will be revoked. Are you sure?`)) {
                      run(() => forceLogout(user.id), user.id);
                    }
                  }}
                >
                  <LogOut className="size-4" />
                </button>

                <button
                  type="button"
                  disabled={isSelf}
                  className={cn(
                    btnIcon,
                    "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600",
                  )}
                  aria-label="Delete"
                  title={isSelf ? "You cannot delete your own account" : "Delete"}
                  onClick={() => {
                    if (confirm(`${user.name} will be permanently deleted. Are you sure?`)) {
                      run(() => deleteUser(user.id), user.id);
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
