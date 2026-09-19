export type { Role } from "./jwt";
import type { Role } from "./jwt";

export type Resource =
  | "settings"
  | "services"
  | "stats"
  | "credentials"
  | "chambers"
  | "gallery"
  | "videos"
  | "faqs"
  | "testimonials"
  | "appointments"
  | "users"
  | "audit";

export type Action = "view" | "create" | "update" | "delete";

const CONTENT: Resource[] = [
  "services",
  "stats",
  "credentials",
  "chambers",
  "gallery",
  "videos",
  "faqs",
  "testimonials",
];

/**
 * ADMIN  - everything, including user management, site settings and the audit log.
 * EDITOR - full CRUD on page content, may read + update appointment status,
 *          but cannot touch users, settings or the audit log.
 */
const MATRIX: Record<Role, Partial<Record<Resource, Action[]>>> = {
  ADMIN: {
    settings: ["view", "update"],
    services: ["view", "create", "update", "delete"],
    stats: ["view", "create", "update", "delete"],
    credentials: ["view", "create", "update", "delete"],
    chambers: ["view", "create", "update", "delete"],
    gallery: ["view", "create", "update", "delete"],
    videos: ["view", "create", "update", "delete"],
    faqs: ["view", "create", "update", "delete"],
    testimonials: ["view", "create", "update", "delete"],
    appointments: ["view", "create", "update", "delete"],
    users: ["view", "create", "update", "delete"],
    audit: ["view"],
  },
  EDITOR: {
    settings: ["view"],
    ...Object.fromEntries(
      CONTENT.map((r) => [r, ["view", "create", "update", "delete"] as Action[]]),
    ),
    appointments: ["view", "update"],
  },
};

export function can(role: Role, action: Action, resource: Resource): boolean {
  return MATRIX[role]?.[resource]?.includes(action) ?? false;
}

/** Navigation entries the given role is allowed to open. */
export function visibleSections(role: Role): Resource[] {
  const order: Resource[] = [
    "settings",
    "services",
    "stats",
    "credentials",
    "chambers",
    "gallery",
    "videos",
    "faqs",
    "testimonials",
    "appointments",
    "users",
    "audit",
  ];
  return order.filter((r) => can(role, "view", r));
}
