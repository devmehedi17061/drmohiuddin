import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/AdminShell";
import { Badge, EmptyState } from "@/components/admin/ui";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface AuditRow {
  id: number;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string | null;
  detail: string | null;
  ip: string;
  created_at: string;
}

const ACTION_TONES: Record<string, "green" | "amber" | "rose" | "blue" | "slate"> = {
  create: "green",
  update: "blue",
  delete: "rose",
  login: "slate",
  logout: "slate",
  publish: "green",
  unpublish: "amber",
};

export default async function AuditPage() {
  await requirePermission("view", "audit");

  const rows = await query<AuditRow>(
    `SELECT id, user_email, action, entity, entity_id, detail, ip, created_at
       FROM audit_logs ORDER BY created_at DESC, id DESC LIMIT 200`,
  );

  return (
    <>
      <PageHeader
        title="Activity Log"
        description="A record of who changed what, and when. Showing the most recent 200 entries."
      />

      {rows.length === 0 ? (
        <EmptyState>No activity has been recorded yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Section</th>
                <th className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.user_email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={ACTION_TONES[row.action] ?? "slate"}>{row.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.entity}
                    {row.entity_id ? <span className="text-slate-400"> #{row.entity_id}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{row.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
