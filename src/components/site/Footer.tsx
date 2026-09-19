import { Mail, MapPin, Phone } from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from "@/components/ui/BrandIcons";
import type { Service, SettingsMap } from "@/lib/types";
import { bn, telHref } from "@/lib/format";
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

export function Footer({
  settings,
  services,
}: {
  settings: SettingsMap;
  services: Service[];
}) {
  const socials = [
    { href: settings.social_facebook, icon: FacebookIcon, label: "Facebook" },
    { href: settings.social_youtube, icon: YoutubeIcon, label: "YouTube" },
    { href: settings.social_instagram, icon: InstagramIcon, label: "Instagram" },
    { href: settings.social_linkedin, icon: LinkedinIcon, label: "LinkedIn" },
  ].filter((s) => !!s.href);

  return (
    <footer className="bg-brand-950 text-brand-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          {settings.site_logo ? (
            <LogoMark
              logo={settings.site_logo}
              siteName={settings.site_name}
              className="mb-3 h-12"
            />
          ) : null}
          <p className="text-lg font-bold text-white">{settings.site_name}</p>
          <p className="mt-1 text-sm text-brand-300">{settings.site_tagline}</p>
          {settings.hero_degrees ? (
            <p className="mt-3 text-sm leading-relaxed text-brand-200">{settings.hero_degrees}</p>
          ) : null}

          {socials.length ? (
            <div className="mt-5 flex gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="grid size-10 place-items-center rounded-lg bg-white/8 text-brand-100 transition-colors hover:bg-brand-600 hover:text-white"
                >
                  <social.icon className="size-4.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <nav aria-label="ফুটার মেনু">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
            দ্রুত লিংক
          </h3>
          <ul className="space-y-2.5 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <ScrollLink href={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </ScrollLink>
              </li>
            ))}
          </ul>
        </nav>

        {services.length ? (
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
              সেবাসমূহ
            </h3>
            <ul className="space-y-2.5 text-sm">
              {services.slice(0, 6).map((service) => (
                <li key={service.id}>
                  <ScrollLink href="#services" className="transition-colors hover:text-white">
                    {service.title}
                  </ScrollLink>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">যোগাযোগ</h3>
          <ul className="space-y-3 text-sm">
            {settings.contact_phone ? (
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-4 shrink-0 text-accent-400" aria-hidden="true" />
                <a href={telHref(settings.contact_phone)} className="hover:text-white">
                  {settings.contact_phone}
                </a>
              </li>
            ) : null}
            {settings.contact_email ? (
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-4 shrink-0 text-accent-400" aria-hidden="true" />
                <a href={`mailto:${settings.contact_email}`} className="break-all hover:text-white">
                  {settings.contact_email}
                </a>
              </li>
            ) : null}
            {settings.contact_address ? (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-accent-400" aria-hidden="true" />
                <span>{settings.contact_address}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-brand-300 sm:flex-row">
          <p>
            © {bn(new Date().getFullYear())} {settings.site_name}। {settings.footer_note}
          </p>
          <a href="/admin-panel" className="transition-colors hover:text-white">
            অ্যাডমিন লগইন
          </a>
        </div>
      </div>
    </footer>
  );
}
