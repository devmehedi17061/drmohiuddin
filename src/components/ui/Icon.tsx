import {
  Activity,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  Gem,
  GraduationCap,
  HeartPulse,
  MapPin,
  Microscope,
  Phone,
  Shield,
  Sparkles,
  Stethoscope,
  Syringe,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Icon names offered in the admin dropdowns; keep the keys stable, they live in MySQL. */
export const ICON_MAP = {
  activity: Activity,
  award: Award,
  calendar: CalendarDays,
  check: CheckCircle2,
  clock: Clock,
  gem: Gem,
  graduation: GraduationCap,
  "heart-pulse": HeartPulse,
  "map-pin": MapPin,
  microscope: Microscope,
  phone: Phone,
  shield: Shield,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  syringe: Syringe,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;

export const ICON_NAMES = Object.keys(ICON_MAP) as IconName[];

export function Icon({
  name,
  className,
  fallback = "stethoscope",
}: {
  name: string | null | undefined;
  className?: string;
  fallback?: IconName;
}) {
  const Component = ICON_MAP[(name ?? "") as IconName] ?? ICON_MAP[fallback];
  return <Component className={className} aria-hidden="true" />;
}
