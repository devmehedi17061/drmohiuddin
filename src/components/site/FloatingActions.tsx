"use client";

import { useEffect, useState } from "react";
import { ArrowUp, Phone } from "lucide-react";
import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { telHref, whatsappHref } from "@/lib/format";

export function FloatingActions({
  phone,
  whatsapp,
}: {
  phone: string;
  whatsapp: string;
}) {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tel = telHref(phone);
  const wa = whatsappHref(whatsapp, "আসসালামু আলাইকুম, আমি অ্যাপয়েন্টমেন্ট নিতে চাই।");

  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col gap-3 sm:right-6">
      {showTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="উপরে যান"
          className="grid size-12 place-items-center rounded-full bg-white text-brand-700 shadow-lift ring-1 ring-line transition-colors hover:bg-brand-50"
        >
          <ArrowUp className="size-5" />
        </button>
      ) : null}

      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="হোয়াটসঅ্যাপে বার্তা পাঠান"
          className="grid size-13 place-items-center rounded-full bg-[#25D366] text-white shadow-lift transition-transform hover:scale-105"
        >
          <WhatsappIcon className="size-6" />
        </a>
      ) : null}

      {tel ? (
        <a
          href={tel}
          aria-label="ফোন করুন"
          className="grid size-13 place-items-center rounded-full bg-brand-700 text-white shadow-lift transition-transform hover:scale-105"
        >
          <Phone className="size-6" />
        </a>
      ) : null}
    </div>
  );
}
