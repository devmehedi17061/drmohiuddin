import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/AdminShell";
import { UsersManager, type AdminUserRow } from "@/components/admin/UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requirePermission("view", "users");
  const users = await query<AdminUserRow>(
    `SELECT id, name, email, role, is_active, last_login_at
       FROM users ORDER BY role ASC, name ASC`,
  );

  return (
    <>
      <PageHeader
        title="User Management"
        description="Control who can access the admin panel. Editors can only edit content — they cannot view users, settings or the log."
      />
      <UsersManager users={users} currentUserId={user.id} />
    </>
  );
}
