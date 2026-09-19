import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

const bangla = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-bangla",
  display: "swap",
});

const latin = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#145a6e",
};

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "ডা. মহিউদ্দিন — ইউরোলজি ও কিডনি রোগ বিশেষজ্ঞ",
    template: "%s | ডা. মহিউদ্দিন",
  },
  description:
    "ইউরোলজি, কিডনি ও প্রস্রাবজনিত রোগের অভিজ্ঞ চিকিৎসক। অ্যাপয়েন্টমেন্ট নিতে আজই যোগাযোগ করুন।",
  robots: { index: true, follow: true },
};

/**
 * Clears any leftover `#hash` from the URL before the browser gets a chance to
 * jump to it. A stray hash - from an old bookmark, a shared link, or (before
 * in-page nav was switched to ScrollLink) simply from clicking a nav item -
 * makes the browser auto-scroll to that section on every load, since that
 * native jump happens as the document loads, before any of our own React code
 * runs. Placed first inside <body> so it executes before the target section
 * exists in the DOM, pre-empting the browser's own scroll-to-fragment step.
 *
 * Rendered as a plain <script> (not next/script): RootLayout is a Server
 * Component, so the tag is emitted straight into the HTML and the browser runs
 * it while parsing. next/script's `beforeInteractive` hoists the tag into
 * <head> and defers it to the Next runtime, which both runs it too late and
 * leaves React unable to find the node during hydration - producing the
 * "Encountered a script tag while rendering React component" console error.
 */
const STRIP_STALE_HASH_SCRIPT = `(function(){try{if(window.location.hash){history.replaceState(null,"",window.location.pathname+window.location.search);window.scrollTo(0,0);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={`${bangla.variable} ${latin.variable}`}>
      {/* suppressHydrationWarning: some browser extensions (password managers,
          grammar checkers, etc.) inject an attribute onto <body> before React
          hydrates - e.g. `__processed_<uuid>__="true"`. That mismatch is real
          but harmless and outside our control, so it's silenced here rather
          than left as a scary red console error on every load. */}
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <script
          id="strip-stale-hash"
          dangerouslySetInnerHTML={{ __html: STRIP_STALE_HASH_SCRIPT }}
        />
        {children}
      </body>
    </html>
  );
}
