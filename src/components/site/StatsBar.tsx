import type { Stat } from "@/lib/types";
import { bn } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export function StatsBar({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;

  return (
    <section className="relative z-10 bg-surface-muted py-10">
      <div className="container-page">
        <dl className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className="rounded-card border border-line bg-white px-5 py-6 text-center shadow-soft"
            >
              <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-brand-50 text-brand-600">
                <Icon name={stat.icon} className="size-5" />
              </div>
              <dd className="text-3xl font-bold text-brand-700">
                {bn(stat.value)}
                {stat.suffix ? <span className="text-accent-600">{stat.suffix}</span> : null}
              </dd>
              <dt className="mt-1 text-sm text-ink-500">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
