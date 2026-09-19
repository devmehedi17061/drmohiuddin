"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import type { GalleryImage } from "@/lib/types";
import { bn } from "@/lib/format";

export function PhotoGallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const [visible, setVisible] = useState(12);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(
    () => setIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length)),
    [images.length],
  );
  const next = useCallback(
    () => setIndex((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, close, prev, next]);

  if (!images.length) return null;

  const active = index === null ? null : images[index];

  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.slice(0, visible).map((image, i) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-surface-muted shadow-soft"
              aria-label={image.alt_text || "ছবি বড় করে দেখুন"}
            >
              <Image
                src={image.file_path}
                alt={image.alt_text || ""}
                fill
                sizes="(min-width: 1024px) 23vw, (min-width: 640px) 31vw, 47vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 grid place-items-center bg-brand-950/0 text-white opacity-0 transition-all duration-300 group-hover:bg-brand-950/45 group-hover:opacity-100">
                <ZoomIn className="size-7" aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {visible < images.length ? (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + 12)}
            className="rounded-full border border-brand-200 bg-white px-7 py-3 text-sm font-semibold text-brand-700 shadow-soft transition-colors hover:bg-brand-50"
          >
            আরও ছবি দেখুন ({bn(images.length - visible)})
          </button>
        </div>
      ) : null}

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="ছবি প্রদর্শন"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-900/92 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="বন্ধ করুন"
          >
            <X className="size-5" />
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-6"
                aria-label="আগের ছবি"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 grid size-11 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-6"
                aria-label="পরের ছবি"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          ) : null}

          <figure
            className="max-h-[88vh] w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto aspect-[4/3] w-full">
              <Image
                src={active.file_path}
                alt={active.alt_text || ""}
                fill
                sizes="90vw"
                className="rounded-xl object-contain"
              />
            </div>
            <figcaption className="mt-4 text-center text-sm text-white/80">
              {active.caption || active.alt_text}
              <span className="ml-2 text-white/50">
                ({bn(index! + 1)}/{bn(images.length)})
              </span>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </>
  );
}
