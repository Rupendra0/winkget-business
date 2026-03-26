# Winkget Business Frontend

This is the Next.js frontend for Winkget Business.
The backend is now fully separated in the `backend` folder (Node.js + Express + MongoDB).

## Local Setup

1. Install frontend dependencies:

```bash
npm install
```

2. Configure frontend environment in `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL="http://localhost:5000"
```

3. Install and start backend (from the `backend` folder):

```bash
cd backend
npm install
npm run dev
```

4. Start frontend (from project root):

```bash
npm run dev
```

5. Open frontend:

```text
http://localhost:3000
```

## Notes

- Frontend auth page (`/auth`) calls backend endpoints:
	- `POST /api/auth/signup`
	- `POST /api/auth/login`
- Developer logs page (`/dev`) calls backend endpoint:
	- `GET /api/dev-logs`
- Backend health endpoint:
	- `GET /api/health`
