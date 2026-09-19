export type SettingType = "text" | "textarea" | "image" | "url" | "tel" | "email";

export interface SettingField {
  key: string;
  label: string;
  type: SettingType;
  rows?: number;
  placeholder?: string;
  help?: string;
  half?: boolean;
}

export interface SettingGroup {
  id: string;
  title: string;
  description: string;
  fields: SettingField[];
}

/**
 * The complete whitelist of editable settings keys. `saveSettings` will not write
 * any key that is absent from this list.
 */
export const SETTING_GROUPS: SettingGroup[] = [
  {
    id: "general",
    title: "General",
    description: "The site name and the information shown in search engines.",
    fields: [
      { key: "site_name", label: "Site Name", type: "text", half: true },
      { key: "site_tagline", label: "Tagline", type: "text", half: true },
      {
        key: "site_logo",
        label: "Logo",
        type: "image",
        help: "Shown in the header, footer, login page and admin panel. If not set, the first letter of the name is shown instead. A transparent PNG works best.",
      },
      { key: "seo_title", label: "SEO Title", type: "text", help: "The title shown in Google search results." },
      { key: "seo_description", label: "SEO Description", type: "textarea", rows: 2 },
      { key: "footer_note", label: "Footer Note", type: "text" },
    ],
  },
  {
    id: "hero",
    title: "Hero Section",
    description: "The very top section of the site.",
    fields: [
      { key: "hero_eyebrow", label: "Small Badge Text", type: "text", half: true },
      { key: "hero_name", label: "Doctor's Name", type: "text", half: true },
      { key: "hero_degrees", label: "Degrees", type: "text" },
      { key: "hero_designation", label: "Designation", type: "text", half: true },
      { key: "hero_workplace", label: "Workplace", type: "text", half: true },
      { key: "hero_summary", label: "Short Summary", type: "textarea", rows: 3 },
      { key: "hero_image", label: "Doctor's Photo", type: "image" },
      { key: "hero_primary_cta", label: "Primary Button Text", type: "text", half: true },
      { key: "hero_secondary_cta", label: "Secondary Button Text", type: "text", half: true },
    ],
  },
  {
    id: "about",
    title: "About Section",
    description: "The text and photo in the \"About the Doctor\" section.",
    fields: [
      { key: "about_title", label: "Title", type: "text" },
      {
        key: "about_body",
        label: "Body",
        type: "textarea",
        rows: 7,
        help: "Press Enter twice to start a new paragraph.",
      },
      { key: "about_image", label: "Photo", type: "image" },
    ],
  },
  {
    id: "sections",
    title: "Section Headings",
    description: "The title and subtitle shown above each section.",
    fields: [
      { key: "services_title", label: "Services — Title", type: "text", half: true },
      { key: "services_subtitle", label: "Services — Subtitle", type: "text", half: true },
      { key: "chamber_title", label: "Chambers — Title", type: "text", half: true },
      { key: "chamber_subtitle", label: "Chambers — Subtitle", type: "text", half: true },
      { key: "gallery_title", label: "Gallery — Title", type: "text", half: true },
      { key: "gallery_subtitle", label: "Gallery — Subtitle", type: "text", half: true },
      { key: "video_title", label: "Videos — Title", type: "text", half: true },
      { key: "video_subtitle", label: "Videos — Subtitle", type: "text", half: true },
      { key: "testimonial_title", label: "Testimonials — Title", type: "text", half: true },
      { key: "testimonial_subtitle", label: "Testimonials — Subtitle", type: "text", half: true },
      { key: "contact_title", label: "Contact — Title", type: "text", half: true },
      { key: "contact_subtitle", label: "Contact — Subtitle", type: "text", half: true },
      { key: "faq_title", label: "FAQ — Title", type: "text", half: true },
      { key: "faq_subtitle", label: "FAQ — Subtitle", type: "text", half: true },
    ],
  },
  {
    id: "contact",
    title: "Contact Information",
    description: "Phone, WhatsApp and address — used in the header, footer and floating buttons.",
    fields: [
      { key: "contact_phone", label: "Phone Number", type: "tel", half: true, placeholder: "+8801XXXXXXXXX" },
      {
        key: "contact_whatsapp",
        label: "WhatsApp Number",
        type: "tel",
        half: true,
        placeholder: "+8801XXXXXXXXX",
      },
      { key: "contact_email", label: "Email", type: "email", half: true },
      { key: "contact_address", label: "Address", type: "textarea", rows: 2, half: true },
    ],
  },
  {
    id: "social",
    title: "Social Media",
    description: "Leave a field empty to hide that icon in the footer.",
    fields: [
      { key: "social_facebook", label: "Facebook", type: "url", half: true },
      { key: "social_youtube", label: "YouTube", type: "url", half: true },
      { key: "social_instagram", label: "Instagram", type: "url", half: true },
      { key: "social_linkedin", label: "LinkedIn", type: "url", half: true },
    ],
  },
];

const KEY_INDEX = new Map<string, SettingField>();
for (const group of SETTING_GROUPS) {
  for (const field of group.fields) KEY_INDEX.set(field.key, field);
}

export function settingField(key: string): SettingField | undefined {
  return KEY_INDEX.get(key);
}

export const SETTING_KEYS = [...KEY_INDEX.keys()];

export function groupOf(key: string): string {
  return SETTING_GROUPS.find((g) => g.fields.some((f) => f.key === key))?.id ?? "general";
}
