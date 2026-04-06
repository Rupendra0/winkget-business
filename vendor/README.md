# Winkget Vendor Panel

Standalone vendor-facing dashboard app (parallel to admin) that uses the same backend APIs.

## What This App Uses

- `GET /api/auth/me` for vendor session/profile
- `GET /api/reviews?businessId=<vendorId>` for rating and recent review activity

No backend API contracts are changed by this app.

## Local Development

1. Start backend from `../backend` on `http://localhost:5000`.
2. Install dependencies in `vendor`.
3. Run vendor app on port `3002`.

```bash
npm install
npm run dev
```

Open `http://localhost:3002`.

## Environment

Optional `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_MAIN_WEBSITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_MAIN_WEBSITE_URL` is used by vendor login/register CTAs and defaults to `http://localhost:3000`.
