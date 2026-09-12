# Fooder

Shared shopping list for Dvir and Mai.

## Local development

Local dev and production share one remote Neon Postgres database — there
is no local Postgres to install or run. Automated tests are the
exception: they spin up their own throwaway local Postgres automatically
(see "Testing" below), so they never touch real data.

1. `npm install` — installs both workspaces
2. `cp backend/.env.example backend/.env` and fill in the real Neon
   `DATABASE_URL` (ask whoever set up the Neon project for it) — skip this
   step if `backend/.env` already exists
3. `npm run dev -w backend` — backend on http://localhost:3001
4. `npm run dev -w frontend` — frontend on http://localhost:5173 (proxies `/api` to the backend)

## Testing

`npm run test -w backend` — no setup needed. A throwaway local Postgres
instance is started automatically (via `embedded-postgres`) before the
suite runs and torn down after, so this never touches the real Neon
database.

## Deployment (all free tier)

1. **Database — Neon**: already set up (one project, `production` branch,
   schema pushed via `prisma db push`). If starting over: create a free
   Neon Postgres project and copy its connection string.
2. **Images — Cloudflare R2**: create a bucket, an API token
   (Object Read & Write), and enable public access (or a custom domain)
   for the bucket to get a public base URL.
3. **Backend — Render**: create a new Blueprint from this repo (uses
   `render.yaml`). Set the env vars: `DATABASE_URL` (same Neon connection
   string used locally), `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` (from
   Cloudflare). Note the resulting `https://<service>.onrender.com` URL.
4. **Frontend — Vercel**: import this repo, set the project root directory
   to `frontend`, and set the env var `VITE_API_BASE_URL` to the Render
   backend URL from step 3.

## Verifying a production deploy

- Open the Vercel URL on a phone, add an item, and confirm it appears.
- Attach a photo to a new item and confirm it renders (proves the R2
  round-trip works).
- Open the app on two devices and confirm an add/complete/delete on one
  shows up on the other within a couple of seconds (proves SSE works
  across the Vercel/Render origin split).
- Note the first request after ~15 minutes of inactivity may take
  30-60 seconds while Render's free tier wakes the backend up — this is
  expected, not a bug.
