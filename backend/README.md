# Winkget Backend

Separated Node.js backend service for Winkget Business.

## Tech
- Node.js + Express
- MongoDB + Mongoose
- CORS + Morgan

## Quick Start
1. Copy env template:
   - `cp .env.example .env` (Windows: copy manually)
2. Install packages:
   - `npm install`
3. Start dev server:
   - `npm run dev`

Backend default URL: `http://localhost:5000`

## Endpoints
- `GET /` - service status
- `GET /api/health` - backend + db health
- `GET /api/dev-logs` - list failure logs
- `POST /api/dev-logs` - add failure log

## Next Step
We can now migrate auth from Next.js route handlers into this backend folder step by step.
