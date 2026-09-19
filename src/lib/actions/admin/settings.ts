"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { audit, authorize } from "@/lib/auth/session";
import { groupOf, settingField, SETTING_GROUPS } from "@/lib/admin/settings-fields";
import { removeUpload, storeImage, UploadError } from "@/lib/upload";
import type { FormState } from "../state";

/**
 * Saves one settings group. Only keys declared in SETTING_GROUPS are written, so a
 * crafted form cannot introduce arbitrary rows into the settings table.
 */
export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  let user;
  try {
    user = await authorize("update", "settings");
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    return {
      ok: false,
      message:
        code === "FORBIDDEN"
          ? "Only an admin can change site settings."
          : "Your session has expired. Please log in again.",
    };
  }

  const groupId = String(formData.get("__group") ?? "");
  const group = SETTING_GROUPS.find((g) => g.id === groupId);
  if (!group) return { ok: false, message: "Unknown section." };

  const errors: Record<string, string> = {};
  const updates: { key: string; value: string }[] = [];
  const stale: string[] = [];

  for (const field of group.fields) {
    if (field.type === "image") {
      const file = formData.get(field.key);
      const current = String(formData.get(`${field.key}__current`) ?? "");
      const remove = formData.get(`${field.key}__remove`) === "1";

      if (file instanceof File && file.size > 0) {
        try {
          const stored = await storeImage(file, "misc");
          updates.push({ key: field.key, value: stored.filePath });
          if (current) stale.push(current);
        } catch (err) {
          errors[field.key] = err instanceof UploadError ? err.message : "Image upload failed.";
        }
      } else if (remove) {
        updates.push({ key: field.key, value: "" });
        if (current) stale.push(current);
      }
      continue;
    }

    const raw = formData.get(field.key);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (field.type === "url" && value && !/^https?:\/\//i.test(value)) {
      errors[field.key] = "The link must start with http:// or https://.";
      continue;
    }
    if (field.type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors[field.key] = "Please enter a valid email address.";
      continue;
    }
    if (value.length > 5000) {
      errors[field.key] = "The text is too long.";
      continue;
    }

    updates.push({ key: field.key, value });
  }

  if (Object.keys(errors).length) {
    return { ok: false, message: "There are some errors in the form.", errors };
  }

  try {
    for (const update of updates) {
      // settingField() re-checks the whitelist right before the write.
      if (!settingField(update.key)) continue;
      await execute(
        "INSERT INTO settings (key, value, group_name) VALUES (?, ?, ?) " +
          "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [update.key, update.value, groupOf(update.key)],
      );
    }

    await Promise.all(stale.map(removeUpload));
    await audit(user, "update", "settings", groupId, `${updates.length} keys`);
    revalidatePath("/");
    revalidatePath("/admin-panel/dashboard/settings");

    return { ok: true, message: `"${group.title}" saved.` };
  } catch {
    return { ok: false, message: "Could not save. Please try again." };
  }
}
