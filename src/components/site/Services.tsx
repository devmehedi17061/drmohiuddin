import Image from "next/image";
import type { Service, SettingsMap } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "./SectionHeading";

export function Services({
  settings,
  services,
}: {
  settings: SettingsMap;
  services: Service[];
}) {
  if (!services.length) return null;

  return (
    <section id="services" className="bg-surface-muted py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="চিকিৎসা"
          title={settings.services_title || "চিকিৎসা সেবাসমূহ"}
          subtitle={settings.services_subtitle}
        />

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <li
              key={service.id}
              className="group flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              {service.image_path ? (
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src={service.image_path}
                    alt={service.title}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : null}

              <div className="flex flex-1 flex-col p-6">
                <span className="mb-4 grid size-12 place-items-center rounded-xl bg-brand-600 text-white transition-colors group-hover:bg-brand-700">
                  <Icon name={service.icon} className="size-6" />
                </span>

                <h3 className="text-lg font-semibold text-ink-900">{service.title}</h3>

                {service.summary ? (
                  <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink-500">
                    {service.summary}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
