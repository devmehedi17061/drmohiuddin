import type { VideoKind } from "./youtube";

export type { Role } from "./auth/jwt";
export type { VideoKind };

export interface Service {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  icon: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: number;
}

export interface Stat {
  id: number;
  label: string;
  value: string;
  suffix: string | null;
  icon: string | null;
  sort_order: number;
  is_active: number;
}

export type CredentialKind = "degree" | "experience" | "membership" | "award";

export interface Credential {
  id: number;
  kind: CredentialKind;
  title: string;
  subtitle: string | null;
  period: string | null;
  sort_order: number;
  is_active: number;
}

export interface Chamber {
  id: number;
  name: string;
  address: string | null;
  days_text: string | null;
  time_text: string | null;
  phone: string | null;
  map_url: string | null;
  sort_order: number;
  is_active: number;
}

export interface GalleryImage {
  id: number;
  file_path: string;
  alt_text: string;
  caption: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
  is_active: number;
}

export interface VideoItem {
  id: number;
  kind: VideoKind;
  youtube_key: string;
  title: string | null;
  source_url: string | null;
  thumb_url: string | null;
  sort_order: number;
  is_active: number;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
  is_active: number;
}

export type TestimonialSource = "manual" | "google";

export interface Testimonial {
  id: number;
  patient_name: string;
  location: string | null;
  rating: number;
  source: TestimonialSource;
  source_url: string | null;
  message: string;
  sort_order: number;
  is_active: number;
}

export type AppointmentStatus = "new" | "contacted" | "confirmed" | "cancelled";

export interface Appointment {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  chamber_id: number | null;
  chamber_name?: string | null;
  preferred_date: string | null;
  message: string | null;
  status: AppointmentStatus;
  created_at: string;
}

export type SettingsMap = Record<string, string>;
