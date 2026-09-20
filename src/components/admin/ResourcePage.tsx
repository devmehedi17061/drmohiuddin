import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { getResource, type ResourceKey } from "@/lib/admin/resources";
import { PageHeader } from "./AdminShell";
import { ResourceManager, type RecordRow } from "./ResourceManager";
import { UploadConfigNotice } from "./UploadConfigNotice";

/**
 * Renders one config-driven CRUD section. Columns are derived from the resource
 * definition, so the query never selects anything the UI does not declare.
 */
export async function ResourcePage({ resource }: { resource: ResourceKey }) {
  const config = getResource(resource);
  const user = await requirePermission("view", config.permission);

  const columns = Array.from(
    new Set([
      "id",
      "is_active",
      "sort_order",
      ...config.fields.map((f) => f.name),
      ...config.listColumns.map((c) => c.name),
    ]),
  );

  const rows = await query<RecordRow>(
    `SELECT ${columns.map((c) => `\`${c}\``).join(", ")}
     FROM \`${config.table}\`
     ORDER BY sort_order ASC, id ASC`,
  );

  return (
    <>
      <PageHeader title={config.label} description={config.description} />
      {config.fields.some((f) => f.type === "image") ? <UploadConfigNotice /> : null}
      <ResourceManager
        config={config}
        rows={rows}
        permissions={{
          create: can(user.role, "create", config.permission),
          update: can(user.role, "update", config.permission),
          delete: can(user.role, "delete", config.permission),
        }}
      />
    </>
  );
}
