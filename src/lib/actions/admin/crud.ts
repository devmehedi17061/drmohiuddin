"use server";

import { revalidatePath } from "next/cache";
import { execute, query, queryOne, type SqlParam } from "@/lib/db";
import { audit, authorize } from "@/lib/auth/session";
import { getResource, isResourceKey, type FieldDef, type ResourceConfig } from "@/lib/admin/resources";
import { removeUpload, storeImage, UploadError } from "@/lib/upload";
import { ICON_NAMES } from "@/components/ui/Icon";
import type { FormState } from "../state";

function fail(message: string, errors?: Record<string, string>): FormState {
  return { ok: false, message, errors };
}

/** Maps a thrown auth error onto a form-friendly message. */
function authMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : "";
  if (code === "UNAUTHENTICATED") return "Your session has expired. Please log in again.";
  if (code === "FORBIDDEN") return "You don't have permission to do this.";
  return "Could not save. Please try again.";
}

// ------------------------------------------------------------------ validation

interface Prepared {
  columns: string[];
  values: SqlParam[];
  errors: Record<string, string>;
  /** Uploads written to disk during this call; removed again if the query fails. */
  written: string[];
  /** Old image paths to delete once the write succeeds. */
  stale: string[];
}

async function prepareFields(
  config: ResourceConfig,
  formData: FormData,
  existing: Record<string, unknown> | null,
): Promise<Prepared> {
  const out: Prepared = { columns: [], values: [], errors: {}, written: [], stale: [] };

  for (const field of config.fields) {
    const result = await prepareField(field, formData, existing);
    if (result.error) {
      out.errors[field.name] = result.error;
      continue;
    }
    if (result.skip) continue;

    out.columns.push(field.name);
    out.values.push(result.value ?? null);
    if (result.written) out.written.push(result.written);
    if (result.stale) out.stale.push(result.stale);
  }

  return out;
}

interface FieldResult {
  value?: SqlParam;
  error?: string;
  skip?: boolean;
  written?: string;
  stale?: string;
}

async function prepareField(
  field: FieldDef,
  formData: FormData,
  existing: Record<string, unknown> | null,
): Promise<FieldResult> {
  if (field.type === "image") {
    const file = formData.get(field.name);
    const current = String(formData.get(`${field.name}__current`) ?? "");
    const remove = formData.get(`${field.name}__remove`) === "1";

    if (file instanceof File && file.size > 0) {
      try {
        const stored = await storeImage(file, field.folder ?? "misc");
        return { value: stored.filePath, written: stored.filePath, stale: current || undefined };
      } catch (err) {
        if (!(err instanceof UploadError)) console.error("[crud] unexpected upload error", err);
        return { error: err instanceof UploadError ? err.message : "Image upload failed." };
      }
    }

    if (remove) return { value: null, stale: current || undefined };
    // Nothing new and no removal: leave the column untouched on update.
    return existing ? { skip: true } : { value: current || null };
  }

  const raw = formData.get(field.name);
  const text = typeof raw === "string" ? raw.trim() : "";

  if (field.required && !text) return { error: `${field.label} is required.` };

  if (!text) return { value: field.type === "number" || field.type === "rating" ? null : null };

  if (field.max && text.length > field.max) {
    return { error: `${field.label} can be at most ${field.max} characters.` };
  }

  switch (field.type) {
    case "number":
    case "rating": {
      const num = Number(text);
      if (!Number.isFinite(num)) return { error: `${field.label} must be a number.` };
      if (field.type === "rating" && (num < 1 || num > 5)) {
        return { error: "Rating must be between 1 and 5." };
      }
      return { value: Math.trunc(num) };
    }

    case "select": {
      const allowed = (field.options ?? []).map((o) => o.value);
      if (!allowed.includes(text)) return { error: `${field.label} is invalid.` };
      return { value: text };
    }

    case "icon":
      return { value: (ICON_NAMES as string[]).includes(text) ? text : null };

    case "url": {
      if (!/^https?:\/\//i.test(text)) {
        return { error: "The link must start with http:// or https://." };
      }
      return { value: text };
    }

    case "date":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { error: `${field.label} is not a valid date.` };
      return { value: text };

    default:
      return { value: text };
  }
}

// ------------------------------------------------------------------ slugs

function slugify(input: string): string {
  const base = input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return base || `item-${Date.now().toString(36)}`;
}

async function uniqueSlug(table: string, base: string, excludeId?: number): Promise<string> {
  let candidate = base;
  for (let n = 2; n < 200; n++) {
    const row = await queryOne<{ id: number }>(
      `SELECT id FROM \`${table}\` WHERE slug = ? ${excludeId ? "AND id <> ?" : ""} LIMIT 1`,
      excludeId ? [candidate, excludeId] : [candidate],
    );
    if (!row) return candidate;
    candidate = `${base}-${n}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

// ------------------------------------------------------------------ actions

export async function saveRecord(_prev: FormState, formData: FormData): Promise<FormState> {
  const key = String(formData.get("__resource") ?? "");
  if (!isResourceKey(key)) return fail("Unknown section.");

  const config = getResource(key);
  const rawId = String(formData.get("__id") ?? "").trim();
  const id = rawId ? Number(rawId) : null;
  if (rawId && (!Number.isInteger(id) || id! < 1)) return fail("Invalid ID.");

  let user;
  try {
    user = await authorize(id ? "update" : "create", config.permission);
  } catch (err) {
    return fail(authMessage(err));
  }

  const existing = id
    ? await queryOne<Record<string, unknown>>(`SELECT * FROM \`${config.table}\` WHERE id = ?`, [id])
    : null;
  if (id && !existing) return fail("Record not found.");

  const prepared = await prepareFields(config, formData, existing);

  if (Object.keys(prepared.errors).length) {
    await Promise.all(prepared.written.map(removeUpload));
    return fail("There are some errors in the form.", prepared.errors);
  }

  const columns = [...prepared.columns];
  const values = [...prepared.values];

  if (config.slugFrom) {
    const source = String(formData.get(config.slugFrom) ?? "").trim();
    const slug = await uniqueSlug(config.table, slugify(source), id ?? undefined);
    columns.push("slug");
    values.push(slug);
  }

  const isActive = formData.get("is_active") === "1" ? 1 : 0;
  columns.push("is_active");
  values.push(isActive);

  try {
    let recordId = id;

    if (id) {
      const assignments = columns.map((c) => `\`${c}\` = ?`).join(", ");
      await execute(`UPDATE \`${config.table}\` SET ${assignments} WHERE id = ?`, [...values, id]);
    } else {
      const next = await queryOne<{ n: number }>(
        `SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM \`${config.table}\``,
      );
      columns.push("sort_order");
      values.push(Number(next?.n ?? 1));

      const placeholders = columns.map(() => "?").join(", ");
      const result = await execute(
        `INSERT INTO \`${config.table}\` (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES (${placeholders})`,
        values,
      );
      recordId = result.insertId;
    }

    await Promise.all(prepared.stale.map(removeUpload));
    await audit(user, id ? "update" : "create", config.permission, recordId);
    revalidateSite(key);

    return { ok: true, message: id ? "Changes saved." : `New ${config.singular} added.` };
  } catch (err) {
    console.error("[crud] save failed", err);
    await Promise.all(prepared.written.map(removeUpload));
    return fail("Could not save to the database.");
  }
}

export async function deleteRecord(key: string, id: number): Promise<FormState> {
  if (!isResourceKey(key)) return fail("Unknown section.");
  const config = getResource(key);

  let user;
  try {
    user = await authorize("delete", config.permission);
  } catch (err) {
    return fail(authMessage(err));
  }

  if (!Number.isInteger(id) || id < 1) return fail("Invalid ID.");

  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM \`${config.table}\` WHERE id = ?`,
    [id],
  );
  if (!row) return fail("Record not found.");

  await execute(`DELETE FROM \`${config.table}\` WHERE id = ?`, [id]);

  // Clean up any images the row owned.
  for (const field of config.fields) {
    if (field.type === "image") await removeUpload(row[field.name] as string | null);
  }

  await audit(user, "delete", config.permission, id);
  revalidateSite(key);
  return { ok: true, message: "Deleted." };
}

export async function toggleActive(key: string, id: number, active: boolean): Promise<FormState> {
  if (!isResourceKey(key)) return fail("Unknown section.");
  const config = getResource(key);

  let user;
  try {
    user = await authorize("update", config.permission);
  } catch (err) {
    return fail(authMessage(err));
  }

  if (!Number.isInteger(id) || id < 1) return fail("Invalid ID.");

  await execute(`UPDATE \`${config.table}\` SET is_active = ? WHERE id = ?`, [active ? 1 : 0, id]);
  await audit(user, active ? "publish" : "unpublish", config.permission, id);
  revalidateSite(key);
  return { ok: true, message: active ? "Now visible on the site." : "Hidden from the site." };
}

/** Swaps sort_order with the neighbouring row so admins can reorder without drag-and-drop. */
export async function moveRecord(key: string, id: number, direction: "up" | "down"): Promise<FormState> {
  if (!isResourceKey(key)) return fail("Unknown section.");
  const config = getResource(key);

  let user;
  try {
    user = await authorize("update", config.permission);
  } catch (err) {
    return fail(authMessage(err));
  }

  const rows = await query<{ id: number }>(
    `SELECT id FROM \`${config.table}\` ORDER BY sort_order ASC, id ASC`,
  );
  const index = rows.findIndex((r) => r.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= rows.length) {
    return { ok: true, message: "" };
  }

  const reordered = [...rows];
  [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];

  for (const [i, row] of reordered.entries()) {
    await execute(`UPDATE \`${config.table}\` SET sort_order = ? WHERE id = ?`, [i + 1, row.id]);
  }

  await audit(user, "reorder", config.permission, id);
  revalidateSite(key);
  return { ok: true, message: "Order updated." };
}

function revalidateSite(key: string) {
  revalidatePath("/");
  revalidatePath(`/admin-panel/dashboard/${key}`);
}
