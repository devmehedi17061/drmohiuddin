import { TriangleAlert } from "lucide-react";
import { missingUploadConfig } from "@/lib/upload";

/**
 * Server component. Shows a warning on admin pages that accept image uploads
 * when the server is missing the Supabase variables uploads depend on, so the
 * admin learns about the misconfiguration before choosing a file - not from a
 * failed save that also discards the text they typed.
 */
export function UploadConfigNotice() {
  const missing = missingUploadConfig();
  if (!missing.length) return null;

  return (
    <div
      role="alert"
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <TriangleAlert className="mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Image uploads are not configured on this server.</p>
        <p className="mt-1">
          Missing environment variable{missing.length > 1 ? "s" : ""}:{" "}
          {missing.map((name, i) => (
            <span key={name}>
              {i > 0 ? ", " : null}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">{name}</code>
            </span>
          ))}
          . Text changes will still save, but choosing an image will fail. On Vercel add
          {" "}them under Project → Settings → Environment Variables, then redeploy.
        </p>
      </div>
    </div>
  );
}
