# ME Admin Portal

Internal compliance management platform for ME Corporation.

---

## Modules

| Module | Path | Description |
|---|---|---|
| Dashboard | `/dashboard` | Summary stats across all modules |
| BIA | `/bia` | Business Impact Analysis — process criticality & financial exposure |
| GAP Analysis | `/gap-analysis` | Framework compliance assessments (ISO 27001, PDPA, SOC 2 …) |
| Risk Assessment | `/risk-assessment` | Asset risk register + vulnerability tracking |
| IT Audit Evidence Portal | `/audit` | Auditor evidence requests, file uploads, version history |
| Activity Logs | `/activity-logs` | Immutable audit trail — all user actions with IP |
| Admin — Frameworks | `/admin/frameworks` | CRUD for compliance frameworks and requirements |

---

## Getting Started

```bash
npm install
cp .env.example .env.local        # fill in JWT_SECRET
npm run db:push                   # run all migrations
npm run db:seed                   # seed users
npm run db:seed:frameworks        # seed compliance frameworks
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | **Yes** | Minimum 32-char random string. Generate: `openssl rand -hex 32` |
| `NODE_ENV` | No | Set to `production` in hosting environments |

> **Never** prefix secrets with `NEXT_PUBLIC_` — those values are exposed in the browser bundle.

---

## Database

SQLite via `better-sqlite3`. Database file: `data/app.db`.

### Migrations

```bash
npm run db:push          # run ALL migrations in order
```

Individual migration scripts in `scripts/migrate*.ts`. Run in order:

```
migrate.ts → migrate-risk.ts → migrate-portal.ts → migrate-audit.ts →
migrate-v06.ts → migrate-v07.ts → migrate-v08.ts → migrate-v10.ts →
migrate-v11.ts → migrate-v12.ts → migrate-v13.ts
```

### Seeding

```bash
npm run db:seed                  # admin user + sample data
npm run db:seed:frameworks       # ISO 27001, ISO 27701, ISO 42001, ISO 22301, PDPA
npm run db:seed:gap              # sample GAP assessments
npm run db:seed:risk             # sample risk assets
```

---

## Deploy to Render.com

1. Push to GitHub (ensure `data/` and `.env` are in `.gitignore`)
2. Create new **Web Service** on Render, point to repo
3. Render auto-reads `render.yaml`
4. Add `JWT_SECRET` in Render dashboard → Environment → Secret Files
5. Enable **Persistent Disk** (required for SQLite) — already configured in `render.yaml`

---

## Security Checklist (OWASP Top 10)

### ✅ A01 — Broken Access Control
- [ ] Middleware enforces authentication on all non-public routes
- [ ] API routes return JSON `401`/`403` (never HTML redirect)
- [ ] `/api/admin/*` routes require `role = "admin"`
- [ ] All DB queries include `organization_id` filter (org isolation)

### ✅ A02 — Cryptographic Failures
- [ ] JWT signed with HS256, secret from `JWT_SECRET` env var
- [ ] Cookies: `httpOnly=true`, `secure=true` (prod), `sameSite=strict`
- [ ] Passwords hashed with bcrypt, cost factor 12
- [ ] HSTS header: `max-age=31536000; includeSubDomains`
- [ ] `productionBrowserSourceMaps: false` (no source maps in prod)

### ✅ A03 — Injection
- [ ] All DB queries use parameterized statements (`?` placeholders)
- [ ] User inputs sanitized via `lib/sanitize.ts` before use
- [ ] No raw string concatenation into SQL queries

### ✅ A04 — Insecure Design / Rate Limiting
- [ ] Login: 5 attempts per IP per 15 minutes (`lib/rate-limit.ts`)
- [ ] Upload: 20 files per user per hour
- [ ] `Retry-After` header returned on 429 responses

### ✅ A05 — Security Misconfiguration
- [ ] `/api/health` returns only `{ status: "ok" }` — no version or env details
- [ ] No sensitive `console.log`/`console.error` in production paths
- [ ] No secrets in `NEXT_PUBLIC_*` environment variables
- [ ] Source maps disabled in production

### ✅ A07 — Identification & Authentication Failures
- [ ] ALL login attempts logged (success + failure) with IP address
- [ ] Failure reason logged server-side; client receives only generic "Invalid credentials"
- [ ] Timing-attack prevention: `bcrypt.compare` runs even when user not found
- [ ] Session expires after 8 hours
- [ ] Session cookie deleted on logout

### ✅ A08 — Software & Data Integrity Failures (File Uploads)
- [ ] Magic-byte validation (not extension-only) via `lib/file-security.ts`
- [ ] Allowed types: PDF, PNG, JPEG, ZIP only
- [ ] 10 MB server-side size limit enforced before writing to disk
- [ ] Files stored with UUID names — original filename never used for disk I/O
- [ ] SHA-256 hash stored in DB (`file_hash` column) for integrity verification
- [ ] Upload directory outside web root is preferred; currently `public/uploads/evidence/`

### ✅ A09 — Security Logging & Monitoring Failures
- [ ] All user actions written to `activity_logs` via `writeLog()`
- [ ] Logs include: userId, userName, email, action, module, targetId, details, IP, timestamp
- [ ] Activity Logs UI supports filtering by: search, action, module, IP address, date range
- [ ] Logs are admin-only viewable; CSV export available
- [ ] Login failures logged with reason (user not found / wrong password / inactive)

### ✅ A02 — Security Headers (next.config.js)
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY`
- [ ] `X-XSS-Protection: 1; mode=block`
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- [ ] `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; …`

---

## Production Pre-flight

Before going live, verify:

1. `JWT_SECRET` is set and is at least 32 random characters
2. `NODE_ENV=production` is set
3. HTTPS is enabled (HSTS only activates over HTTPS)
4. Persistent disk is mounted at `/opt/render/project/src/data`
5. `public/uploads/` directory is writable by the web process
6. Backups scheduled for `data/app.db` (SQLite single file — easy to backup)
7. Activity Logs reviewed periodically for suspicious login activity

---

*Built with Next.js 14 · better-sqlite3 · Tailwind CSS · @react-pdf/renderer*
