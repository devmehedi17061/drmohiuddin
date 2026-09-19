/**
 * Seeds the first admin account and placeholder site content into whatever
 * Postgres database DATABASE_URL points at. Safe to re-run: every insert is
 * idempotent and existing rows are left alone.
 *
 * Usage: npm run db:seed
 *
 * NOTE: the site content below is deliberately placeholder text, in Bengali -
 * matching the public site's language. Real names, degrees, chamber times and
 * statistics are meant to be entered from the (English) admin panel. No
 * testimonials are seeded - patient reviews should only ever be real ones.
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import { loadEnv } from "./env.mjs";

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error(
    "✖ DATABASE_URL is not set. Copy it from Supabase → Project Settings → Database → " +
      "Connection string (URI) into .env.local first.",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
});
await client.connect();

const SETTINGS = {
  general: {
    site_name: "ডা. মহিউদ্দিন",
    site_tagline: "ইউরোলজি ও কিডনি রোগ বিশেষজ্ঞ",
    site_logo: "",
    seo_title: "ডা. মহিউদ্দিন — ইউরোলজি ও কিডনি রোগ বিশেষজ্ঞ",
    seo_description:
      "ইউরোলজি, কিডনি ও প্রস্রাবজনিত রোগের অভিজ্ঞ চিকিৎসক। অ্যাপয়েন্টমেন্ট নিতে আজই যোগাযোগ করুন।",
    footer_note: "সকল অধিকার সংরক্ষিত।",
  },
  hero: {
    hero_eyebrow: "বিশেষজ্ঞ ইউরোলজিস্ট",
    hero_name: "ডা. মহিউদ্দিন",
    hero_degrees: "[ডিগ্রি এখানে লিখুন — যেমন MBBS, BCS, MS (Urology)]",
    hero_designation: "[পদবি এখানে লিখুন]",
    hero_workplace: "[প্রতিষ্ঠানের নাম এখানে লিখুন]",
    hero_summary:
      "কিডনি, মূত্রথলি ও প্রস্রাবজনিত জটিল রোগের আধুনিক ও নিরাপদ চিকিৎসা। রোগীর সুস্থতাই আমাদের অগ্রাধিকার।",
    hero_image: "",
    hero_primary_cta: "অ্যাপয়েন্টমেন্ট নিন",
    hero_secondary_cta: "সরাসরি কল করুন",
  },
  about: {
    about_title: "ডাক্তার সম্পর্কে",
    about_body:
      "[এখানে ডাক্তারের সংক্ষিপ্ত পরিচিতি লিখুন। অ্যাডমিন প্যানেল → সাইট সেটিংস থেকে যেকোনো সময় পরিবর্তন করা যাবে।]",
    about_image: "",
  },
  sections: {
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
  },
  contact: {
    contact_phone: "+8801XXXXXXXXX",
    contact_whatsapp: "+8801XXXXXXXXX",
    contact_email: "info@example.com",
    contact_address: "[চেম্বারের ঠিকানা এখানে লিখুন]",
  },
  social: {
    social_facebook: "",
    social_youtube: "",
    social_instagram: "",
    social_linkedin: "",
  },
};

const SERVICES = [
  {
    title: "কিডনি ও মূত্রথলির পাথর",
    slug: "kidney-bladder-stone",
    icon: "gem",
    summary: "কিডনি, ইউরেটার ও মূত্রথলির পাথরের আধুনিক চিকিৎসা — PCNL, URS ও লেজার লিথোট্রিপসি।",
  },
  {
    title: "প্রোস্টেট সমস্যা",
    slug: "prostate",
    icon: "activity",
    summary: "প্রোস্টেট বড় হওয়া (BPH), প্রস্রাব আটকে যাওয়া ও প্রোস্টেট সংক্রান্ত জটিলতার চিকিৎসা।",
  },
  {
    title: "প্রস্রাবে সংক্রমণ",
    slug: "uti",
    icon: "shield",
    summary: "বারবার প্রস্রাবে ইনফেকশন, জ্বালাপোড়া ও প্রস্রাবের সাথে রক্ত যাওয়ার চিকিৎসা।",
  },
  {
    title: "পুরুষ বন্ধ্যাত্ব ও যৌন স্বাস্থ্য",
    slug: "male-infertility",
    icon: "heart-pulse",
    summary: "পুরুষ বন্ধ্যাত্ব, ভ্যারিকোসিল ও যৌন স্বাস্থ্য সংক্রান্ত সমস্যার গোপনীয় পরামর্শ।",
  },
  {
    title: "ইউরোলজিক্যাল ক্যান্সার",
    slug: "urologic-cancer",
    icon: "microscope",
    summary: "কিডনি, মূত্রথলি ও প্রোস্টেট ক্যান্সারের প্রাথমিক শনাক্তকরণ ও সার্জিক্যাল ব্যবস্থাপনা।",
  },
  {
    title: "এন্ডোস্কোপিক ও ল্যাপারোস্কোপিক সার্জারি",
    slug: "endoscopic-surgery",
    icon: "stethoscope",
    summary: "কম কাটাছেঁড়ায় দ্রুত সুস্থতা — TURP, URS, PCNL ও ল্যাপারোস্কোপিক ইউরোলজি সার্জারি।",
  },
];

// Values start at 0 on purpose - real figures must be entered from the admin panel.
const STATS = [
  { label: "সফল সার্জারি", value: "0", suffix: "+", icon: "stethoscope" },
  { label: "বছরের অভিজ্ঞতা", value: "0", suffix: "+", icon: "calendar" },
  { label: "সেবা পাওয়া রোগী", value: "0", suffix: "+", icon: "users" },
  { label: "চেম্বার", value: "0", suffix: "", icon: "map-pin" },
];

const CREDENTIALS = [
  { kind: "degree", title: "[ডিগ্রি ১ — যেমন MBBS]", subtitle: "[প্রতিষ্ঠানের নাম]", period: "" },
  { kind: "degree", title: "[ডিগ্রি ২ — যেমন MS (Urology)]", subtitle: "[প্রতিষ্ঠানের নাম]", period: "" },
  { kind: "experience", title: "[বর্তমান পদবি]", subtitle: "[কর্মস্থলের নাম]", period: "[সাল]" },
  { kind: "membership", title: "[সদস্যপদ — যেমন BAUS]", subtitle: "", period: "" },
];

const CHAMBERS = [
  {
    name: "[চেম্বার ১ এর নাম]",
    address: "[ঠিকানা]",
    days_text: "শনি – বৃহস্পতি",
    time_text: "বিকাল ৫টা – রাত ৯টা",
    phone: "+8801XXXXXXXXX",
  },
  {
    name: "[চেম্বার ২ এর নাম]",
    address: "[ঠিকানা]",
    days_text: "শুক্রবার",
    time_text: "সকাল ১০টা – দুপুর ২টা",
    phone: "+8801XXXXXXXXX",
  },
];

const FAQS = [
  {
    question: "অ্যাপয়েন্টমেন্ট কীভাবে নেব?",
    answer:
      "ওয়েবসাইটের অ্যাপয়েন্টমেন্ট ফর্ম পূরণ করে অথবা চেম্বারের ফোন নম্বরে সরাসরি কল করে সিরিয়াল নেওয়া যাবে।",
  },
  {
    question: "প্রথমবার আসার সময় কী কী কাগজপত্র আনতে হবে?",
    answer:
      "আগের সব প্রেসক্রিপশন, রিপোর্ট (আলট্রাসনোগ্রাম, রক্ত ও প্রস্রাব পরীক্ষা, সিটি স্ক্যান) এবং বর্তমানে যেসব ওষুধ খাচ্ছেন তার তালিকা সঙ্গে আনবেন।",
  },
  {
    question: "কিডনিতে পাথর হলে কি সবসময় অপারেশন লাগে?",
    answer:
      "না। পাথরের আকার, অবস্থান ও উপসর্গের উপর নির্ভর করে চিকিৎসা ঠিক করা হয়। ছোট পাথর অনেক সময় ওষুধ ও পর্যাপ্ত পানি পানেই বেরিয়ে যায়। বড় পাথরের ক্ষেত্রে এন্ডোস্কোপিক পদ্ধতি প্রয়োজন হতে পারে।",
  },
  {
    question: "প্রস্রাবে জ্বালাপোড়া হলে কখন ডাক্তার দেখাব?",
    answer:
      "জ্বালাপোড়ার সঙ্গে জ্বর, কোমরে ব্যথা, প্রস্রাবে রক্ত বা বারবার সমস্যা ফিরে এলে দেরি না করে বিশেষজ্ঞ চিকিৎসকের পরামর্শ নিন।",
  },
  {
    question: "অপারেশনের পর কতদিন বিশ্রাম লাগে?",
    answer:
      "এন্ডোস্কোপিক পদ্ধতিতে সাধারণত অল্প সময়েই স্বাভাবিক কাজে ফেরা যায়। তবে সঠিক সময়সীমা রোগ ও রোগীর অবস্থাভেদে ভিন্ন হয় — চিকিৎসকের পরামর্শই চূড়ান্ত।",
  },
  {
    question: "অনলাইনে বা ফোনে পরামর্শ নেওয়া যাবে কি?",
    answer:
      "ফলোআপ রোগীদের জন্য সীমিত পরিসরে ফোনে পরামর্শের সুযোগ আছে। নতুন রোগীর ক্ষেত্রে সরাসরি চেম্বারে এসে পরীক্ষা করানো প্রয়োজন।",
  },
];

async function seedSettings() {
  let count = 0;
  for (const [group, entries] of Object.entries(SETTINGS)) {
    for (const [key, value] of Object.entries(entries)) {
      await client.query(
        "INSERT INTO settings (key, value, group_name) VALUES ($1, $2, $3) ON CONFLICT (key) DO NOTHING",
        [key, value, group],
      );
      count++;
    }
  }
  return count;
}

async function seedTable(table, columns, rows, uniqueColumn) {
  let inserted = 0;
  for (const [i, row] of rows.entries()) {
    if (uniqueColumn) {
      const { rows: existing } = await client.query(
        `SELECT id FROM ${table} WHERE ${uniqueColumn} = $1 LIMIT 1`,
        [row[columns.indexOf(uniqueColumn)]],
      );
      if (existing.length) continue;
    }
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")}, sort_order) VALUES (${placeholders}, $${columns.length + 1})`,
      [...row, i + 1],
    );
    inserted++;
  }
  return inserted;
}

async function seedAdmin() {
  const name = process.env.ADMIN_NAME || "Site Admin";
  const email = (process.env.ADMIN_EMAIL || "admin@drmohiuddin.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (password.length < 8) {
    console.error("✖ ADMIN_PASSWORD must be at least 8 characters. Set it in .env.local.");
    process.exitCode = 1;
    return null;
  }

  const { rows: existing } = await client.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
  if (existing.length) return { email, created: false };

  const hash = await bcrypt.hash(password, 12);
  await client.query(
    "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ($1, $2, $3, 'ADMIN', 1)",
    [name, email, hash],
  );
  return { email, created: true };
}

try {
  const settingsCount = await seedSettings();
  const services = await seedTable(
    "services",
    ["title", "slug", "summary", "icon"],
    SERVICES.map((s) => [s.title, s.slug, s.summary, s.icon]),
    "slug",
  );
  const stats = await seedTable(
    "stats",
    ["label", "value", "suffix", "icon"],
    STATS.map((s) => [s.label, s.value, s.suffix, s.icon]),
    "label",
  );
  const credentials = await seedTable(
    "credentials",
    ["kind", "title", "subtitle", "period"],
    CREDENTIALS.map((c) => [c.kind, c.title, c.subtitle, c.period]),
    "title",
  );
  const chambers = await seedTable(
    "chambers",
    ["name", "address", "days_text", "time_text", "phone"],
    CHAMBERS.map((c) => [c.name, c.address, c.days_text, c.time_text, c.phone]),
    "name",
  );
  const faqs = await seedTable(
    "faqs",
    ["question", "answer"],
    FAQS.map((f) => [f.question, f.answer]),
    "question",
  );
  const admin = await seedAdmin();

  console.log("✔ Seed complete");
  console.log(`  settings   : ${settingsCount} keys ensured`);
  console.log(`  services   : ${services} new`);
  console.log(`  stats      : ${stats} new`);
  console.log(`  credentials: ${credentials} new`);
  console.log(`  chambers   : ${chambers} new`);
  console.log(`  faqs       : ${faqs} new`);
  if (admin) {
    console.log(
      admin.created
        ? `  admin      : created ${admin.email}`
        : `  admin      : ${admin.email} already exists (unchanged)`,
    );
  }
  console.log("\n  Log in at /admin-panel and replace every [bracketed] placeholder.");
} catch (err) {
  console.error("✖ Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
