"use server";

import { revalidatePath } from "next/cache";
import { execute, query, queryOne } from "@/lib/db";
import { audit, authorize } from "@/lib/auth/session";
import { fetchOEmbed, parseYouTube, thumbnailUrl, type VideoKind } from "@/lib/youtube";
import type { FormState } from "../state";

function authFail(err: unknown): FormState {
  const code = err instanceof Error ? err.message : "";
  return {
    ok: false,
    message:
      code === "FORBIDDEN"
        ? "You don't have permission to change videos."
        : "Your session has expired. Please log in again.",
  };
}

/**
 * Accepts a video URL, a playlist URL or a bare id. The title and (for playlists)
 * the thumbnail are fetched from YouTube's oEmbed endpoint - no API key required.
 */
export async function addVideo(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await authorize("create", "videos");
  } catch (err) {
    return authFail(err);
  }

  const input = String(formData.get("url") ?? "").trim();
  const preferRaw = String(formData.get("kind") ?? "auto");
  const prefer: VideoKind | "auto" =
    preferRaw === "video" || preferRaw === "playlist" ? preferRaw : "auto";

  if (!input) return { ok: false, message: "Please enter a YouTube link." };

  const parsed = parseYouTube(input, prefer);
  if (!parsed) {
    return {
      ok: false,
      message: "The link wasn't recognized. Paste the full YouTube video or playlist link.",
    };
  }

  const duplicate = await queryOne<{ id: number }>(
    "SELECT id FROM videos WHERE kind = ? AND youtube_key = ? LIMIT 1",
    [parsed.kind, parsed.key],
  );
  if (duplicate) {
    return { ok: false, message: "This link has already been added." };
  }

  const manualTitle = String(formData.get("title") ?? "").trim().slice(0, 255);
  const meta = await fetchOEmbed(parsed.kind, parsed.key);

  const title = manualTitle || meta.title;
  const thumb =
    parsed.kind === "video" ? thumbnailUrl(parsed.key, "hq") : meta.thumbnail;

  const next = await queryOne<{ n: number }>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM videos",
  );

  const result = await execute(
    `INSERT INTO videos (kind, youtube_key, title, source_url, thumb_url, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [parsed.kind, parsed.key, title, parsed.url, thumb, Number(next?.n ?? 1)],
  );

  await audit(user, "create", "videos", result.insertId, `${parsed.kind}:${parsed.key}`);
  revalidateVideos();

  return {
    ok: true,
    message:
      parsed.kind === "playlist"
        ? "Playlist added. It will appear on the site as a playlist player."
        : "Video added.",
  };
}

export async function updateVideoTitle(id: number, title: string): Promise<FormState> {
  let user;
  try {
    user = await authorize("update", "videos");
  } catch (err) {
    return authFail(err);
  }
  if (!Number.isInteger(id) || id < 1) return { ok: false, message: "Invalid ID." };

  await execute("UPDATE videos SET title = ? WHERE id = ?", [title.trim().slice(0, 255) || null, id]);
  await audit(user, "update", "videos", id);
  revalidateVideos();
  return { ok: true, message: "Title saved." };
}

export async function deleteVideo(id: number): Promise<FormState> {
  let user;
  try {
    user = await authorize("delete", "videos");
  } catch (err) {
    return authFail(err);
  }
  if (!Number.isInteger(id) || id < 1) return { ok: false, message: "Invalid ID." };

  await execute("DELETE FROM videos WHERE id = ?", [id]);
  await audit(user, "delete", "videos", id);
  revalidateVideos();
  return { ok: true, message: "Deleted." };
}

export async function toggleVideo(id: number, active: boolean): Promise<FormState> {
  let user;
  try {
    user = await authorize("update", "videos");
  } catch (err) {
    return authFail(err);
  }

  await execute("UPDATE videos SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);
  await audit(user, active ? "publish" : "unpublish", "videos", id);
  revalidateVideos();
  return { ok: true, message: active ? "Now visible on the site." : "Hidden from the site." };
}

export async function moveVideo(id: number, direction: "up" | "down"): Promise<FormState> {
  let user;
  try {
    user = await authorize("update", "videos");
  } catch (err) {
    return authFail(err);
  }

  const rows = await query<{ id: number }>("SELECT id FROM videos ORDER BY sort_order ASC, id DESC");
  const index = rows.findIndex((r) => r.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= rows.length) return { ok: true, message: "" };

  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
  for (const [i, row] of reordered.entries()) {
    await execute("UPDATE videos SET sort_order = ? WHERE id = ?", [i + 1, row.id]);
  }

  await audit(user, "reorder", "videos", id);
  revalidateVideos();
  return { ok: true, message: "Order updated." };
}

function revalidateVideos() {
  revalidatePath("/");
  revalidatePath("/admin-panel/dashboard/videos");
}
