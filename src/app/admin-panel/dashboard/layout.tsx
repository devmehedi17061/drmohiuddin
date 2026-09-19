import { requireUser } from "@/lib/auth/session";
import { navFor } from "@/lib/admin/nav";
import { getSettings } from "@/lib/data/content";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Re-validates the session against MySQL on every dashboard request; the
  // middleware check in front of this only verified the cookie signature.
  const user = await requireUser();
  const settings = await getSettings();

  return (
    <AdminShell
      nav={navFor(user.role)}
      user={{ name: user.name, email: user.email, role: user.role }}
      siteName={settings.site_name}
      logo={settings.site_logo}
    >
      {children}
    </AdminShell>
  );
}
