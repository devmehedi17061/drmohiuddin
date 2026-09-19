# ডা. মহিউদ্দিন — Urology Landing Page

Next.js 16 (App Router) + TypeScript + Tailwind v4 + MySQL. A single Bengali landing page
with a full admin panel; no blog.

---

## Setup

```bash
npm install
cp .env.example .env.local     # then edit it (see below)
npm run db:setup               # creates the database + tables
npm run db:seed                # first admin account + placeholder content
npm run dev
```

Public site: <http://localhost:3000>  ·  Admin: <http://localhost:3000/admin-panel>

### `.env.local`

| Variable | Notes |
| --- | --- |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | XAMPP defaults work as-is |
| `AUTH_SECRET` | **32+ chars.** `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `SESSION_MAX_AGE` | Session lifetime in seconds (default 43200 = 12h) |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Used **only** by `npm run db:seed` |
| `NEXT_PUBLIC_SITE_URL` | Used for SEO metadata and JSON-LD |

Change `ADMIN_PASSWORD` before seeding, and change it again from the panel afterwards.

---

## Landing page sections

Hero → stats → about + credentials → services → chambers → photo gallery →
video gallery → testimonials → appointment form → **FAQ** → footer.

FAQ sits directly above the footer, as requested. Every section is driven by MySQL and
hides itself automatically when it has no rows.

In-page navigation scrolls smoothly **without** writing `#section` into the address bar
(`src/components/site/ScrollLink.tsx`).

---

## Admin panel

`/admin-panel` → login → `/admin-panel/dashboard`.

| Section | What it controls |
| --- | --- |
| সাইট সেটিংস | **Logo**, all page text, hero/about images, contact details, social links, SEO |
| চিকিৎসা সেবা | Service cards |
| পরিসংখ্যান | The counters under the hero |
| যোগ্যতা ও অভিজ্ঞতা | Degrees, experience, memberships, awards |
| চেম্বার | Chamber addresses, days, times, map links |
| ফটো গ্যালারি | Multi-file upload, alt text, ordering, show/hide |
| ভিডিও গ্যালারি | YouTube videos **and playlists** |
| সচরাচর জিজ্ঞাসা | FAQ entries |
| রোগীদের মতামত | Patient testimonials |
| অ্যাপয়েন্টমেন্ট | Requests from the public form, with status tracking |
| ইউজার ব্যবস্থাপনা | Admin/editor accounts *(ADMIN only)* |
| কার্যক্রমের লগ | Audit trail *(ADMIN only)* |

Every list supports reorder (↑ ↓), show/hide, edit and delete. Changes call
`revalidatePath("/")`, so the public page updates immediately.

### YouTube links

Paste any of these into ভিডিও গ্যালারি:

- `youtube.com/watch?v=…`, `youtu.be/…`, `/shorts/…`, `/live/…`, `/embed/…`
- `youtube.com/playlist?list=…` → embedded as a **playlist player**
- a bare video or playlist id

Titles and thumbnails come from YouTube's public oEmbed endpoint — no API key needed.
When a URL carries both `v=` and `list=`, the ধরন dropdown decides which one wins.

---

## Auth & authorization

- Passwords hashed with bcrypt (cost 12).
- Session is a signed HS256 JWT (`jose`) in an httpOnly, SameSite=Lax cookie.
- `src/proxy.ts` gates `/admin-panel/*` on the cookie's signature (Edge runtime).
- Every dashboard page and **every server action** independently re-checks the session
  against MySQL, so a deactivated account or a password change kills live sessions at once
  (`users.token_version`).
- Two roles:
  - **ADMIN** — everything, including users, settings and the audit log.
  - **EDITOR** — full CRUD on page content; cannot touch users, settings or the log.
  - The matrix lives in `src/lib/auth/rbac.ts`.
- Failed logins are throttled per email *and* per IP (6 attempts / 15 min).
- The last active admin cannot be deleted, demoted or deactivated.
- Every write is recorded in `audit_logs`.
- **Every** logged-in user (ADMIN or EDITOR) can change their own name/password from
  আমার প্রোফাইল (bottom of the sidebar) — no admin needed for that. It requires the
  current password, and a password change signs that account out everywhere else while
  keeping the tab that made the change signed in.

### Hardening applied

- **CSP, HSTS, nosniff, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `object-src 'none'`** — set in `next.config.ts`. `unsafe-eval` is dev-only.
- `X-Powered-By` removed; `/admin-panel/*` is `no-store` + `noindex`.
- **CSRF**: Server Actions reject cross-origin POSTs (verified) and the session cookie is
  `SameSite=Lax`.
- **JSON-LD** is escaped through `src/lib/jsonld.ts` — `JSON.stringify` leaves `</script>`
  intact, which would otherwise let admin-authored text break out of the tag.
- **Login timing**: an unknown email is compared against a *real* bcrypt hash, so the
  response time no longer reveals whether an address exists (measured gap: ~3ms).
- **SQL**: every value is a bound parameter. The only interpolated identifiers are table and
  column names read from `src/lib/admin/resources.ts` — never from a request.

### Known limitations

- `X-Forwarded-For` is trusted as-is, so IP-based throttling can be evaded when the app is
  exposed directly to the internet. Put it behind a proxy that overwrites that header.
  (Per-email login throttling is unaffected.)
- Login lockout counts **6 failures per IP per 15 minutes across all accounts**, so people
  sharing one NAT can lock each other out. Tune `MAX_ATTEMPTS` in `src/lib/auth/session.ts`.
- CSP keeps `script-src 'unsafe-inline'`: a nonce would force per-request rendering and give
  up the landing page's ISR cache.
- If the only admin account gets locked out (forgotten password, or a hash edited by
  hand directly in the database), recover it from a terminal — **never** paste a
  hash from an external generator directly into `users.password_hash`; it won't be
  in the format this app verifies against, and locks the account out with no
  in-app way back in:
  ```bash
  npm run db:reset-password admin@drmohiuddin.com "NewPassword123"
  ```
  This signs that account out everywhere and sets a real bcrypt hash at the app's own
  cost factor. See `db/reset-password.mjs`.

### Uploads

Images are decoded with `sharp`, re-encoded to WebP and written with random filenames, so
a file with a spoofed extension never lands on disk in its original form. Max 8 MB each,
resized to fit 1600×1600.

---

## Project layout

```
db/            schema.sql, setup.mjs, seed.mjs
src/app/       landing page + /admin-panel routes
src/components/site/    public sections
src/components/admin/   admin UI
src/lib/auth/  jwt, rbac, session
src/lib/admin/ resource + settings definitions (the CRUD engine is driven by these)
src/lib/actions/  server actions (admin + public)
public/uploads/   uploaded media (git-ignored)
```

Adding a new content section usually means adding one entry to
`src/lib/admin/resources.ts` plus a three-line page that renders `<ResourcePage />`.

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:setup` | Apply `db/schema.sql` (idempotent) |
| `npm run db:seed` | First admin + placeholder content (idempotent) |
| `npm run db:migrate` | Apply schema changes to an existing database (idempotent) |
| `npm run db:reset-password <email> <password>` | Recover a locked-out account |
| `npm run db:reset` | setup + seed + migrate |

---

## Before going live

1. Replace every `[bracketed]` placeholder — the dashboard lists them for you.
2. Set the real phone / WhatsApp / email / address in সাইট সেটিংস.
3. Put real figures in পরিসংখ্যান (they ship as `0`).
4. Upload the logo (সাইট সেটিংস → সাধারণ তথ্য) and the doctor's photo (hero + about).
   A wide logo keeps its aspect ratio; when one is set the header shows it alone instead of
   repeating the name beside it.
5. Set a strong `AUTH_SECRET` and change the seeded admin password.
6. Serve over HTTPS — the session cookie is marked `secure` in production.
# drmohiuddin
