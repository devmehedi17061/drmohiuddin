import "server-only";
import { cache } from "react";
import { query } from "@/lib/db";
import type {
  Chamber,
  Credential,
  Faq,
  GalleryImage,
  Service,
  SettingsMap,
  Stat,
  Testimonial,
  VideoItem,
} from "@/lib/types";

/**
 * Fallbacks used when a settings row is missing, so the site always renders -
 * even on a fresh database. The seed script writes these same values.
 */
export const SETTING_DEFAULTS: SettingsMap = {
  site_name: "ডা. মহিউদ্দিন",
  site_tagline: "ইউরোলজি ও কিডনি রোগ বিশেষজ্ঞ",
  site_logo: "",
  seo_title: "ডা. মহিউদ্দিন — ইউরোলজি ও কিডনি রোগ বিশেষজ্ঞ",
  seo_description:
    "ইউরোলজি, কিডনি ও প্রস্রাবজনিত রোগের অভিজ্ঞ চিকিৎসক। অ্যাপয়েন্টমেন্ট নিতে আজই যোগাযোগ করুন।",

  hero_eyebrow: "বিশেষজ্ঞ ইউরোলজিস্ট",
  hero_name: "ডা. মহিউদ্দিন",
  hero_degrees: "MBBS, BCS (স্বাস্থ্য), MS (ইউরোলজি)",
  hero_designation: "সহকারী অধ্যাপক, ইউরোলজি বিভাগ",
  hero_workplace: "[প্রতিষ্ঠানের নাম এখানে বসবে]",
  hero_summary:
    "কিডনি, মূত্রথলি ও প্রস্রাবজনিত জটিল রোগের আধুনিক ও নিরাপদ চিকিৎসা। রোগীর সুস্থতাই আমাদের অগ্রাধিকার।",
  hero_image: "",
  hero_primary_cta: "অ্যাপয়েন্টমেন্ট নিন",
  hero_secondary_cta: "সরাসরি কল করুন",

  about_title: "ডাক্তার সম্পর্কে",
  about_body:
    "[এখানে ডাক্তারের সংক্ষিপ্ত পরিচিতি লিখুন — অ্যাডমিন প্যানেল থেকে যেকোনো সময় পরিবর্তন করা যাবে।]",
  about_image: "",

  services_title: "চিকিৎসা সেবাসমূহ",
  services_subtitle: "যেসব রোগের চিকিৎসা করা হয়",

  gallery_title: "ফটো গ্যালারি",
  gallery_subtitle: "চেম্বার, সেমিনার ও পেশাগত মুহূর্ত",

  video_title: "ভিডিও গ্যালারি",
  video_subtitle: "স্বাস্থ্য বিষয়ক পরামর্শ ও আলোচনা",

  faq_title: "সচরাচর জিজ্ঞাসা",
  faq_subtitle: "রোগীদের সাধারণ প্রশ্নের উত্তর",

  chamber_title: "চেম্বার ও সময়সূচি",
  chamber_subtitle: "যেখানে রোগী দেখা হয়",

  testimonial_title: "রোগীদের মতামত",
  testimonial_subtitle: "",

  contact_title: "অ্যাপয়েন্টমেন্ট নিন",
  contact_subtitle: "ফর্মটি পূরণ করুন, আমরা যোগাযোগ করব।",

  contact_phone: "+8801XXXXXXXXX",
  contact_whatsapp: "+8801XXXXXXXXX",
  contact_email: "info@example.com",
  contact_address: "[চেম্বারের ঠিকানা]",

  social_facebook: "",
  social_youtube: "",
  social_instagram: "",
  social_linkedin: "",

  footer_note: "সকল অধিকার সংরক্ষিত।",
};

/**
 * `next build` prerenders the landing page, and that needs the database. Without
 * this, a build machine with no DATABASE_URL (or a paused / unreachable
 * Supabase project) aborts the whole deployment with "Error occurred
 * prerendering page '/'". During the build phase only, a failed query falls
 * back to defaults / an empty list so the deploy goes through; the page
 * revalidates every 60s at runtime, where the real data comes through. At
 * runtime the error still propagates, so a broken database is never silently
 * masked as "empty content".
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

async function buildSafe<T>(label: string, fallback: T, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isBuildPhase()) throw err;
    console.warn(
      `[content] ${label}: database unavailable during build, prerendering with fallback data -`,
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}

export const getSettings = cache(async (): Promise<SettingsMap> => {
  const rows = await buildSafe("settings", [], () =>
    query<{ key: string; value: string | null }>("SELECT `key`, `value` FROM settings"),
  );
  const map: SettingsMap = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    if (row.value !== null && row.value !== "") map[row.key] = row.value;
    else if (!(row.key in map)) map[row.key] = "";
  }
  return map;
});

export const getServices = cache(async (): Promise<Service[]> =>
  buildSafe("services", [], () =>
    query<Service>("SELECT * FROM services WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"),
  ),
);

export const getStats = cache(async (): Promise<Stat[]> =>
  buildSafe("stats", [], () =>
    query<Stat>("SELECT * FROM stats WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"),
  ),
);

export const getCredentials = cache(async (): Promise<Credential[]> =>
  buildSafe("credentials", [], () =>
    query<Credential>(
      "SELECT * FROM credentials WHERE is_active = 1 ORDER BY kind ASC, sort_order ASC, id ASC",
    ),
  ),
);

export const getChambers = cache(async (): Promise<Chamber[]> =>
  buildSafe("chambers", [], () =>
    query<Chamber>("SELECT * FROM chambers WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"),
  ),
);

export const getGallery = cache(async (limit = 60): Promise<GalleryImage[]> =>
  buildSafe("gallery", [], () =>
    query<GalleryImage>(
      `SELECT * FROM gallery_images WHERE is_active = 1
       ORDER BY sort_order ASC, id DESC LIMIT ${Math.max(1, Math.min(200, Math.trunc(limit)))}`,
    ),
  ),
);

export const getVideos = cache(async (): Promise<VideoItem[]> =>
  buildSafe("videos", [], () =>
    query<VideoItem>("SELECT * FROM videos WHERE is_active = 1 ORDER BY sort_order ASC, id DESC"),
  ),
);

export const getFaqs = cache(async (): Promise<Faq[]> =>
  buildSafe("faqs", [], () =>
    query<Faq>("SELECT * FROM faqs WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"),
  ),
);

export const getTestimonials = cache(async (): Promise<Testimonial[]> =>
  buildSafe("testimonials", [], () =>
    query<Testimonial>(
      "SELECT * FROM testimonials WHERE is_active = 1 ORDER BY sort_order ASC, id ASC",
    ),
  ),
);

/** Everything the landing page needs, fetched in parallel. */
export async function getLandingPageData() {
  const [settings, services, stats, credentials, chambers, gallery, videos, faqs, testimonials] =
    await Promise.all([
      getSettings(),
      getServices(),
      getStats(),
      getCredentials(),
      getChambers(),
      getGallery(24),
      getVideos(),
      getFaqs(),
      getTestimonials(),
    ]);
  return { settings, services, stats, credentials, chambers, gallery, videos, faqs, testimonials };
}
