"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  ListVideo,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  addVideo,
  deleteVideo,
  moveVideo,
  toggleVideo,
  updateVideoTitle,
} from "@/lib/actions/admin/videos";
import { VIDEO_INITIAL, type FormState } from "@/lib/actions/state";
import type { VideoItem } from "@/lib/types";
import { thumbnailUrl, watchUrl } from "@/lib/youtube";
import { Alert, Badge, btnIcon, btnPrimary, Card, EmptyState, inputClass, labelClass } from "./ui";
import { cn } from "@/lib/format";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
      <Plus className="size-4" aria-hidden="true" />
      {pending ? "Adding…" : "Add"}
    </button>
  );
}

export function VideoManager({
  videos,
  permissions,
}: {
  videos: VideoItem[];
  permissions: { create: boolean; update: boolean; delete: boolean };
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<FormState | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState<{ id: number; value: string } | null>(null);

  const [addState, addAction] = useActionState(async (prev: FormState, fd: FormData) => {
    const result = await addVideo(prev, fd);
    if (result.ok) router.refresh();
    return result;
  }, VIDEO_INITIAL);

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
          title="New Video or Playlist"
          description="Paste a YouTube video link or a full playlist link. The title will be fetched automatically."
          className="lg:sticky lg:top-6"
        >
          <form action={addAction} className="space-y-4">
            {addState.message ? <Alert ok={addState.ok}>{addState.message}</Alert> : null}

            <div>
              <label htmlFor="v-url" className={labelClass}>
                YouTube Link
              </label>
              <input
                id="v-url"
                name="url"
                required
                placeholder="https://www.youtube.com/watch?v=…"
                className={inputClass}
              />
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Supported: watch?v=…, youtu.be/…, /shorts/…, /live/… and
                youtube.com/playlist?list=…
              </p>
            </div>

            <div>
              <label htmlFor="v-kind" className={labelClass}>
                Type
              </label>
              <select id="v-kind" name="kind" defaultValue="auto" className={inputClass}>
                <option value="auto">Automatic (detected from the link)</option>
                <option value="video">Single Video</option>
                <option value="playlist">Playlist</option>
              </select>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                If the link has both a video and a playlist, choose which one you want here.
              </p>
            </div>

            <div>
              <label htmlFor="v-title" className={labelClass}>
                Title (optional)
              </label>
              <input
                id="v-title"
                name="title"
                maxLength={255}
                placeholder="Leave blank to fetch from YouTube"
                className={inputClass}
              />
            </div>

            <AddButton />
          </form>
        </Card>
      ) : null}

      <div className={cn("space-y-4", !permissions.create && "lg:col-span-2")}>
        {notice?.message ? <Alert ok={notice.ok}>{notice.message}</Alert> : null}

        <h2 className="font-semibold text-slate-900">
          Current Videos & Playlists ({videos.length})
        </h2>

        {videos.length === 0 ? (
          <EmptyState>No videos have been added yet.</EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {videos.map((video, index) => {
              const active = video.is_active === 1;
              const busy = busyId === video.id;
              const poster =
                video.kind === "video" ? thumbnailUrl(video.youtube_key, "hq") : video.thumb_url;
              const isEditing = titleDraft?.id === video.id;

              return (
                <li
                  key={video.id}
                  className={cn(
                    "flex flex-wrap items-center gap-4 rounded-2xl border bg-white p-3.5 shadow-sm transition-opacity sm:p-4",
                    active ? "border-slate-200" : "border-dashed border-slate-300 opacity-70",
                    busy && "pointer-events-none opacity-50",
                  )}
                >
                  <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                    {poster ? (
                      <Image
                        src={poster}
                        alt=""
                        fill
                        unoptimized
                        sizes="112px"
                        className="object-cover"
                      />
                    ) : (
                      <span className="grid h-full place-items-center text-slate-500">
                        <ListVideo className="size-6" aria-hidden="true" />
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        <input
                          value={titleDraft.value}
                          onChange={(e) => setTitleDraft({ id: video.id, value: e.target.value })}
                          maxLength={255}
                          className={`${inputClass} flex-1`}
                          autoFocus
                        />
                        <button
                          type="button"
                          className={btnPrimary}
                          onClick={async () => {
                            const value = titleDraft.value;
                            setTitleDraft(null);
                            await run(() => updateVideoTitle(video.id, value), video.id);
                          }}
                        >
                          <Save className="size-4" aria-hidden="true" />
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="line-clamp-2 font-medium text-slate-900">
                          {video.title || "— No title —"}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {video.kind === "playlist" ? (
                            <Badge tone="blue">Playlist</Badge>
                          ) : (
                            <Badge tone="slate">Video</Badge>
                          )}
                          <span className="font-mono">{video.youtube_key}</span>
                          <a
                            href={watchUrl(video.kind, video.youtube_key)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                          >
                            <ExternalLink className="size-3" aria-hidden="true" />
                            View on YouTube
                          </a>
                          {!active ? <Badge tone="amber">Hidden</Badge> : null}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {permissions.update ? (
                      <>
                        <button
                          type="button"
                          className={btnIcon}
                          disabled={index === 0}
                          onClick={() => run(() => moveVideo(video.id, "up"), video.id)}
                          aria-label="Move up"
                          title="Move up (reorder)"
                        >
                          <ChevronUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          className={btnIcon}
                          disabled={index === videos.length - 1}
                          onClick={() => run(() => moveVideo(video.id, "down"), video.id)}
                          aria-label="Move down"
                          title="Move down (reorder)"
                        >
                          <ChevronDown className="size-4" />
                        </button>
                        <button
                          type="button"
                          className={btnIcon}
                          onClick={() => run(() => toggleVideo(video.id, !active), video.id)}
                          aria-label={active ? "Hide" : "Show"}
                          title={active ? "Hide from the site" : "Show on the site"}
                        >
                          {active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        </button>
                        <button
                          type="button"
                          className={btnIcon}
                          onClick={() =>
                            setTitleDraft({ id: video.id, value: video.title ?? "" })
                          }
                          aria-label="Edit title"
                          title="Edit title"
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
                          if (confirm("This link will be deleted. Are you sure?")) {
                            run(() => deleteVideo(video.id), video.id);
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
