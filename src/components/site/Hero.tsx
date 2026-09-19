import Image from "next/image";
import { CalendarCheck, Phone, ShieldCheck, Stethoscope } from "lucide-react";
import type { SettingsMap } from "@/lib/types";
import { telHref } from "@/lib/format";
import { ScrollLink } from "./ScrollLink";

export function Hero({ settings }: { settings: SettingsMap }) {
  const image = settings.hero_image?.trim();
  const phone = settings.contact_phone;

  return (
    <section id="top" className="relative overflow-hidden bg-brand-900 text-white">
      {/* Ambient shapes - decorative only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(60rem 40rem at 85% -10%, rgba(56,168,188,0.45), transparent 60%), radial-gradient(45rem 35rem at 5% 110%, rgba(20,90,110,0.85), transparent 65%)",
        }}
      />

      <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          {settings.hero_eyebrow ? (
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-brand-100 ring-1 ring-white/15">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {settings.hero_eyebrow}
            </p>
          ) : null}

          <h1 className="mt-5 text-3xl font-bold leading-[1.25] sm:text-4xl lg:text-[3rem]">
            {settings.hero_name}
          </h1>

          {settings.hero_degrees ? (
            <p className="mt-3 text-base font-medium text-accent-400 sm:text-lg">
              {settings.hero_degrees}
            </p>
          ) : null}

          <div className="mt-4 space-y-1 text-brand-100">
            {settings.hero_designation ? <p>{settings.hero_designation}</p> : null}
            {settings.hero_workplace ? <p className="text-brand-200">{settings.hero_workplace}</p> : null}
          </div>

          {settings.hero_summary ? (
            <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-brand-50/90">
              {settings.hero_summary}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <ScrollLink
              href="#contact"
              className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-7 py-3.5 text-base font-semibold text-ink-900 shadow-lift transition-transform hover:-translate-y-0.5 hover:bg-accent-400"
            >
              <CalendarCheck className="size-5" aria-hidden="true" />
              {settings.hero_primary_cta || "অ্যাপয়েন্টমেন্ট নিন"}
            </ScrollLink>

            {telHref(phone) ? (
              <a
                href={telHref(phone)}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Phone className="size-5" aria-hidden="true" />
                {settings.hero_secondary_cta || "সরাসরি কল করুন"}
              </a>
            ) : null}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-brand-800 ring-1 ring-white/15">
            {image ? (
              <Image
                src={image}
                alt={settings.hero_name || "ডাক্তারের ছবি"}
                fill
                priority
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-brand-200">
                <Stethoscope className="size-16" aria-hidden="true" />
                <p className="text-sm leading-relaxed">
                  অ্যাডমিন প্যানেল → সাইট সেটিংস থেকে
                  <br />
                  ডাক্তারের ছবি আপলোড করুন।
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
