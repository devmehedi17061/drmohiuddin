import { query } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import type { VideoItem } from "@/lib/types";
import { PageHeader } from "@/components/admin/AdminShell";
import { VideoManager } from "@/components/admin/VideoManager";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const user = await requirePermission("view", "videos");
  const videos = await query<VideoItem>(
    `SELECT id, kind, youtube_key, title, source_url, thumb_url, sort_order, is_active
     FROM videos ORDER BY sort_order ASC, id DESC`,
  );

  return (
    <>
      <PageHeader
        title="Video Gallery"
        description="YouTube videos and playlists. Adding a playlist embeds it as a full playlist player on the site."
      />
      <VideoManager
        videos={videos}
        permissions={{
          create: can(user.role, "create", "videos"),
          update: can(user.role, "update", "videos"),
          delete: can(user.role, "delete", "videos"),
        }}
      />
    </>
  );
}
