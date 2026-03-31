# Winkget Admin Panel

Dedicated admin application for platform controls and vendor moderation.

## Features

- Admin login with backend cookie session
- Live platform metrics from MongoDB
- Vendor queue review (pending approvals)
- Vendor status actions (approve or reject)
- Search and filter across all vendors

## Local Development

1. Start backend service from `../backend` on `http://localhost:5000`.
2. Install dependencies in this folder:

```bash
npm install
```

3. Start admin app (defaults to port `3001`):

```bash
npm run dev
```

Open `http://localhost:3001`.

## Environment

Optional `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

If omitted, the app uses `http://localhost:5000` by default.

## Backend API Dependencies

The admin UI expects these backend routes:

- `GET /api/admin/me`
- `GET /api/admin/dashboard`
- `GET /api/admin/vendors`
- `PATCH /api/admin/vendors/:id/status`
