import { Mail, MapPin, Phone } from "lucide-react";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import type { Chamber, SettingsMap } from "@/lib/types";
import { telHref, whatsappHref } from "@/lib/format";
import { SectionHeading } from "./SectionHeading";
import { AppointmentForm } from "./AppointmentForm";

export function Contact({
  settings,
  chambers,
}: {
  settings: SettingsMap;
  chambers: Chamber[];
}) {
  const rows = [
    settings.contact_phone && {
      icon: Phone,
      label: "ফোন",
      value: settings.contact_phone,
      href: telHref(settings.contact_phone),
    },
    settings.contact_whatsapp && {
      icon: WhatsappIcon,
      label: "হোয়াটসঅ্যাপ",
      value: settings.contact_whatsapp,
      href: whatsappHref(settings.contact_whatsapp, "আসসালামু আলাইকুম, আমি অ্যাপয়েন্টমেন্ট নিতে চাই।"),
    },
    settings.contact_email && {
      icon: Mail,
      label: "ইমেইল",
      value: settings.contact_email,
      href: `mailto:${settings.contact_email}`,
    },
    settings.contact_address && {
      icon: MapPin,
      label: "ঠিকানা",
      value: settings.contact_address,
      href: "",
    },
  ].filter(Boolean) as {
    icon: (props: { className?: string }) => React.ReactElement;
    label: string;
    value: string;
    href: string;
  }[];

  return (
    <section id="contact" className="relative overflow-hidden bg-brand-900 py-16 text-white lg:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(50rem 30rem at 15% 0%, rgba(56,168,188,0.35), transparent 60%)",
        }}
      />

      <div className="container-page relative">
        <SectionHeading
          eyebrow="যোগাযোগ"
          title={settings.contact_title || "অ্যাপয়েন্টমেন্ট নিন"}
          subtitle={settings.contact_subtitle}
          tone="dark"
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <ul className="space-y-4">
            {rows.map((row) => {
              const content = (
                <>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-accent-400 ring-1 ring-white/15">
                    <row.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs uppercase tracking-wide text-brand-200">
                      {row.label}
                    </span>
                    <span className="block break-words font-medium">{row.value}</span>
                  </span>
                </>
              );

              return (
                <li key={row.label}>
                  {row.href ? (
                    <a
                      href={row.href}
                      target={row.href.startsWith("http") ? "_blank" : undefined}
                      rel={row.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex items-start gap-4 rounded-card bg-white/[0.07] p-5 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]"
                    >
                      {content}
                    </a>
                  ) : (
                    <div className="flex items-start gap-4 rounded-card bg-white/[0.07] p-5 ring-1 ring-white/10">
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="rounded-card bg-white p-6 shadow-lift sm:p-8">
            <AppointmentForm chambers={chambers} />
          </div>
        </div>
      </div>
    </section>
  );
}
