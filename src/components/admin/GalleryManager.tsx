"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronDown, ChevronUp, Eye, EyeOff, Pencil, Save, Trash2, Upload, X } from "lucide-react";
import {
  deleteGalleryImage,
  moveGalleryImage,
  toggleGalleryImage,
  updateGalleryImage,
  uploadGalleryImages,
} from "@/lib/actions/admin/gallery";
import { GALLERY_INITIAL, type FormState } from "@/lib/actions/state";
import type { GalleryImage } from "@/lib/types";
import { Alert, Badge, btnGhost, btnIcon, btnPrimary, Card, EmptyState, inputClass, labelClass } from "./ui";
import { cn } from "@/lib/format";

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
      <Upload className="size-4" aria-hidden="true" />
      {pending ? "Uploading…" : "Upload"}
    </button>
  );
}

export function GalleryManager({
  images,
  permissions,
}: {
  images: GalleryImage[];
  permissions: { create: boolean; update: boolean; delete: boolean };
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<FormState | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<GalleryImage | null>(null);

  const [uploadState, uploadAction] = useActionState(
    async (prev: FormState, fd: FormData) => {
      const result = await uploadGalleryImages(prev, fd);
      if (result.ok) router.refresh();
      return result;
    },
    GALLERY_INITIAL,
  );

  async function run(fn: () => Promise<FormState>, id: number) {
    setBusyId(id);
    const result = await fn();
    setBusyId(null);
    if (result.message) setNotice(result);
    if (result.ok) router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
      {permissions.create ? (
        <Card
          title="Upload New Photos"
          description="You can select multiple images at once. They'll be automatically converted to WebP and resized."
          className="lg:sticky lg:top-6"
        >
          <form action={uploadAction} className="space-y-4">
            {uploadState.message ? (
              <Alert ok={uploadState.ok}>{uploadState.message}</Alert>
            ) : null}

            <div>
              <label htmlFor="g-files" className={labelClass}>
                Select Images
              </label>
              <input
                id="g-files"
                type="file"
                name="images"
                accept="image/*"
                multiple
                required
                className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-600 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-50 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
            </div>

            <div>
              <label htmlFor="g-alt" className={labelClass}>
                Image Alt Text
              </label>
              <input
                id="g-alt"
                name="alt_text"
                maxLength={200}
                placeholder="Dr. Mohiuddin examining a patient at the chamber"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-slate-500">
                For multiple images, a serial number is appended to each one&apos;s Alt text.
              </p>
            </div>

            <div>
              <label htmlFor="g-caption" className={labelClass}>
                Caption (optional)
              </label>
              <input id="g-caption" name="caption" maxLength={255} className={inputClass} />
            </div>

            <UploadButton />
          </form>
        </Card>
      ) : null}

      <div className={cn("space-y-4", !permissions.create && "lg:col-span-2")}>
        {notice?.message ? <Alert ok={notice.ok}>{notice.message}</Alert> : null}

        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">
            Current Gallery Images ({images.length})
          </h2>
        </div>

        {images.length === 0 ? (
          <EmptyState>No images have been uploaded yet.</EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {images.map((image, index) => {
              const active = image.is_active === 1;
              const busy = busyId === image.id;

              return (
                <li
                  key={image.id}
                  className={cn(
                    "overflow-hidden rounded-2xl border bg-white shadow-sm transition-opacity",
                    active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70",
                    busy && "pointer-events-none opacity-50",
                  )}
                >
                  <div className="relative aspect-square bg-slate-100">
                    <Image
                      src={image.file_path}
                      alt={image.alt_text || ""}
                      fill
                      sizes="(min-width:1280px) 18vw, (min-width:640px) 28vw, 45vw"
                      className="object-cover"
                    />
                    {!active ? (
                      <span className="absolute left-2 top-2">
                        <Badge tone="amber">Hidden</Badge>
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-2 p-3">
                    <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-snug text-slate-500">
                      {image.alt_text || "— No Alt text —"}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {permissions.update ? (
                        <>
                          <button
                            type="button"
                            className={btnIcon}
                            disabled={index === 0}
                            onClick={() => run(() => moveGalleryImage(image.id, "up"), image.id)}
                            aria-label="Move earlier"
                            title="Move earlier (reorder)"
                          >
                            <ChevronUp className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={btnIcon}
                            disabled={index === images.length - 1}
                            onClick={() => run(() => moveGalleryImage(image.id, "down"), image.id)}
                            aria-label="Move later"
                            title="Move later (reorder)"
                          >
                            <ChevronDown className="size-4" />
                          </button>
                          <button
                            type="button"
                            className={btnIcon}
                            onClick={() =>
                              run(() => toggleGalleryImage(image.id, !active), image.id)
                            }
                            aria-label={active ? "Hide" : "Show"}
                            title={active ? "Hide from the site" : "Show on the site"}
                          >
                            {active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                          </button>
                          <button
                            type="button"
                            className={btnIcon}
                            onClick={() => setEditing(image)}
                            aria-label="Edit Alt text"
                            title="Edit Alt text & caption"
                          >
                            <Pencil className="size-4" />
                          </button>
                        </>
                      ) : null}

                      {permissions.delete ? (
                        <button
                          type="button"
                          className={cn(
                            btnIcon,
                            "hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600",
                          )}
                          aria-label="Delete"
                          title="Delete"
                          onClick={() => {
                            if (confirm("This image will be permanently deleted. Are you sure?")) {
                              run(() => deleteGalleryImage(image.id), image.id);
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editing ? (
        <EditDialog
          image={editing}
          onClose={() => setEditing(null)}
          onSave={async (alt, caption) => {
            const result = await updateGalleryImage(editing.id, alt, caption);
            setNotice(result);
            setEditing(null);
            if (result.ok) router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function EditDialog({
  image,
  onClose,
  onSave,
}: {
  image: GalleryImage;
  onClose: () => void;
  onSave: (alt: string, caption: string) => Promise<void>;
}) {
  const [alt, setAlt] = useState(image.alt_text ?? "");
  const [caption, setCaption] = useState(image.caption ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="font-semibold text-slate-900">Edit Image Details</h3>
          <button type="button" onClick={onClose} className={btnIcon} aria-label="Close" title="Close">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="e-alt" className={labelClass}>
              Alt Text
            </label>
            <input
              id="e-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              maxLength={255}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="e-caption" className={labelClass}>
              Caption
            </label>
            <input
              id="e-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={255}
              className={inputClass}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              className={btnPrimary}
              onClick={async () => {
                setSaving(true);
                await onSave(alt, caption);
                setSaving(false);
              }}
            >
              <Save className="size-4" aria-hidden="true" />
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={onClose} className={btnGhost}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
