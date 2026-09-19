import { can, type Resource, type Role } from "@/lib/auth/rbac";

export interface NavItem {
  href: string;
  label: string;
  /** Key into ADMIN_NAV_ICONS in the shell component. */
  icon: string;
  /** Permission needed to see the entry; undefined means always visible. */
  resource?: Resource;
  /** Only ADMIN may open it, regardless of the matrix. */
  adminOnly?: boolean;
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin-panel/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin-panel/dashboard/settings", label: "Site Settings", icon: "settings", resource: "settings" },
  { href: "/admin-panel/dashboard/services", label: "Services", icon: "stethoscope", resource: "services" },
  { href: "/admin-panel/dashboard/stats", label: "Statistics", icon: "chart", resource: "stats" },
  { href: "/admin-panel/dashboard/credentials", label: "Credentials & Experience", icon: "graduation", resource: "credentials" },
  { href: "/admin-panel/dashboard/chambers", label: "Chambers", icon: "building", resource: "chambers" },
  { href: "/admin-panel/dashboard/gallery", label: "Photo Gallery", icon: "image", resource: "gallery" },
  { href: "/admin-panel/dashboard/videos", label: "Video Gallery", icon: "video", resource: "videos" },
  { href: "/admin-panel/dashboard/faqs", label: "FAQs", icon: "help", resource: "faqs" },
  { href: "/admin-panel/dashboard/testimonials", label: "Testimonials", icon: "message", resource: "testimonials" },
  { href: "/admin-panel/dashboard/appointments", label: "Appointments", icon: "calendar", resource: "appointments" },
  { href: "/admin-panel/dashboard/users", label: "User Management", icon: "users", resource: "users", adminOnly: true },
  { href: "/admin-panel/dashboard/audit", label: "Activity Log", icon: "log", resource: "audit", adminOnly: true },
];

export function navFor(role: Role): NavItem[] {
  return ADMIN_NAV.filter((item) => {
    if (item.adminOnly && role !== "ADMIN") return false;
    if (!item.resource) return true;
    return can(role, "view", item.resource);
  });
}
