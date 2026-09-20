import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { getSettings } from "@/lib/data/content";
import { SETTING_GROUPS } from "@/lib/admin/settings-fields";
import { PageHeader } from "@/components/admin/AdminShell";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { UploadConfigNotice } from "@/components/admin/UploadConfigNotice";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requirePermission("view", "settings");
  const settings = await getSettings();
  const readOnly = !can(user.role, "update", "settings");

  return (
    <>
      <PageHeader
        title="Site Settings"
        description="Change all of the landing page's text, images and contact details here. Each section is saved separately."
      />

      <UploadConfigNotice />

      <div className="space-y-6">
        {SETTING_GROUPS.map((group) => (
          <SettingsForm
            key={group.id}
            group={group}
            values={Object.fromEntries(group.fields.map((f) => [f.key, settings[f.key] ?? ""]))}
            readOnly={readOnly}
          />
        ))}
      </div>
    </>
  );
}
