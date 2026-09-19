import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import type { Appointment } from "@/lib/types";
import { PageHeader } from "@/components/admin/AdminShell";
import { AppointmentsTable } from "@/components/admin/AppointmentsTable";
import { Badge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AppointmentsPage() {
  const user = await requirePermission("view", "appointments");

  const appointments = await query<Appointment>(
    `SELECT a.id, a.name, a.phone, a.email, a.chamber_id, a.preferred_date, a.message,
            a.status, a.created_at, c.name AS chamber_name
       FROM appointments a
       LEFT JOIN chambers c ON c.id = a.chamber_id
      ORDER BY a.created_at DESC
      LIMIT 300`,
  );

  const pending = appointments.filter((a) => a.status === "new").length;

  return (
    <>
      <PageHeader
        title="Appointment Requests"
        description="Patient requests submitted through the website's form. Showing the most recent 300."
        action={
          pending ? (
            <Badge tone="blue">{pending} new request{pending === 1 ? "" : "s"}</Badge>
          ) : null
        }
      />

      <AppointmentsTable
        appointments={appointments}
        canUpdate={can(user.role, "update", "appointments")}
        canDelete={can(user.role, "delete", "appointments")}
      />
    </>
  );
}
