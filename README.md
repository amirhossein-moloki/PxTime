# Sevra

Sevra is an Express + TypeScript API backed by PostgreSQL and Prisma. The API is mounted under `/api/v1` and is organized by feature modules (auth, salons, services, staff, shifts, availability, bookings, payments, CMS, public, webhooks).

## Documentation

The authoritative documentation lives in `docs/` and is generated from the current codebase:

- `docs/README.md` — documentation map
- `docs/architecture.md` — system structure and project map
- `docs/database.md` — Prisma models, enums, and relationships
- `docs/api.md` — route-by-route API reference
- `docs/API_GUIDE_FA.md` — راهنمای فارسی API (Persian API Guide)
- `docs/auth.md` — OTP/session auth flow
- `docs/cms-seo.md` — CMS and SEO behavior
- `docs/payments-commission-webhooks.md` — payment flow, commission data model, webhooks
- `docs/onboarding.md` — local setup and environment variables
