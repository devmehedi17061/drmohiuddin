import Image from "next/image";
import { cn } from "@/lib/format";

/**
 * Site logo, with a lettermark fallback so the header never looks broken before
 * a logo is uploaded. A wide logo keeps its aspect ratio (fixed height, auto width).
 */
export function LogoMark({
  logo,
  siteName,
  className,
  tone = "brand",
}: {
  logo?: string | null;
  siteName: string;
  /** Height utility, e.g. "h-11". Width is derived from the image. */
  className?: string;
  tone?: "brand" | "light";
}) {
  const trimmed = logo?.trim();

  if (trimmed) {
    return (
      <Image
        src={trimmed}
        alt={siteName}
        width={320}
        height={96}
        priority
        className={cn("w-auto object-contain", className ?? "h-11")}
      />
    );
  }

  const initial = siteName.replace(/^ডা\.?\s*/, "").trim().charAt(0) || "ড";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid aspect-square shrink-0 place-items-center rounded-xl text-lg font-bold",
        tone === "light" ? "bg-white/10 text-white" : "bg-brand-700 text-white",
        className ?? "h-11",
      )}
    >
      {initial}
    </span>
  );
}
