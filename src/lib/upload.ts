import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata, type Sharp } from "sharp";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file
const ALLOWED = new Set(["jpeg", "jpg", "png", "webp", "gif", "avif", "tiff"]);

export interface StoredImage {
  /** Web path, e.g. /uploads/gallery/ab12cd.webp */
  filePath: string;
  width: number;
  height: number;
}

export class UploadError extends Error {}

/**
 * Validates, re-encodes and stores an uploaded image.
 *
 * The file is decoded with sharp and written back out as WebP, so whatever the
 * browser sent (including anything with a spoofed extension or embedded script
 * payload) never reaches disk in its original form. Filenames are random, so a
 * caller cannot influence the path.
 */
export async function storeImage(file: File, folder = "gallery"): Promise<StoredImage> {
  if (!file || file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > MAX_BYTES) {
    throw new UploadError(`Maximum file size is ${MAX_BYTES / 1024 / 1024}MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let image: Sharp;
  let meta: Metadata;
  try {
    image = sharp(buffer, { failOn: "error", animated: false });
    meta = await image.metadata();
  } catch {
    throw new UploadError("The file is not a valid image.");
  }

  if (!meta.format || !ALLOWED.has(meta.format)) {
    throw new UploadError("Only JPG, PNG, WEBP, GIF or AVIF images can be uploaded.");
  }

  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "") || "gallery";
  const dir = path.join(PUBLIC_DIR, "uploads", safeFolder);
  await mkdir(dir, { recursive: true });

  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.webp`;

  const output = await image
    .rotate() // honour EXIF orientation before stripping metadata
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  await writeFile(path.join(dir, name), output.data);

  return {
    filePath: `/uploads/${safeFolder}/${name}`,
    width: output.info.width,
    height: output.info.height,
  };
}

/**
 * Deletes a previously stored upload. Refuses anything outside public/uploads so a
 * tampered database row cannot be used to delete arbitrary files.
 */
export async function removeUpload(filePath: string | null | undefined): Promise<void> {
  if (!filePath || !filePath.startsWith("/uploads/")) return;
  const resolved = path.resolve(PUBLIC_DIR, `.${filePath}`);
  const uploadsRoot = path.join(PUBLIC_DIR, "uploads");
  if (!resolved.startsWith(uploadsRoot + path.sep)) return;
  try {
    await unlink(resolved);
  } catch {
    // Already gone - nothing to do.
  }
}
