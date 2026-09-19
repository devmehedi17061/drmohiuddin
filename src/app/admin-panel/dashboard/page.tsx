import Link from "next/link";
import {
  Building2,
  CalendarDays,
  CircleAlert,
  HelpCircle,
  Image as ImageIcon,
  MessageSquare,
  Stethoscope,
  TriangleAlert,
  Video,
} from "lucide-react";
import { queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { getSettings } from "@/lib/data/content";
import { SETTING_GROUPS } from "@/lib/admin/settings-fields";
import { PageHeader } from "@/components/admin/AdminShell";
import { Badge, Card, EmptyState } from "@/components/admin/ui";
import { isPlaceholder } from "@/lib/format";

export const dynamic = "force-dynamic";

async function count(table: string, where = ""): Promise<number> {
  const row = await queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM \`${table}\` ${where}`);
  return Number(row?.n ?? 0);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const [settings, services, gallery, videos, faqs, chambers, testimonials, newAppointments] =
    await Promise.all([
      getSettings(),
      count("services", "WHERE is_active = 1"),
      count("gallery_images", "WHERE is_active = 1"),
      count("videos", "WHERE is_active = 1"),
      count("faqs", "WHERE is_active = 1"),
      count("chambers", "WHERE is_active = 1"),
      count("testimonials", "WHERE is_active = 1"),
      count("appointments", "WHERE status = 'new'"),
    ]);

  const tiles = [
    { label: "Services", value: services, href: "/admin-panel/dashboard/services", icon: Stethoscope, resource: "services" as const },
    { label: "Chambers", value: chambers, href: "/admin-panel/dashboard/chambers", icon: Building2, resource: "chambers" as const },
    { label: "Gallery Images", value: gallery, href: "/admin-panel/dashboard/gallery", icon: ImageIcon, resource: "gallery" as const },
    { label: "Videos & Playlists", value: videos, href: "/admin-panel/dashboard/videos", icon: Video, resource: "videos" as const },
    { label: "FAQs", value: faqs, href: "/admin-panel/dashboard/faqs", icon: HelpCircle, resource: "faqs" as const },
    { label: "Testimonials", value: testimonials, href: "/admin-panel/dashboard/testimonials", icon: MessageSquare, resource: "testimonials" as const },
  ].filter((tile) => can(user.role, "view", tile.resource));

  // Seed rows still carrying [bracketed] placeholder text.
  const unfinished = SETTING_GROUPS.flatMap((group) =>
    group.fields
      .filter((field) => isPlaceholder(settings[field.key]))
      .map((field) => ({ group: group.title, label: field.label })),
  );

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name}`}
        description="Manage all of the website's content from here. Any change is reflected on the site immediately."
        action={
          newAppointments && can(user.role, "view", "appointments") ? (
            <Link href="/admin-panel/dashboard/appointments">
              <Badge tone="blue">{newAppointments} new appointment{newAppointments === 1 ? "" : "s"}</Badge>
            </Link>
          ) : null
        }
      />

      {params.denied ? (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <CircleAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
          You don&apos;t have permission to view that page.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <tile.icon className="size-5.5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-2xl font-bold text-slate-900">{tile.value}</span>
              <span className="block text-sm text-slate-500">{tile.label}</span>
            </span>
          </Link>
        ))}
      </div>

      {unfinished.length && can(user.role, "update", "settings") ? (
        <Card
          className="mt-6"
          title="What to fill in before going live"
          description="The fields below still have [bracketed] placeholder text. Replace them with the real information."
          action={
            <Link
              href="/admin-panel/dashboard/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200"
            >
              <TriangleAlert className="size-4" aria-hidden="true" />
              Go to Settings
            </Link>
          }
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {unfinished.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="text-slate-400">{item.group} →</span> {item.label}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {can(user.role, "view", "appointments") ? (
        <Card
          className="mt-6"
          title="Appointments"
          description="Requests submitted through the website's form."
          action={
            <Link
              href="/admin-panel/dashboard/appointments"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <CalendarDays className="size-4" aria-hidden="true" />
              View All
            </Link>
          }
        >
          {newAppointments ? (
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{newAppointments}</span> new
              request{newAppointments === 1 ? "" : "s"} not yet reviewed.
            </p>
          ) : (
            <EmptyState>No new requests.</EmptyState>
          )}
        </Card>
      ) : null}
    </>
  );
}
