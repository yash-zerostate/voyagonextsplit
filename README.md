# Voyago — Next.js frontend + a separate Express API

Two independently deployable services. The Next.js app renders pages and owns no
database; every byte of data and every authorization decision comes from the
Express API, which owns MongoDB and the JWT secret.

```
web/  Next.js 15 (port 4002)  ──cross-origin fetch, credentials: include──►  api/  Express + Mongoose (port 5002)
```

## Run it

Two terminals — the API first, because the web app calls it during render.

```bash
cd api
cp .env.example .env      # Atlas URI + AUTH_JWT_SECRET
npm install
npm run seed
npm run dev               # http://localhost:5002

cd ../web
cp .env.example .env
npm install
npm run dev               # http://localhost:4002
```

## Pages (`web/`)

| Route | Access | Data source |
|-------|--------|-------------|
| `/` | public | `GET /destinations` (server-side) |
| `/destinations` | public | `GET /destinations?region=&q=` — filtering happens on the API |
| `/login` | public | `POST /auth/login` from the browser |
| `/signup` | public | `POST /auth/register` from the browser |
| `/bookings` | **protected** | `GET /bookings`, cancel via `POST /bookings/:id/cancel` |
| `/profile` | **protected** | All six profile attributes, editable via `PATCH /auth/me` |

## API (`api/`)

| Method | Route | Auth |
|--------|-------|------|
| `POST` | `/auth/register` | public, rate limited |
| `POST` | `/auth/login` | public, rate limited, account lockout |
| `POST` | `/auth/refresh` | refresh cookie; rotates with reuse detection |
| `POST` | `/auth/logout` | revokes the whole refresh family |
| `GET`  | `/auth/me` | access cookie or `Bearer` |
| `PATCH` | `/auth/me` | edit the profile |
| `GET`  | `/destinations` | public |
| `GET/POST` | `/bookings` | **required** — enforces the plan gate and seat count |
| `POST` | `/bookings/:id/cancel` | **required** — ownership is part of the query |
| `GET`  | `/health` | public |

## The cross-origin part (this is the interesting bit)

The site is on one origin and the API on another, so:

1. **CORS** is an exact allow-list with credentials — `origin: [WEB_ORIGIN],
   credentials: true`. `*` with credentials is rejected by every browser.
2. **Every browser call sends `credentials: "include"`**, otherwise the cookie is
   not attached and `Set-Cookie` is ignored (`web/src/lib/api.ts`).
3. **Cookie scope** decides whether the Next.js *server* can also see the cookie:
   - dev — both sides are `localhost`; cookies ignore ports, so `SameSite=Lax`
     is enough and no `COOKIE_DOMAIN` is needed.
   - prod, shared parent domain (`app.acme.com` + `api.acme.com`) — set
     `COOKIE_DOMAIN=.acme.com`, keep `SameSite=Lax`.
   - prod, genuinely different domains — `COOKIE_SAMESITE=none` and
     `COOKIE_SECURE=true` (HTTPS required). The API refuses to boot if you set
     `none` without `secure`, because browsers would silently drop the cookie.
4. **Server-side rendering** forwards the incoming cookie header to the API
   (`serverFetch`), which is what lets `/bookings` render on the server.
5. **Expired access token on a navigation** → `web/src/middleware.ts` bounces to
   `/session/refresh`, a route handler that asks the API to rotate and *relays
   the API's `Set-Cookie` headers* onto its own redirect. A Server Component
   cannot set cookies, so this small BFF hop is what makes SSR + short-lived
   tokens work together.
6. **Expired access token on a click** → the client component retries once
   through `POST /auth/refresh` before giving up (`BookingDialog`,
   `CancelBookingButton`).

## Seeded accounts

See the root README for the full attribute matrix — all use password
`Password123!`.

Sign in as `free@example.com` and try to book *Namib Private Camp*: the UI shows
"enterprise only", and calling the API directly answers `403 plan_required`. The
gate is real, not cosmetic — raise the plan on `/profile` and the same booking
goes through.
