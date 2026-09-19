"use server";

import { revalidatePath } from "next/cache";
import { execute, query, queryOne } from "@/lib/db";
import { audit, authorize } from "@/lib/auth/session";
import { removeUpload, storeImage, UploadError } from "@/lib/upload";
import type { FormState } from "../state";

const MAX_PER_UPLOAD = 20;

function authFail(err: unknown): FormState {
  const code = err instanceof Error ? err.message : "";
  return {
    ok: false,
    message:
      code === "FORBIDDEN"
        ? "You don't have permission to change the gallery."
        : "Your session has expired. Please log in again.",
  };
}

/** Uploads one or many images at once; alt text gets a serial suffix per file. */
export async function uploadGalleryImages(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let user;
  try {
    user = await authorize("create", "gallery");
  } catch (err) {
    return authFail(err);
  }

  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { ok: false, message: "Please select at least one image." };
  if (files.length > MAX_PER_UPLOAD) {
    return { ok: false, message: `You can upload at most ${MAX_PER_UPLOAD} images at a time.` };
  }

  const altBase = String(formData.get("alt_text") ?? "").trim().slice(0, 200);
  const caption = String(formData.get("caption") ?? "").trim().slice(0, 255);

  const next = await queryOne<{ n: number }>(
    "SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM gallery_images",
  );
  let order = Number(next?.n ?? 1);

  let saved = 0;
  const failures: string[] = [];

  for (const [i, file] of files.entries()) {
    try {
      const stored = await storeImage(file, "gallery");
      const alt = altBase ? (files.length > 1 ? `${altBase} ${i + 1}` : altBase) : "";
      await execute(
        `INSERT INTO gallery_images (file_path, alt_text, caption, width, height, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [stored.filePath, alt, caption || null, stored.width, stored.height, order++],
      );
      saved++;
    } catch (err) {
      failures.push(err instanceof UploadError ? err.message : `"${file.name}" failed to upload.`);
    }
  }

  if (saved) {
    await audit(user, "create", "gallery", null, `${saved} images`);
    revalidateGallery();
  }

  if (!saved) return { ok: false, message: failures[0] ?? "No images were uploaded." };

  return {
    ok: true,
    message: failures.length
      ? `${saved} image(s) added, ${failures.length} failed.`
      : `${saved} image(s) added.`,
  };
}

export async function updateGalleryImage(
  id: number,
  alt: string,
  caption: string,
): Promise<FormState> {
  let user;
  try {
    user = await authorize("update", "gallery");
  } catch (err) {
    return authFail(err);
  }
  if (!Number.isInteger(id) || id < 1) return { ok: false, message: "Invalid ID." };

  await execute("UPDATE gallery_images SET alt_text = ?, caption = ? WHERE id = ?", [
    alt.trim().slice(0, 255),
    caption.trim().slice(0, 255) || null,
    id,
  ]);

  await audit(user, "update", "gallery", id);
  revalidateGallery();
  return { ok: true, message: "Saved." };
}

export async function deleteGalleryImage(id: number): Promise<FormState> {
  let user;
  try {
    user = await authorize("delete", "gallery");
  } catch (err) {
    return authFail(err);
  }
  if (!Number.isInteger(id) || id < 1) return { ok: false, message: "Invalid ID." };

  const row = await queryOne<{ file_path: string }>(
    "SELECT file_path FROM gallery_images WHERE id = ?",
    [id],
  );
  if (!row) return { ok: false, message: "Image not found." };

  await execute("DELETE FROM gallery_images WHERE id = ?", [id]);
  await removeUpload(row.file_path);
  await audit(user, "delete", "gallery", id);
  revalidateGallery();

  return { ok: true, message: "Image deleted." };
}

export async function toggleGalleryImage(id: number, active: boolean): Promise<FormState> {
  let user;
  try {
    user = await authorize("update", "gallery");
  } catch (err) {
    return authFail(err);
  }

  await execute("UPDATE gallery_images SET is_active = ? WHERE id = ?", [active ? 1 : 0, id]);
  await audit(user, active ? "publish" : "unpublish", "gallery", id);
  revalidateGallery();
  return { ok: true, message: active ? "Now visible on the site." : "Hidden from the site." };
}

export async function moveGalleryImage(id: number, direction: "up" | "down"): Promise<FormState> {
  let user;
  try {
    user = await authorize("update", "gallery");
  } catch (err) {
    return authFail(err);
  }

  const rows = await query<{ id: number }>(
    "SELECT id FROM gallery_images ORDER BY sort_order ASC, id DESC",
  );
  const index = rows.findIndex((r) => r.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= rows.length) return { ok: true, message: "" };

  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
  for (const [i, row] of reordered.entries()) {
    await execute("UPDATE gallery_images SET sort_order = ? WHERE id = ?", [i + 1, row.id]);
  }

  await audit(user, "reorder", "gallery", id);
  revalidateGallery();
  return { ok: true, message: "Order updated." };
}

function revalidateGallery() {
  revalidatePath("/");
  revalidatePath("/admin-panel/dashboard/gallery");
}
