import { Plus } from "lucide-react";
import type { Faq as FaqType, SettingsMap } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";
import { jsonLd } from "@/lib/jsonld";

/**
 * Native <details> accordion - keyboard accessible and works without JavaScript.
 * Also emits FAQPage structured data so the questions can surface in search results.
 */
export function Faq({ settings, faqs }: { settings: SettingsMap; faqs: FaqType[] }) {
  if (!faqs.length) return null;

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <section id="faq" className="bg-surface-muted py-16 lg:py-24">
      <div className="container-page">
        <SectionHeading
          eyebrow="জিজ্ঞাসা"
          title={settings.faq_title || "সচরাচর জিজ্ঞাসা"}
          subtitle={settings.faq_subtitle}
        />

        <div className="mx-auto mt-12 max-w-3xl space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              name="faq"
              className="group overflow-hidden rounded-card border border-line bg-white shadow-soft open:shadow-lift"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left font-semibold text-ink-900 transition-colors hover:text-brand-700 [&::-webkit-details-marker]:hidden">
                <span>{faq.question}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 transition-transform duration-300 group-open:rotate-45 group-open:bg-brand-600 group-open:text-white">
                  <Plus className="size-4" aria-hidden="true" />
                </span>
              </summary>

              <div className="border-t border-line px-6 py-5 leading-relaxed text-ink-700">
                {faq.answer.split(/\n{2,}/).map((paragraph, i) => (
                  <p key={i} className={i > 0 ? "mt-3" : undefined}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqLd) }}
      />
    </section>
  );
}
