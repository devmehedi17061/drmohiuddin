import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getSettings } from "@/lib/data/content";
import { LoginForm } from "@/components/admin/LoginForm";
import { LogoMark } from "@/components/ui/LogoMark";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [settings, params] = await Promise.all([getSettings(), searchParams]);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-lg sm:p-9">
          <div className="mb-7 text-center">
            {settings.site_logo ? (
              <span className="mx-auto mb-4 flex justify-center">
                <LogoMark logo={settings.site_logo} siteName={settings.site_name} className="h-14" />
              </span>
            ) : (
              <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-brand-700 text-white">
                <ShieldCheck className="size-7" aria-hidden="true" />
              </span>
            )}
            <h1 className="text-xl font-bold text-slate-900">{settings.site_name}</h1>
            <p className="mt-1 text-sm text-slate-500">Admin Panel Login</p>
          </div>

          <LoginForm next={params.next ?? ""} />
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-slate-500 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Main Site
          </Link>
        </p>
      </div>
    </div>
  );
}
