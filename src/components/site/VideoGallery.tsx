"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ListVideo, Play, X } from "lucide-react";
import { YoutubeIcon } from "@/components/ui/BrandIcons";
import type { VideoItem } from "@/lib/types";
import { embedUrl, thumbnailUrl, watchUrl } from "@/lib/youtube";
import { bn } from "@/lib/format";

/** Playlists have no static thumbnail, so we fall back to the oEmbed one stored at save time. */
function posterFor(video: VideoItem): string | null {
  if (video.kind === "video") return thumbnailUrl(video.youtube_key, "maxres");
  return video.thumb_url;
}

export function VideoGallery({ videos }: { videos: VideoItem[] }) {
  const [active, setActive] = useState<VideoItem | null>(null);
  const [visible, setVisible] = useState(6);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  if (!videos.length) return null;

  return (
    <>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.slice(0, visible).map((video) => {
          const poster = posterFor(video);
          const isPlaylist = video.kind === "playlist";

          return (
            <li key={video.id}>
              <button
                type="button"
                onClick={() => setActive(video)}
                className="group block w-full overflow-hidden rounded-card border border-line bg-white text-left shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="relative aspect-video overflow-hidden bg-ink-900">
                  {poster ? (
                    <Image
                      src={poster}
                      alt={video.title || "ভিডিও"}
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-brand-300">
                      <YoutubeIcon className="size-12" aria-hidden="true" />
                    </div>
                  )}

                  <span className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent" />

                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid size-14 place-items-center rounded-full bg-red-600/95 text-white shadow-lift transition-transform duration-300 group-hover:scale-110">
                      <Play className="ml-0.5 size-6 fill-current" aria-hidden="true" />
                    </span>
                  </span>

                  {isPlaylist ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-ink-900/85 px-3 py-1 text-xs font-semibold text-white">
                      <ListVideo className="size-3.5" aria-hidden="true" />
                      প্লেলিস্ট
                    </span>
                  ) : null}
                </div>

                <div className="p-5">
                  <h3 className="line-clamp-2 text-[0.98rem] font-semibold leading-snug text-ink-900 transition-colors group-hover:text-brand-700">
                    {video.title || (isPlaylist ? "ইউটিউব প্লেলিস্ট" : "ভিডিও দেখুন")}
                  </h3>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {visible < videos.length ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + 6)}
            className="rounded-full border border-brand-200 bg-white px-7 py-3 text-sm font-semibold text-brand-700 shadow-soft transition-colors hover:bg-brand-50"
          >
            আরও ভিডিও দেখুন ({bn(videos.length - visible)})
          </button>
        </div>
      ) : null}

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title || "ভিডিও"}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/92 p-4"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="বন্ধ করুন"
          >
            <X className="size-5" />
          </button>

          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="aspect-video overflow-hidden rounded-xl bg-black shadow-lift">
              <iframe
                src={embedUrl(active.kind, active.youtube_key, true)}
                title={active.title || "ইউটিউব ভিডিও"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="size-full border-0"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-white/85">{active.title}</p>
              <a
                href={watchUrl(active.kind, active.youtube_key)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                <YoutubeIcon className="size-4" aria-hidden="true" />
                ইউটিউবে দেখুন
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
