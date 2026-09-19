import type { Metadata } from "next";
import { getLandingPageData, getSettings } from "@/lib/data/content";
import { jsonLd } from "@/lib/jsonld";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { StatsBar } from "@/components/site/StatsBar";
import { About } from "@/components/site/About";
import { Services } from "@/components/site/Services";
import { Chambers } from "@/components/site/Chambers";
import { SectionHeading } from "@/components/site/SectionHeading";
import { PhotoGallery } from "@/components/site/PhotoGallery";
import { VideoGallery } from "@/components/site/VideoGallery";
import { Testimonials } from "@/components/site/Testimonials";
import { Contact } from "@/components/site/Contact";
import { Faq } from "@/components/site/Faq";
import { Footer } from "@/components/site/Footer";
import { FloatingActions } from "@/components/site/FloatingActions";

/** Rebuilt at most once a minute; admin edits call revalidatePath("/") for an instant refresh. */
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: settings.seo_title || settings.site_name,
    description: settings.seo_description,
    openGraph: {
      title: settings.seo_title || settings.site_name,
      description: settings.seo_description,
      type: "profile",
      locale: "bn_BD",
      images: settings.hero_image ? [{ url: settings.hero_image }] : undefined,
    },
  };
}

export default async function HomePage() {
  const { settings, services, stats, credentials, chambers, gallery, videos, faqs, testimonials } =
    await getLandingPageData();

  const physicianLd = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: settings.hero_name || settings.site_name,
    medicalSpecialty: "Urology",
    description: settings.seo_description,
    telephone: settings.contact_phone || undefined,
    email: settings.contact_email || undefined,
    url: process.env.NEXT_PUBLIC_SITE_URL,
    address: chambers.map((chamber) => ({
      "@type": "PostalAddress",
      name: chamber.name,
      streetAddress: chamber.address ?? undefined,
    })),
  };

  return (
    <>
      <Header
        siteName={settings.site_name}
        tagline={settings.site_tagline}
        phone={settings.contact_phone}
        logo={settings.site_logo}
      />

      <main>
        <Hero settings={settings} />
        <StatsBar stats={stats} />
        <About settings={settings} credentials={credentials} />
        <Services settings={settings} services={services} />
        <Chambers settings={settings} chambers={chambers} />

        {gallery.length ? (
          <section id="gallery" className="bg-surface-muted py-16 lg:py-24">
            <div className="container-page">
              <SectionHeading
                eyebrow="গ্যালারি"
                title={settings.gallery_title || "ফটো গ্যালারি"}
                subtitle={settings.gallery_subtitle}
              />
              <div className="mt-12">
                <PhotoGallery images={gallery} />
              </div>
            </div>
          </section>
        ) : null}

        {videos.length ? (
          <section id="videos" className="py-16 lg:py-24">
            <div className="container-page">
              <SectionHeading
                eyebrow="ভিডিও"
                title={settings.video_title || "ভিডিও গ্যালারি"}
                subtitle={settings.video_subtitle}
              />
              <div className="mt-12">
                <VideoGallery videos={videos} />
              </div>
            </div>
          </section>
        ) : null}

        <Testimonials settings={settings} testimonials={testimonials} />
        <Contact settings={settings} chambers={chambers} />
        <Faq settings={settings} faqs={faqs} />
      </main>

      <Footer settings={settings} services={services} />

      <FloatingActions
        phone={settings.contact_phone}
        whatsapp={settings.contact_whatsapp}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(physicianLd) }}
      />
    </>
  );
}
