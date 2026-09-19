"use client";

/**
 * In-page anchor that scrolls smoothly *without* writing `#section` into the
 * address bar. The real `href` is kept so the link still works with JavaScript
 * disabled and remains right-clickable / readable by assistive tech.
 */
export function ScrollLink({
  href,
  className,
  children,
  onNavigate,
  ...rest
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">) {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    // Let the browser handle modified clicks (new tab, download, ...).
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
      return;
    }
    if (!href.startsWith("#")) return;

    const id = href.slice(1);
    const target = id === "top" ? null : document.getElementById(id);
    if (id !== "top" && !target) return;

    event.preventDefault();

    if (target) {
      // `scroll-padding-top` on <html> keeps the sticky header from covering it.
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    onNavigate?.();
  }

  return (
    <a href={href} onClick={handleClick} className={className} {...rest}>
      {children}
    </a>
  );
}
