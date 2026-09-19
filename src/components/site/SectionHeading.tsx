import { cn } from "@/lib/format";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  tone = "light",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  align?: "center" | "left";
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "mb-2 text-sm font-semibold tracking-wide",
            tone === "dark" ? "text-brand-200" : "text-brand-600",
          )}
        >
          {eyebrow}
        </p>
      ) : null}

      <h2
        className={cn(
          "text-2xl sm:text-3xl lg:text-[2.1rem]",
          tone === "dark" ? "text-white" : "text-ink-900",
        )}
      >
        {title}
      </h2>

      <span
        className={cn(
          "mt-4 block h-1 w-14 rounded-full",
          align === "center" && "mx-auto",
          tone === "dark" ? "bg-accent-400" : "bg-brand-500",
        )}
      />

      {subtitle ? (
        <p
          className={cn(
            "mt-4 text-base",
            tone === "dark" ? "text-brand-100" : "text-ink-500",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
