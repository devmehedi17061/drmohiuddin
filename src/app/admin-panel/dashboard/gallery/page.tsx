import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import type { GalleryImage } from "@/lib/types";
import { PageHeader } from "@/components/admin/AdminShell";
import { GalleryManager } from "@/components/admin/GalleryManager";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const user = await requirePermission("view", "gallery");
  const images = await query<GalleryImage>(
    `SELECT id, file_path, alt_text, caption, width, height, sort_order, is_active
     FROM gallery_images ORDER BY sort_order ASC, id DESC`,
  );

  return (
    <>
      <PageHeader
        title="Photo Gallery"
        description="Images for the landing page's gallery section. Reordering here also reorders them on the site."
      />
      <GalleryManager
        images={images}
        permissions={{
          create: can(user.role, "create", "gallery"),
          update: can(user.role, "update", "gallery"),
          delete: can(user.role, "delete", "gallery"),
        }}
      />
    </>
  );
}
