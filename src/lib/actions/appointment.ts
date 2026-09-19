"use server";

import { z } from "zod";
import { execute, queryOne } from "@/lib/db";
import { clientIp } from "@/lib/auth/session";
import type { AppointmentState } from "./public-state";

const schema = z.object({
  name: z.string().trim().min(2, "নাম লিখুন।").max(160),
  phone: z
    .string()
    .trim()
    .min(6, "সঠিক মোবাইল নম্বর লিখুন।")
    .max(40)
    .regex(/^[0-9+\-\s()]+$/, "মোবাইল নম্বরে শুধু সংখ্যা ব্যবহার করুন।"),
  email: z.union([z.string().trim().email("সঠিক ইমেইল লিখুন।").max(190), z.literal("")]),
  chamber_id: z.union([z.coerce.number().int().positive(), z.literal("")]),
  preferred_date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
  message: z.string().trim().max(2000).optional().default(""),
  // Hidden field; bots fill it in, humans never see it.
  website: z.string().max(0, "").optional().default(""),
});

/** Max submissions accepted from one IP per hour. */
const HOURLY_LIMIT = 5;

export async function submitAppointment(
  _prev: AppointmentState,
  formData: FormData,
): Promise<AppointmentState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      errors[key] ??= issue.message;
    }
    return { ok: false, message: "ফর্মে কিছু ভুল রয়েছে।", errors };
  }

  const data = parsed.data;

  // Honeypot hit - pretend it worked so the bot does not retry.
  if (data.website) return { ok: true, message: "আপনার অনুরোধ গৃহীত হয়েছে।" };

  const ip = await clientIp();

  try {
    if (ip) {
      const row = await queryOne<{ n: number }>(
        "SELECT COUNT(*) AS n FROM appointments WHERE ip = ? AND created_at > (NOW() - INTERVAL '1 hour')",
        [ip],
      );
      if (Number(row?.n ?? 0) >= HOURLY_LIMIT) {
        return {
          ok: false,
          message: "অল্প সময়ে অনেকবার অনুরোধ পাঠানো হয়েছে। কিছুক্ষণ পরে চেষ্টা করুন।",
        };
      }
    }

    await execute(
      `INSERT INTO appointments (name, phone, email, chamber_id, preferred_date, message, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.phone,
        data.email || null,
        data.chamber_id === "" ? null : data.chamber_id,
        data.preferred_date || null,
        data.message || null,
        ip,
      ],
    );

    return {
      ok: true,
      message: "ধন্যবাদ! আপনার অনুরোধ পাঠানো হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।",
    };
  } catch {
    return { ok: false, message: "দুঃখিত, এখন পাঠানো যায়নি। অনুগ্রহ করে ফোনে যোগাযোগ করুন।" };
  }
}
