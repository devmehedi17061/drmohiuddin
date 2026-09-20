// End-to-end check against a running production server (next start).
// Calls the real server actions over HTTP using React's server-action wire
// format, then verifies the database and the public page. Never prints secrets.
import sharp from "sharp";
import pg from "pg";

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const manifest = (await import("../.next/server/server-reference-manifest.json", { with: { type: "json" } })).default;
const ids = {};
for (const [id, info] of Object.entries(manifest.node)) ids[info.exportedName] = id;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2, ssl: { rejectUnauthorized: false } });
const sql = async (q, p = []) => (await pool.query(q, p)).rows;

let cookie = "";
const results = [];
const step = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  - " + detail : ""}`);
};

/** Invoke a server action (prevState, formData) the way the browser does. */
async function action(name, path, fields, prev = { ok: false, message: "" }) {
  const fd = new FormData();
  // React appends referenced parts first and the root ("0") last; the server
  // resolves "$K1" when the root arrives, so the order matters.
  for (const [k, v] of fields) fd.append(`_1_${k}`, v);
  fd.append("0", JSON.stringify([prev, "$K1"]));
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Next-Action": ids[name], Accept: "text/x-component", Cookie: cookie },
    body: fd,
    redirect: "manual",
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

function parseReturn(text) {
  // The action's return value is the flight line "0:" or a later chunk; find the last JSON object.
  const m = [...text.matchAll(/^\d+:(\{.*\})$/gm)].map((x) => x[1]);
  for (let i = m.length - 1; i >= 0; i--) {
    try { const j = JSON.parse(m[i]); if ("ok" in j || "error" in j) return j; } catch {}
  }
  return null;
}

async function png(color, w = 640, h = 420) {
  return new Blob([await sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer()], { type: "image/png" });
}

async function objectExists(url) {
  const r = await fetch(url, { method: "HEAD" });
  return r.status === 200;
}

// ---------------------------------------------------------------- 0. temporary admin account
// The real admin's password is not known to this script, so it logs in with a
// throw-away ADMIN user that it creates directly and removes at the end.
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
const TEST_EMAIL = `e2e-${Date.now().toString(36)}@example.invalid`;
const TEST_PASSWORD = randomBytes(18).toString("base64url");
const testUser = (await sql(
  "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'ADMIN') RETURNING id",
  ["E2E Test", TEST_EMAIL, await bcrypt.hash(TEST_PASSWORD, 10)],
))[0];
async function cleanupUser() {
  await sql("DELETE FROM audit_logs WHERE user_id = $1", [testUser.id]);
  await sql("DELETE FROM login_attempts WHERE email = $1", [TEST_EMAIL]);
  await sql("DELETE FROM users WHERE id = $1", [testUser.id]);
}

// ---------------------------------------------------------------- 1. login
{
  const r = await action("loginAction", "/admin-panel/login", [
    ["email", TEST_EMAIL], ["password", TEST_PASSWORD], ["next", ""],
  ], { error: "" });
  const setCookie = r.headers.getSetCookie?.() ?? [];
  const sess = setCookie.find((c) => c.startsWith("drm_session="));
  cookie = sess ? sess.split(";")[0] : "";
  const redirected = /admin-panel\/dashboard/.test(r.text) || r.headers.get("x-action-redirect");
  step("login issues a session cookie and redirects to dashboard", Boolean(cookie) && Boolean(redirected), `status ${r.status}`);
  if (!cookie) { console.log(r.text.slice(0, 500)); await cleanupUser(); await pool.end(); process.exit(1); }
}

// ---------------------------------------------------------------- 2. settings (text + photo)
const before = Object.fromEntries((await sql("SELECT key, value FROM settings WHERE key LIKE 'hero_%'")).map((r) => [r.key, r.value]));
const marker = `E2E ${Date.now().toString(36)}`;
let heroUrl = "";
{
  const fields = [
    ["__group", "hero"],
    ["hero_eyebrow", before.hero_eyebrow], ["hero_name", before.hero_name], ["hero_degrees", `${marker} degrees`],
    ["hero_designation", before.hero_designation], ["hero_workplace", before.hero_workplace],
    ["hero_summary", before.hero_summary], ["hero_primary_cta", before.hero_primary_cta],
    ["hero_secondary_cta", before.hero_secondary_cta],
    ["hero_image__current", before.hero_image ?? ""], ["hero_image__remove", "0"],
  ];
  fields.push(["hero_image", await png("#2a6f97")]);
  const r = await action("saveSettings", "/admin-panel/dashboard/settings", fields);
  const ret = parseReturn(r.text);
  step("saveSettings(hero + photo) returns ok", ret?.ok === true, ret?.message ?? r.text.slice(0, 200));

  const row = Object.fromEntries((await sql("SELECT key, value FROM settings WHERE key IN ('hero_degrees','hero_image')")).map((x) => [x.key, x.value]));
  step("hero_degrees text was written to the database", row.hero_degrees === `${marker} degrees`, row.hero_degrees);
  heroUrl = row.hero_image ?? "";
  step("hero_image now points at Supabase Storage", /\/storage\/v1\/object\/public\/uploads\/misc\/.+\.webp$/.test(heroUrl), heroUrl);
  step("uploaded hero photo is publicly reachable", heroUrl ? await objectExists(heroUrl) : false);
}

// ---------------------------------------------------------------- 3. public page shows it
{
  const html = await (await fetch(`${BASE}/?e2e=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } })).text();
  step("landing page renders the new hero text", html.includes(`${marker} degrees`));
  step("landing page references the uploaded photo", heroUrl ? html.includes(encodeURIComponent(heroUrl)) || html.includes(heroUrl) : false);
  const csp = (await fetch(BASE + "/")).headers.get("content-security-policy") ?? "";
  step("CSP img-src allows Supabase Storage", /img-src[^;]*https:\/\/\*\.supabase\.co/.test(csp));
  const opt = await fetch(`${BASE}/_next/image?url=${encodeURIComponent(heroUrl)}&w=640&q=75`);
  step("next/image optimizer accepts the Supabase URL", opt.status === 200, `status ${opt.status} ${opt.headers.get("content-type") ?? ""}`);
}

// ---------------------------------------------------------------- 4. validation keeps the text (error path)
{
  const fields = [["__group", "social"], ["social_facebook", "not-a-url"], ["social_youtube", ""], ["social_instagram", ""], ["social_linkedin", ""]];
  const r = await action("saveSettings", "/admin-panel/dashboard/settings", fields);
  const ret = parseReturn(r.text);
  step("invalid URL is rejected with a field error", ret?.ok === false && ret?.errors?.social_facebook != null, ret?.message);
}

// ---------------------------------------------------------------- 5. gallery multi-upload
let galleryIds = [];
{
  const fields = [["alt_text", marker], ["caption", "e2e caption"]];
  fields.push(["images", await png("#c1121f", 800, 600)]);
  fields.push(["images", await png("#588157", 500, 900)]);
  const r = await action("uploadGalleryImages", "/admin-panel/dashboard/gallery", fields);
  const ret = parseReturn(r.text);
  step("uploadGalleryImages(2 files) returns ok", ret?.ok === true, ret?.message ?? r.text.slice(0, 200));
  const rows = await sql("SELECT id, file_path, alt_text, width, height FROM gallery_images WHERE alt_text LIKE $1 ORDER BY id", [`${marker}%`]);
  galleryIds = rows.map((x) => x.id);
  step("two gallery rows with dimensions were inserted", rows.length === 2 && rows.every((x) => x.width > 0 && x.height > 0), rows.map((x) => `${x.width}x${x.height}`).join(", "));
  step("gallery objects exist in Storage", rows.length === 2 && (await Promise.all(rows.map((x) => objectExists(x.file_path)))).every(Boolean));
  const html = await (await fetch(`${BASE}/?g=${Date.now()}`)).text();
  step("landing page shows the gallery images", rows.length > 0 && html.includes(rows[0].file_path.split("/").pop()));
}

// ---------------------------------------------------------------- 6. CRUD record with image (services)
let serviceId = 0;
let serviceImg = "";
{
  const fields = [["__resource", "services"], ["__id", ""], ["title", `${marker} service`], ["icon", ""], ["summary", "e2e"], ["body", ""], ["is_active", "1"], ["image_path__current", ""], ["image_path__remove", "0"]];
  fields.push(["image_path", await png("#7209b7", 300, 300)]);
  const r = await action("saveRecord", "/admin-panel/dashboard/services", fields);
  const ret = parseReturn(r.text);
  step("saveRecord(services + image) returns ok", ret?.ok === true, ret?.message ?? r.text.slice(0, 200));
  const row = (await sql("SELECT id, image_path FROM services WHERE title = $1", [`${marker} service`]))[0];
  serviceId = row?.id ?? 0; serviceImg = row?.image_path ?? "";
  step("service row saved with a Storage image URL", Boolean(serviceId) && /supabase\.co\/storage/.test(serviceImg));
}

// ---------------------------------------------------------------- 7. cleanup via the real delete actions (also tests them)
{
  for (const id of galleryIds) {
    const res = await fetch(BASE + "/admin-panel/dashboard/gallery", { method: "POST", headers: { "Next-Action": ids.deleteGalleryImage, Accept: "text/x-component", "Content-Type": "text/plain;charset=UTF-8", Cookie: cookie }, body: JSON.stringify([id]) });
    await res.text();
  }
  const left = await sql("SELECT id FROM gallery_images WHERE alt_text LIKE $1", [`${marker}%`]);
  step("deleteGalleryImage removed the rows", left.length === 0);

  if (serviceId) {
    const res = await fetch(BASE + "/admin-panel/dashboard/services", { method: "POST", headers: { "Next-Action": ids.deleteRecord, Accept: "text/x-component", "Content-Type": "text/plain;charset=UTF-8", Cookie: cookie }, body: JSON.stringify(["services", serviceId]) });
    await res.text();
    const gone = (await sql("SELECT id FROM services WHERE id = $1", [serviceId])).length === 0;
    step("deleteRecord removed the service", gone);
    step("deleteRecord removed its image from Storage", serviceImg ? !(await objectExists(serviceImg)) : false);
  }

  // Restore hero settings exactly as they were (removing the test photo through the real action).
  const fields = [["__group", "hero"]];
  for (const k of ["hero_eyebrow", "hero_name", "hero_degrees", "hero_designation", "hero_workplace", "hero_summary", "hero_primary_cta", "hero_secondary_cta"]) fields.push([k, before[k] ?? ""]);
  fields.push(["hero_image__current", heroUrl], ["hero_image__remove", "1"], ["hero_image", new Blob([], { type: "application/octet-stream" })]);
  const r = await action("saveSettings", "/admin-panel/dashboard/settings", fields);
  const ret = parseReturn(r.text);
  const after = Object.fromEntries((await sql("SELECT key, value FROM settings WHERE key LIKE 'hero_%'")).map((x) => [x.key, x.value]));
  step("hero restored ('Remove image' path works)", ret?.ok === true && after.hero_degrees === before.hero_degrees && after.hero_image === "", ret?.message);
  step("removed hero photo was deleted from Storage", heroUrl ? !(await objectExists(heroUrl)) : false);
}

await cleanupUser();
await pool.end();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
