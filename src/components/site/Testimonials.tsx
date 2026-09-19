import type { SettingsMap, Testimonial } from "@/lib/types";
import { TestimonialsSlider } from "./TestimonialsSlider";

export function Testimonials({
  settings,
  testimonials,
}: {
  settings: SettingsMap;
  testimonials: Testimonial[];
}) {
  if (!testimonials.length) return null;

  return (
    <section className="py-16 lg:py-24">
      <div className="container-page">
        <TestimonialsSlider
          eyebrow="রোগীর মতামত"
          title={settings.testimonial_title || "রোগীরা কী বলছেন"}
          subtitle={settings.testimonial_subtitle}
          testimonials={testimonials}
        />
      </div>
    </section>
  );
}
