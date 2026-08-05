# Deploying Voyago (frontend on Vercel, API on Render)

```
repo root
├── web/   → Vercel   (Root Directory: web)
└── api/   → Render   (Root Directory: api)
```

One repo, two services. Both platforms support a subdirectory root, so no
splitting is needed.

## 1. API on Render

Create a **Web Service** from this repo:

| Setting | Value |
|---|---|
| Root Directory | `api` |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm start` |
| Health check path | `/health` |

Or import `api/render.yaml` as a Blueprint, which fills the above in for you.

Environment variables:

```
NODE_ENV                production
MONGODB_URI             mongodb://…
MONGODB_DB              voyago_split
AUTH_JWT_SECRET         <48 random bytes>
ACCESS_TOKEN_TTL_MIN    15
REFRESH_TOKEN_TTL_DAYS  30
WEB_ORIGIN              https://<your-frontend>.vercel.app
COOKIE_SAMESITE         none
COOKIE_SECURE           true
COOKIE_DOMAIN           (empty)
```

Do not set `PORT` — Render provides it.

`COOKIE_SAMESITE=none` without `COOKIE_SECURE=true` makes the API refuse to
boot, on purpose: browsers silently drop such cookies, and the symptom ("login
returns 200 but the user is never signed in") is miserable to debug.

## 2. Frontend on Vercel

| Setting | Value |
|---|---|
| Root Directory | `web` |
| Framework preset | Next.js |

`web/vercel.json` pins the framework, because Vercel re-runs detection after you
change the Root Directory and can land on "Other". When that happens the build
itself succeeds and then fails with `No Output Directory named "public"` — the
"Other" preset looks for `public/`, while Next.js emits `.next`. If you see that
error, set Framework Preset to Next.js in Settings → Build and Deployment.

Environment variables — **and this is the part that actually matters**:

```
NEXT_PUBLIC_API_URL   /api-proxy
API_INTERNAL_URL      https://voyago-api.onrender.com
```

## Why the proxy (read this before you debug a login loop)

`*.vercel.app` and `*.onrender.com` are different registrable domains. The API's
auth cookies are scoped to the API's host, so:

- the **browser** can send them to the API cross-site — that works with
  `SameSite=None; Secure`;
- the **Next.js server** never receives them at all. Server Components and
  middleware would see an anonymous visitor, `/bookings` could not render on the
  server, and the middleware gate would bounce a signed-in user to `/login`.

Pointing `NEXT_PUBLIC_API_URL` at `/api-proxy` sends browser traffic through the
rewrite in `web/next.config.ts`, which forwards to `API_INTERNAL_URL`. The
cookies then land on the *frontend's* origin, so SSR, middleware and the
`/session/refresh` bounce all work — with no application code changed.

**If you have custom domains** on a shared parent (`app.acme.com` +
`api.acme.com`), skip the proxy entirely:

```
# Vercel
NEXT_PUBLIC_API_URL   https://api.acme.com
API_INTERNAL_URL      https://api.acme.com
# Render
COOKIE_DOMAIN         .acme.com
COOKIE_SAMESITE       lax
```

That is the better production setup: one less hop, and `SameSite=Lax` instead of
`None`.

## 3. Order of operations

1. Deploy the API first and note its URL.
2. Deploy the frontend with `API_INTERNAL_URL` pointing at it.
3. Go back to Render and set `WEB_ORIGIN` to the Vercel URL, then redeploy the
   API — CORS is an exact allow-list, and it needs the real frontend origin.

## MongoDB Atlas

Add `0.0.0.0/0` to Network Access — neither Render's free tier nor Vercel has
stable egress IPs.

Seed from your machine:

```bash
cd api && MONGODB_URI="…" MONGODB_DB="voyago_split" npm run seed
```

## Note on Render's free tier

Free services sleep after ~15 minutes idle and take 30–60 s to wake. Because the
Next.js frontend calls the API *during server rendering*, the first page load
after a sleep will be slow. `serverFetch` degrades gracefully — the page renders
with an "API unreachable" notice instead of crashing — but for anything you plan
to demo live, use a paid instance or hit `/health` on a schedule.
