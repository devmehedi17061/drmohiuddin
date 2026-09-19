import { CalendarDays, Clock, ExternalLink, MapPin, Phone } from "lucide-react";
import type { Chamber, SettingsMap } from "@/lib/types";
import { telHref } from "@/lib/format";
import { SectionHeading } from "./SectionHeading";

export function Chambers({
  settings,
  chambers,
}: {
  settings: SettingsMap;
  chambers: Chamber[];
}) {
  if (!chambers.length) return null;

  return (
    <section id="chambers" className="py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="সময়সূচি"
          title={settings.chamber_title || "চেম্বার ও সময়সূচি"}
          subtitle={settings.chamber_subtitle}
        />

        <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {chambers.map((chamber) => (
            <li
              key={chamber.id}
              className="flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-soft"
            >
              <div className="bg-brand-700 px-6 py-4">
                <h3 className="text-lg font-semibold text-white">{chamber.name}</h3>
              </div>

              <div className="flex flex-1 flex-col gap-3.5 p-6 text-[0.95rem]">
                {chamber.address ? (
                  <p className="flex gap-3 text-ink-700">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden="true" />
                    <span>{chamber.address}</span>
                  </p>
                ) : null}

                {chamber.days_text ? (
                  <p className="flex gap-3 text-ink-700">
                    <CalendarDays
                      className="mt-0.5 size-5 shrink-0 text-brand-500"
                      aria-hidden="true"
                    />
                    <span>{chamber.days_text}</span>
                  </p>
                ) : null}

                {chamber.time_text ? (
                  <p className="flex gap-3 font-medium text-ink-900">
                    <Clock className="mt-0.5 size-5 shrink-0 text-brand-500" aria-hidden="true" />
                    <span>{chamber.time_text}</span>
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {telHref(chamber.phone) ? (
                    <a
                      href={telHref(chamber.phone)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
                    >
                      <Phone className="size-4" aria-hidden="true" />
                      সিরিয়াল নিন
                    </a>
                  ) : null}

                  {chamber.map_url ? (
                    <a
                      href={chamber.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-700"
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                      ম্যাপ
                    </a>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
