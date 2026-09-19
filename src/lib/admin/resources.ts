import type { Resource as PermissionResource } from "@/lib/auth/rbac";

/**
 * Declarative definitions for the CRUD sections of the admin panel.
 *
 * Table and column names are taken *only* from this file - the generic server
 * actions never accept an identifier from the client, so no request can reach a
 * table that is not listed here.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "url"
  | "number"
  | "date"
  | "select"
  | "icon"
  | "image"
  | "rating";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  rows?: number;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  /** Upload subfolder for `image` fields. */
  folder?: string;
  /** Half-width in the two-column form grid. */
  half?: boolean;
}

export interface ListColumn {
  name: string;
  label: string;
  type?: "text" | "image" | "badge" | "muted";
}

export interface ResourceConfig {
  key: string;
  table: string;
  permission: PermissionResource;
  label: string;
  singular: string;
  description: string;
  fields: FieldDef[];
  listColumns: ListColumn[];
  /** Derive `slug` from this field when the table has one. */
  slugFrom?: string;
  emptyHint: string;
}

const ICON_HELP = "Icon shown on the card.";

export const RESOURCES = {
  services: {
    key: "services",
    table: "services",
    permission: "services",
    label: "Services",
    singular: "service",
    description: "The cards in the landing page's \"Services\" section.",
    slugFrom: "title",
    fields: [
      { name: "title", label: "Service Name", type: "text", required: true, max: 160 },
      { name: "icon", label: "Icon", type: "icon", help: ICON_HELP, half: true },
      {
        name: "image_path",
        label: "Image (optional)",
        type: "image",
        folder: "services",
        half: true,
      },
      {
        name: "summary",
        label: "Short Summary",
        type: "textarea",
        rows: 3,
        max: 500,
        placeholder: "Two or three lines shown on the card…",
      },
      { name: "body", label: "Details (optional)", type: "textarea", rows: 5 },
    ],
    listColumns: [
      { name: "image_path", label: "", type: "image" },
      { name: "title", label: "Service Name" },
      { name: "summary", label: "Summary", type: "muted" },
    ],
    emptyHint: "No services have been added yet.",
  },

  stats: {
    key: "stats",
    table: "stats",
    permission: "stats",
    label: "Statistics",
    singular: "statistic",
    description: "The numbers shown below the hero section. Use real figures only.",
    fields: [
      { name: "label", label: "Label", type: "text", required: true, max: 120 },
      { name: "value", label: "Value", type: "text", required: true, max: 40, half: true },
      {
        name: "suffix",
        label: "Suffix",
        type: "text",
        max: 20,
        placeholder: "+",
        half: true,
      },
      { name: "icon", label: "Icon", type: "icon", help: ICON_HELP },
    ],
    listColumns: [
      { name: "value", label: "Value", type: "badge" },
      { name: "label", label: "Label" },
    ],
    emptyHint: "No statistics yet.",
  },

  credentials: {
    key: "credentials",
    table: "credentials",
    permission: "credentials",
    label: "Credentials & Experience",
    singular: "entry",
    description: "The degrees, experience and memberships shown in the \"About\" section.",
    fields: [
      {
        name: "kind",
        label: "Type",
        type: "select",
        required: true,
        half: true,
        options: [
          { value: "degree", label: "Degree" },
          { value: "experience", label: "Experience" },
          { value: "membership", label: "Membership" },
          { value: "award", label: "Award" },
        ],
      },
      { name: "period", label: "Period", type: "text", max: 80, half: true },
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      { name: "subtitle", label: "Institution / Details", type: "text", max: 255 },
    ],
    listColumns: [
      { name: "kind", label: "Type", type: "badge" },
      { name: "title", label: "Title" },
      { name: "subtitle", label: "Institution", type: "muted" },
    ],
    emptyHint: "No credentials have been added yet.",
  },

  chambers: {
    key: "chambers",
    table: "chambers",
    permission: "chambers",
    label: "Chambers",
    singular: "chamber",
    description: "Chamber address, days and hours. These also appear in the appointment form.",
    fields: [
      { name: "name", label: "Chamber Name", type: "text", required: true, max: 160 },
      { name: "address", label: "Address", type: "textarea", rows: 2, max: 400 },
      { name: "days_text", label: "Days", type: "text", max: 160, half: true, placeholder: "Sat – Thu" },
      { name: "time_text", label: "Hours", type: "text", max: 160, half: true, placeholder: "5 PM – 9 PM" },
      { name: "phone", label: "Phone Number", type: "text", max: 80, half: true },
      {
        name: "map_url",
        label: "Google Maps Link",
        type: "url",
        max: 500,
        half: true,
        placeholder: "https://maps.app.goo.gl/…",
      },
    ],
    listColumns: [
      { name: "name", label: "Chamber" },
      { name: "days_text", label: "Days", type: "muted" },
      { name: "time_text", label: "Hours", type: "muted" },
    ],
    emptyHint: "No chambers have been added yet.",
  },

  faqs: {
    key: "faqs",
    table: "faqs",
    permission: "faqs",
    label: "FAQs",
    singular: "question",
    description: "The FAQ section shown just above the footer.",
    fields: [
      { name: "question", label: "Question", type: "text", required: true, max: 400 },
      { name: "answer", label: "Answer", type: "textarea", required: true, rows: 5 },
    ],
    listColumns: [
      { name: "question", label: "Question" },
      { name: "answer", label: "Answer", type: "muted" },
    ],
    emptyHint: "No questions have been added yet.",
  },

  testimonials: {
    key: "testimonials",
    table: "testimonials",
    permission: "testimonials",
    label: "Testimonials",
    singular: "testimonial",
    description: "Only add testimonials with the real patient's permission.",
    fields: [
      { name: "patient_name", label: "Patient Name", type: "text", required: true, max: 160, half: true },
      { name: "location", label: "Location", type: "text", max: 160, half: true },
      { name: "rating", label: "Rating", type: "rating", required: true, half: true },
      {
        name: "source",
        label: "Source",
        type: "select",
        required: true,
        half: true,
        options: [
          { value: "manual", label: "Written manually" },
          { value: "google", label: "Google Review" },
        ],
      },
      {
        name: "source_url",
        label: "Google Review Link",
        type: "url",
        placeholder: "https://g.co/kgs/… or a Maps review link",
        help: "If the source is \"Google Review\", add a link to the original review — the card will show a Google badge that links there. Optional.",
      },
      { name: "message", label: "Testimonial", type: "textarea", required: true, rows: 4 },
    ],
    listColumns: [
      { name: "patient_name", label: "Name" },
      { name: "source", label: "Source", type: "badge" },
      { name: "rating", label: "Rating", type: "badge" },
      { name: "message", label: "Testimonial", type: "muted" },
    ],
    emptyHint: "No testimonials have been added yet.",
  },
} as const satisfies Record<string, ResourceConfig>;

export type ResourceKey = keyof typeof RESOURCES;

export const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];

export function isResourceKey(value: string): value is ResourceKey {
  return Object.prototype.hasOwnProperty.call(RESOURCES, value);
}

export function getResource(key: string): ResourceConfig {
  if (!isResourceKey(key)) throw new Error(`Unknown resource: ${key}`);
  return RESOURCES[key] as ResourceConfig;
}

/** Human labels for the enum-ish values shown as badges in list rows. */
export const BADGE_LABELS: Record<string, string> = {
  degree: "Degree",
  experience: "Experience",
  membership: "Membership",
  award: "Award",
  manual: "Manual",
  google: "Google Review",
};
