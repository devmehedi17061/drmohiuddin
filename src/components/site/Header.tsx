"use client";

import { useEffect, useState } from "react";
import { Menu, Phone, X } from "lucide-react";
import { cn, telHref } from "@/lib/format";
import { ScrollLink } from "./ScrollLink";
import { LogoMark } from "@/components/ui/LogoMark";

const NAV = [
  { href: "#about", label: "পরিচিতি" },
  { href: "#services", label: "সেবাসমূহ" },
  { href: "#chambers", label: "চেম্বার" },
  { href: "#gallery", label: "গ্যালারি" },
  { href: "#videos", label: "ভিডিও" },
  { href: "#faq", label: "প্রশ্নোত্তর" },
];

export function Header({
  siteName,
  tagline,
  phone,
  logo,
}: {
  siteName: string;
  tagline: string;
  phone: string;
  logo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Prevent the page behind the mobile sheet from scrolling.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-shadow duration-300",
        scrolled
          ? "border-b border-line bg-white/95 shadow-lift backdrop-blur"
          : "border-b border-transparent bg-white",
      )}
    >
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-4 lg:h-20">
        <ScrollLink href="#top" className="flex min-w-0 items-center gap-3" aria-label={siteName}>
          <LogoMark
            logo={logo}
            siteName={siteName}
            className={logo ? "h-12 lg:h-16" : "h-11"}
          />
          {/* The uploaded logo already carries the name, so the text block would
              only duplicate it and squeeze the logo. */}
          {logo ? null : (
            <span className="min-w-0">
              <span className="block truncate text-base font-bold leading-tight text-ink-900">
                {siteName}
              </span>
              <span className="block truncate text-xs leading-tight text-ink-500">{tagline}</span>
            </span>
          )}
        </ScrollLink>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <ScrollLink
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-[0.95rem] font-medium text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700"
            >
              {item.label}
            </ScrollLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {telHref(phone) ? (
            <a
              href={telHref(phone)}
              className="hidden items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-800 sm:inline-flex"
            >
              <Phone className="size-4" aria-hidden="true" />
              অ্যাপয়েন্টমেন্ট
            </a>
          ) : (
            <ScrollLink
              href="#contact"
              className="hidden items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-800 sm:inline-flex"
            >
              <Phone className="size-4" aria-hidden="true" />
              অ্যাপয়েন্টমেন্ট
            </ScrollLink>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid size-11 place-items-center rounded-lg border border-line text-ink-700 lg:hidden"
            aria-label={open ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-white lg:hidden">
          <nav className="container-page flex flex-col py-3">
            {NAV.map((item) => (
              <ScrollLink
                key={item.href}
                href={item.href}
                onNavigate={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base font-medium text-ink-700 hover:bg-brand-50"
              >
                {item.label}
              </ScrollLink>
            ))}
            <ScrollLink
              href="#contact"
              onNavigate={() => setOpen(false)}
              className="mt-2 rounded-full bg-brand-700 px-5 py-3 text-center text-sm font-semibold text-white"
            >
              অ্যাপয়েন্টমেন্ট নিন
            </ScrollLink>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
