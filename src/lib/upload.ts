import "server-only";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp, { type Metadata, type Sharp } from "sharp";

const BUCKET = "uploads";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file
const ALLOWED = new Set(["jpeg", "jpg", "png", "webp", "gif", "avif", "tiff"]);

export interface StoredImage {
  /** Public URL, e.g. https://<ref>.supabase.co/storage/v1/object/public/uploads/gallery/ab12cd.webp */
  filePath: string;
  width: number;
  height: number;
}

export class UploadError extends Error {}

let cachedClient: ReturnType<typeof createClient> | null = null;

/**
 * A server-only Supabase client authenticated as the service role, so it
 * bypasses the (deliberately policy-less) Storage RLS on this bucket. Vercel's
 * serverless functions have a read-only filesystem, so uploads can't be
 * written to disk the way a traditional server could - they go to Supabase
 * Storage instead, which every deployment (and every instance of one) can
 * reach the same way.
 */
function storageClient() {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new UploadError(
      "File uploads are not configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }
  cachedClient = createClient(url, key, { auth: { persistSession: false } });
  return cachedClient;
}

/**
 * Validates, re-encodes and stores an uploaded image in Supabase Storage.
 *
 * The file is decoded with sharp and written back out as WebP, so whatever the
 * browser sent (including anything with a spoofed extension or embedded script
 * payload) never reaches storage in its original form. Object names are
 * random, so a caller cannot influence the path.
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
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}.webp`;
  const objectPath = `${safeFolder}/${name}`;

  const output = await image
    .rotate() // honour EXIF orientation before stripping metadata
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const { error } = await storageClient()
    .storage.from(BUCKET)
    .upload(objectPath, output.data, { contentType: "image/webp", upsert: false });
  if (error) throw new UploadError(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = storageClient().storage.from(BUCKET).getPublicUrl(objectPath);

  return {
    filePath: publicUrl,
    width: output.info.width,
    height: output.info.height,
  };
}

/**
 * Deletes a previously stored upload. Refuses anything outside this project's
 * own `uploads` bucket so a tampered database row cannot be used to delete
 * arbitrary storage objects.
 */
export async function removeUpload(filePath: string | null | undefined): Promise<void> {
  if (!filePath) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = filePath.indexOf(marker);
  if (idx === -1) return;
  const objectPath = filePath.slice(idx + marker.length);
  if (!objectPath) return;
  try {
    await storageClient().storage.from(BUCKET).remove([objectPath]);
  } catch {
    // Already gone - nothing to do.
  }
}
