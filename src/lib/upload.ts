import "server-only";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp, { type Metadata, type OutputInfo, type Sharp } from "sharp";

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

/** Short, user-safe description of an unknown thrown value (no stack, no secrets). */
function describe(err: unknown): string {
  if (err instanceof Error) {
    // Node wraps fetch failures: the useful part is on `cause`.
    const cause = err.cause instanceof Error ? ` (${err.cause.message})` : "";
    return `${err.message}${cause}`;
  }
  return String(err);
}

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
    const missing = [!url && "NEXT_PUBLIC_SUPABASE_URL", !key && "SUPABASE_SERVICE_ROLE_KEY"]
      .filter(Boolean)
      .join(" and ");
    throw new UploadError(
      `File uploads are not configured: ${missing} must be set in the server environment ` +
        "(on Vercel: Project → Settings → Environment Variables, then redeploy).",
    );
  }
  try {
    cachedClient = createClient(url, key, { auth: { persistSession: false } });
  } catch (err) {
    // createClient() throws on a malformed URL ("Invalid URL").
    throw new UploadError(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: ${describe(err)}`);
  }
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

  let output: { data: Buffer; info: OutputInfo };
  try {
    output = await image
      .rotate() // honour EXIF orientation before stripping metadata
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch (err) {
    // A failure here is an environment problem (e.g. the sharp native binary
    // for this platform is missing from the deployment), not a bad file.
    console.error("[upload] image processing failed", err);
    throw new UploadError(`Image processing failed: ${describe(err)}`);
  }

  // Resolve the client before the network call so a misconfiguration surfaces
  // with its own message rather than as a generic failure.
  const client = storageClient();

  let error: { message: string } | null;
  try {
    ({ error } = await client.storage
      .from(BUCKET)
      .upload(objectPath, output.data, { contentType: "image/webp", upsert: false }));
  } catch (err) {
    // supabase-js normally *returns* errors, but a thrown one (bad URL, DNS,
    // TLS) would otherwise be reported as "Image upload failed." with no clue.
    console.error("[upload] storage request threw", err);
    throw new UploadError(`Could not reach Supabase Storage: ${describe(err)}`);
  }
  if (error) {
    console.error("[upload] storage rejected the object", error);
    throw new UploadError(
      `Upload failed: ${error.message}` +
        (/not found/i.test(error.message)
          ? ` (create a public bucket named "${BUCKET}" in Supabase → Storage)`
          : ""),
    );
  }

  const {
    data: { publicUrl },
  } = client.storage.from(BUCKET).getPublicUrl(objectPath);

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
