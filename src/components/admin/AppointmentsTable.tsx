"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Mail, MapPin, Phone, Trash2 } from "lucide-react";
import { deleteAppointment, setAppointmentStatus } from "@/lib/actions/admin/appointments";
import { STATUS_LABELS, type FormState } from "@/lib/actions/state";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { Alert, Badge, btnIcon, EmptyState, inputClass } from "./ui";
import { cn, formatDate, telHref } from "@/lib/format";

const TONES: Record<AppointmentStatus, "blue" | "amber" | "green" | "rose"> = {
  new: "blue",
  contacted: "amber",
  confirmed: "green",
  cancelled: "rose",
};

export function AppointmentsTable({
  appointments,
  canDelete,
  canUpdate,
}: {
  appointments: Appointment[];
  canDelete: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<FormState | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function run(fn: () => Promise<FormState>, id: number) {
    setBusyId(id);
    const result = await fn();
    setBusyId(null);
    if (result.message) setNotice(result);
    if (result.ok) router.refresh();
  }

  if (!appointments.length) {
    return <EmptyState>No appointment requests yet.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      {notice?.message ? <Alert ok={notice.ok}>{notice.message}</Alert> : null}

      <ul className="space-y-3">
        {appointments.map((item) => {
          const busy = busyId === item.id;

          return (
            <li
              key={item.id}
              className={cn(
                "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-opacity sm:p-5",
                busy && "pointer-events-none opacity-50",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <Badge tone={TONES[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600">
                    <a
                      href={telHref(item.phone)}
                      className="inline-flex items-center gap-1.5 hover:text-brand-700"
                    >
                      <Phone className="size-3.5" aria-hidden="true" />
                      {item.phone}
                    </a>

                    {item.email ? (
                      <a
                        href={`mailto:${item.email}`}
                        className="inline-flex items-center gap-1.5 hover:text-brand-700"
                      >
                        <Mail className="size-3.5" aria-hidden="true" />
                        {item.email}
                      </a>
                    ) : null}

                    {item.chamber_name ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {item.chamber_name}
                      </span>
                    ) : null}

                    {item.preferred_date ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="size-3.5" aria-hidden="true" />
                        {formatDate(item.preferred_date)}
                      </span>
                    ) : null}
                  </div>

                  {item.message ? (
                    <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                      {item.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {canUpdate ? (
                    <select
                      value={item.status}
                      onChange={(e) => run(() => setAppointmentStatus(item.id, e.target.value), item.id)}
                      className={`${inputClass} w-auto py-2 text-sm`}
                      aria-label="Change status"
                    >
                      {(Object.keys(STATUS_LABELS) as AppointmentStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {canDelete ? (
                    <button
                      type="button"
                      className={cn(
                        btnIcon,
                        "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600",
                      )}
                      aria-label="Delete"
                      title="Delete"
                      onClick={() => {
                        if (confirm("This request will be permanently deleted. Are you sure?")) {
                          run(() => deleteAppointment(item.id), item.id);
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>

              <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-400">
                {formatDate(item.created_at)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
