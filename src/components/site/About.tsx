import Image from "next/image";
import { Award, BriefcaseMedical, GraduationCap, Users } from "lucide-react";
import type { Credential, CredentialKind, SettingsMap } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

const GROUPS: { kind: CredentialKind; label: string; icon: typeof GraduationCap }[] = [
  { kind: "degree", label: "শিক্ষাগত যোগ্যতা", icon: GraduationCap },
  { kind: "experience", label: "পেশাগত অভিজ্ঞতা", icon: BriefcaseMedical },
  { kind: "membership", label: "সদস্যপদ", icon: Users },
  { kind: "award", label: "সম্মাননা", icon: Award },
];

export function About({
  settings,
  credentials,
}: {
  settings: SettingsMap;
  credentials: Credential[];
}) {
  const image = settings.about_image?.trim() || settings.hero_image?.trim();
  const groups = GROUPS.map((g) => ({
    ...g,
    items: credentials.filter((c) => c.kind === g.kind),
  })).filter((g) => g.items.length > 0);

  return (
    <section id="about" className="py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="পরিচিতি"
          title={settings.about_title || "ডাক্তার সম্পর্কে"}
          align="left"
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          {image ? (
            // The sticky-while-scrolling behavior and the `fill` image's positioning
            // context are kept on separate elements: `position: sticky` isn't in
            // Next.js's allowlist for an `<Image fill>` parent (it warns even though
            // sticky behaves like relative for this purpose), so the inner div stays
            // plainly `relative` and only the outer one gets `lg:sticky`.
            <div className="lg:sticky lg:top-28">
              <div className="relative aspect-[4/5] overflow-hidden rounded-card shadow-lift">
                <Image
                  src={image}
                  alt={settings.hero_name || "ডাক্তারের ছবি"}
                  fill
                  sizes="(min-width: 1024px) 35vw, 90vw"
                  className="object-cover"
                />
              </div>
            </div>
          ) : null}

          <div className={image ? "" : "lg:col-span-2"}>
            {settings.about_body ? (
              <div className="space-y-4 text-[1.02rem] leading-relaxed text-ink-700">
                {settings.about_body
                  .split(/\n{2,}/)
                  .map((paragraph, i) => <p key={i}>{paragraph}</p>)}
              </div>
            ) : null}

            {groups.length ? (
              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                {groups.map((group) => (
                  <div
                    key={group.kind}
                    className="rounded-card border border-line bg-surface-muted p-6"
                  >
                    <h3 className="flex items-center gap-2.5 text-base font-semibold text-brand-800">
                      <span className="grid size-9 place-items-center rounded-lg bg-brand-600 text-white">
                        <group.icon className="size-4.5" aria-hidden="true" />
                      </span>
                      {group.label}
                    </h3>

                    <ul className="mt-4 space-y-3.5">
                      {group.items.map((item) => (
                        <li key={item.id} className="border-l-2 border-brand-200 pl-3.5">
                          <p className="font-medium leading-snug text-ink-900">{item.title}</p>
                          {item.subtitle ? (
                            <p className="text-sm leading-snug text-ink-500">{item.subtitle}</p>
                          ) : null}
                          {item.period ? (
                            <p className="mt-0.5 text-xs text-ink-400">{item.period}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
