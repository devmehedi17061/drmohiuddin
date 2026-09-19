"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { Testimonial } from "@/lib/types";
import { bn } from "@/lib/format";
import { GoogleIcon } from "@/components/ui/BrandIcons";

const AUTOPLAY_MS = 5500;
const RESUME_AFTER_TOUCH_MS = 4000;

/**
 * A horizontal, snap-scrolling, looping carousel of patient testimonials.
 *
 * Built on native scroll-snap rather than transform-based dragging, so touch
 * swipe, trackpad and mouse-wheel scrolling all work for free with correct
 * momentum. JS only drives the "smart" parts: which card is active, the arrow
 * controls, autoplay, keyboard navigation, and the loop-around at each end.
 * Arrows stay hidden whenever the cards already fit without scrolling at the
 * current breakpoint.
 */
export function TestimonialsSlider({
  eyebrow,
  title,
  subtitle,
  testimonials,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  testimonials: Testimonial[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  // Highest valid "start card" index the track can actually scroll to. With N
  // cards visible per view, the last (N-1) cards can never become the leftmost
  // one, so the loop wraps around this, not the raw testimonial count.
  const [maxStart, setMaxStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = testimonials.length;

  // Whether the cards actually overflow the track at the current breakpoint -
  // arrows only appear when there is somewhere to scroll to.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const check = () => {
      setCanScroll(el.scrollWidth > el.clientWidth + 4);

      const first = el.firstElementChild as HTMLElement | null;
      if (!first || count === 0) {
        setMaxStart(0);
        return;
      }
      const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
      const cardSpan = first.offsetWidth + gap;
      const visible = cardSpan > 0 ? Math.max(1, Math.round((el.clientWidth + gap) / cardSpan)) : 1;
      setMaxStart(Math.max(0, count - visible));
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, [count]);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Tracks which card is currently leftmost-visible, for aria-live text.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const cards = Array.from(el.children) as HTMLElement[];
        let closest = 0;
        let min = Infinity;
        cards.forEach((card, i) => {
          const d = Math.abs(card.offsetLeft - el.scrollLeft);
          if (d < min) {
            min = d;
            closest = i;
          }
        });
        setActive(closest);
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const pages = maxStart + 1;

  const goTo = useCallback(
    (index: number) => {
      const el = trackRef.current;
      if (!el || count === 0) return;
      const wrapped = ((index % pages) + pages) % pages;
      const card = el.children[wrapped] as HTMLElement | undefined;
      if (!card) return;

      // Stepping past either end loops around - jump instantly there rather than
      // smooth-scrolling backwards across every card, which would look like the
      // slider is rewinding instead of continuing forward.
      const isWrap = index < 0 || index >= pages;

      // `card.scrollIntoView()` was used here before, but it scrolls every
      // scrollable ancestor needed to satisfy the request - including the page
      // itself. The moment this card wasn't fully within the *browser window's*
      // viewport (e.g. the visitor had scrolled past this section, or was still
      // above it), autoplay would drag the whole page down to it every 5.5s.
      // Scrolling the track element directly, computed from its own bounding
      // box, moves only that one horizontal scrollbar and can never touch the
      // page's vertical scroll position.
      const trackRect = el.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const targetLeft = el.scrollLeft + (cardRect.left - trackRect.left);

      el.scrollTo({
        left: targetLeft,
        // "auto" defers to the track's own `scroll-behavior: smooth` CSS - it does
        // NOT mean instant - so a true non-animated jump needs "instant" explicitly.
        behavior: reducedMotion || isWrap ? "instant" : "smooth",
      });
    },
    [count, pages, reducedMotion],
  );

  const next = useCallback(() => goTo(active + 1), [goTo, active]);
  const prev = useCallback(() => goTo(active - 1), [goTo, active]);

  // Autoplay - re-armed whenever the active card or pause state changes, so the
  // pace stays a steady interval per slide rather than drifting.
  useEffect(() => {
    if (reducedMotion || paused || !canScroll || pages < 2) return;
    const id = setInterval(() => goTo(active + 1), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [active, paused, canScroll, reducedMotion, pages, goTo]);

  useEffect(() => () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  }, []);

  function handleTouchEnd() {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), RESUME_AFTER_TOUCH_MS);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "Home") {
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goTo(maxStart);
    }
  }

  if (count === 0) return null;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow ? (
            <span className="inline-flex items-center rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
              {eyebrow}
            </span>
          ) : null}
          <h2 className="mt-3 text-2xl font-bold text-ink-900 sm:text-3xl">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-xl text-ink-500">{subtitle}</p> : null}
        </div>

        {canScroll ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="আগের মতামত"
              className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink-700 shadow-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="পরের মতামত"
              className="grid size-11 place-items-center rounded-full border border-line bg-white text-ink-700 shadow-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={title}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={handleTouchEnd}
        onKeyDown={handleKeyDown}
      >
        <p className="sr-only" aria-live="polite">
          {bn(Math.min(active, maxStart) + 1)} এর মধ্যে {bn(pages)} নম্বর স্লাইড
        </p>

        <div
          ref={trackRef}
          tabIndex={0}
          className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] focus:outline-none [&::-webkit-scrollbar]:hidden"
        >
          {testimonials.map((item) => (
            <article
              key={item.id}
              className="flex w-full shrink-0 snap-start flex-col rounded-2xl bg-surface-muted p-7 sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-0.5" aria-label={`${item.rating} out of 5`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={
                        i < item.rating
                          ? "size-4 fill-accent-500 text-accent-500"
                          : "size-4 text-ink-300"
                      }
                      aria-hidden="true"
                    />
                  ))}
                </div>

                {item.source === "google" ? (
                  item.source_url ? (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="গুগল রিভিউতে দেখুন"
                      title="গুগল রিভিউ"
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-white shadow-soft transition-transform hover:scale-105"
                    >
                      <GoogleIcon className="size-4" />
                    </a>
                  ) : (
                    <span
                      title="গুগল রিভিউ"
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-white shadow-soft"
                    >
                      <GoogleIcon className="size-4" />
                    </span>
                  )
                ) : null}
              </div>

              <p className="mt-4 flex-1 leading-relaxed text-ink-700">
                &ldquo;{item.message}&rdquo;
              </p>

              <div className="mt-6 border-t border-line/70 pt-4">
                <p className="font-semibold text-ink-900">{item.patient_name}</p>
                {item.location ? <p className="text-sm text-ink-500">{item.location}</p> : null}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
