# Forma — considered design, everyday living

A mobile-first MERN storefront with a separately deployable React SPA and Express 5 API. Each directory has its own package manifest, pnpm lockfile, TypeScript configuration, dependencies and environment. There is no root package or workspace, and neither app imports files from the other.

## What is implemented

- Better Auth email/password registration, sign-in, sign-out, HttpOnly cookie sessions and protected customer/admin routes.
- Home, searchable/filterable/sortable/paginated catalog, product galleries and finishes, verified-purchase reviews, related products, persistent carts, optimistic cart edits, address management, COD checkout, order confirmation/history/detail, admin dashboard and 404.
- Product/category creation and editing, product archival, order fulfilment and cancellation with inventory restoration.
- Mobile search/header/bottom navigation, filter sheet, sticky product purchase bar, dark mode, skeletons, toasts, inline validation and reduced-motion support.
- Validated environment and API input, server-side price calculations, atomic inventory updates inside transactions, idempotent checkout, origin protection, rate limiting, structured logs and graceful shutdown.
- 32 seeded products across Living, Lighting, Objects and Textiles. Product photography is illustrative placeholder imagery, not an exact representation of each item.

```text
ecom/
├── backend/
│   ├── src/
│   │   ├── config/       # Environment and database connections
│   │   ├── controllers/  # Validated REST handlers
│   │   ├── lib/          # Better Auth, logging, schemas
│   │   ├── middleware/  # Authentication, roles, errors
│   │   ├── models/      # Mongoose domain models
│   │   ├── routes/
│   │   ├── services/    # Cart, transactional orders, payments
│   │   ├── utils/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   └── seed.ts
│   ├── tests/
│   ├── .env.example
│   ├── compose.yaml
│   ├── Dockerfile
│   └── package.json + pnpm-lock.yaml + tsconfig.json
└── frontend/
    ├── src/{components,lib,pages}/
    ├── public/           # SPA fallback and favicon
    ├── .env.example
    ├── vercel.json
    └── package.json + pnpm-lock.yaml + tsconfig.json
```

## Local setup

Use Node 22.12+ (Node 24 LTS recommended), pnpm 10.33.0 and MongoDB with transactions enabled. Install pnpm separately if needed: `npm install -g pnpm@10.33.0`.

### Backend

```sh
cd backend
pnpm install --frozen-lockfile
cp .env.example .env
```

Edit `.env`. Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` and put it in `BETTER_AUTH_SECRET`. Set a strong `SEED_ADMIN_PASSWORD` (at least 16 characters). The example placeholders are intentionally rejected. On this prepared machine, ignored `.env` files already contain generated local values; do not overwrite them unless you intend to reconfigure the app.

Use Atlas, an existing replica set, or start the included local database:

```sh
docker compose up -d --wait
docker compose exec mongo mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
pnpm seed
pnpm dev
```

Run `rs.initiate` only once per volume. Local `MONGODB_URI` uses `directConnection=true` because Docker exposes a different host port than the replica-set member advertises. The local Compose database has no authentication and binds only to loopback; it is not a production database configuration. Use a MongoDB release compatible with the host kernel. MongoDB 8.2.11 was verified on this machine; the initial `mongo:8` image exited due to its kernel compatibility check.

During development of this project, the existing database was started as the container `forma-ecom-mongo-current`, using the same `.env` port. To reuse that seeded database, use `docker start forma-ecom-mongo-current` instead of Compose. Do not start both on the same port. Its database files are in its Docker volume. A new Compose volume can be seeded independently.

`pnpm seed` inserts missing categories/products and creates or promotes the configured administrator. It does not delete the catalog, overwrite existing product edits, or reset existing passwords. Sign in using the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` values in your local backend environment, then open `/admin`. If the admin account already exists, its existing password is retained. Run this command only with intentionally chosen administrator credentials and database access.

### Frontend (a separate terminal)

```sh
cd frontend
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

Set `VITE_API_URL` to the backend's public origin and ensure `VITE_DEV_PORT` matches the port in backend `FRONTEND_URL`. With the supplied examples, the browser is at `http://localhost:5173` and the API is at `http://localhost:5000`. Use the same hostname spelling for both (do not mix `localhost` and `127.0.0.1` for browser origins).

No Vite API proxy is required. The frontend talks directly to the independently running backend with `credentials: "include"`. Backend downtime displays a friendly error and retry controls; no fake successful checkout or local-only cart is substituted.

### Production builds, independently

```sh
cd backend
pnpm typecheck
pnpm build
pnpm start
```

```sh
cd frontend
pnpm typecheck
pnpm build
pnpm preview
```

Backend output is `backend/dist/server.js`. Frontend output is the standalone static directory `frontend/dist/`. Vite validates the frontend environment during both startup and build. Backend validation runs before connecting/listening. Copy either app to a different checkout or host and install only its own dependencies; the other directory is not needed.

## Environment reference

Never commit actual `.env` files. Both app `.gitignore` files exclude `.env` and `.env.*`, except `.env.example`. Production secrets belong in your host's secret/environment settings, not in source or the frontend build. Origins must have no trailing slash or path.

### Backend

| Variable | Required / default | Meaning |
| --- | --- | --- |
| `NODE_ENV` | Required | `development`, `test` or `production`. |
| `HOST` | Required | Bind address; usually `0.0.0.0` on an app host. |
| `PORT` | Required | Host-assigned listening port. No code fallback. |
| `MONGODB_URI` | Required | Atlas or replica-set URI with a database name; standalone MongoDB is rejected. |
| `BETTER_AUTH_SECRET` | Required | At least 32 random characters. Keep identical across API replicas. |
| `BETTER_AUTH_URL` | Required | Public backend origin, including HTTPS in production. |
| `HEARTBEAT_ENABLED` | `false` | Set to `true` to request the public backend `/health` endpoint every 14 minutes while the API runs. |
| `FRONTEND_URL` | Required | Exact public frontend origin; used for CORS and trusted auth/redirect origins. |
| `TRUSTED_ORIGINS` | Empty | Comma-separated additional exact frontend origins. No wildcard. |
| `COOKIE_SAME_SITE` | `lax` | `lax`, `strict`, or `none`; `none` requires HTTPS on both origins. |
| `COOKIE_DOMAIN` | Empty | Optional shared parent domain; e.g. `example.com`. Enables cross-subdomain cookies. Must match both origins. |
| `TRUST_PROXY` | `0` | Number of trusted proxy hops; use `1` behind one controlled proxy. |
| `CURRENCY` | Required; example `INR` | ISO currency code. Seed prices, PIN validation and storefront budget labels assume INR/India. |
| `SHIPPING_FEE` | Required; example `9900` | Flat delivery fee in minor units (₹99). |
| `FREE_SHIPPING_THRESHOLD` | Required; example `500000` | Free shipping threshold in minor units (₹5,000). |
| `SEED_ADMIN_EMAIL` | Seed only | Administrator email; not needed by the production API. |
| `SEED_ADMIN_PASSWORD` | Seed only | At least 16 characters; not needed by the production API. |
| `IMAGE_BASE_URL` | Seed only | Public HTTP(S) image host used to construct seed URLs. |
| `MONGO_PORT` | Local Compose only | MongoDB host port. Must match your local connection URI. |

Backend loads `.env` from its own working directory using dotenv. In production, supply process environment variables directly (they take precedence). For alternate local files, start Node with `--env-file` or set `DOTENV_CONFIG_PATH`; do not rely on a frontend environment file.

### Frontend

| Variable | Required | Meaning |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Public backend origin, baked into the static bundle. |
| `VITE_DEV_PORT` | Yes | Explicit local development/preview port; ignored by a static host. |
| `VITE_HERO_IMAGE_URL` | Yes | Public image URL for the homepage hero. |

These are all public values. Never put database, auth or payment secrets in a `VITE_` variable. Vite supports `.env`, `.env.local`, `.env.development` and `.env.production`; mode-specific values override generic values. Rebuild after changing `VITE_API_URL`. All store requests and the single Better Auth client live in `src/lib/api.ts`.

## Separate deployment

### Optional Render heartbeat

In Render's backend environment settings, set `HEARTBEAT_ENABLED=true` and set `BETTER_AUTH_URL` to your public HTTPS backend origin (without a trailing slash). The API starts a heartbeat after listening and requests `/health` every 14 minutes. Requests time out after 10 seconds, failures are logged without crashing the API, and the timer and active request stop during graceful shutdown. Leave it disabled for local development.

This is best-effort traffic, not an uptime guarantee. [Render's free services](https://render.com/docs/free) spin down after 15 minutes without inbound traffic and may restart at any time. An in-process timer cannot wake an already-sleeping service. For wake-up checks, use an external scheduler targeting the public `/health` URL; use a paid instance when continuous availability is required. Running time consumes the workspace's included free instance hours.

### Deploy the apps

1. Provision Atlas or a secured MongoDB replica set. Allow the API host to reach it; use a database user scoped to this app and enable backups.
2. Deploy the **backend first**, with the project root set to `backend`. Build: `pnpm install --frozen-lockfile && pnpm build`. Start: `pnpm start`. Health check: `/health`. Set the backend environment in the host's environment/secrets panel. Use the host's assigned `PORT`, `HOST=0.0.0.0`, `NODE_ENV=production`, the final `BETTER_AUTH_URL`, and the planned frontend origin.
3. Optionally build the backend container from `backend/`: `docker build -t forma-api .`. Supply runtime variables through your container host. The final image runs as the unprivileged `node` user and contains no `.env` file. TLS terminates at your host/proxy. It does not need a volume for uploads.
4. Deploy the **frontend separately**, with root `frontend`, build `pnpm install --frozen-lockfile && pnpm build`, and publish directory `dist`. Set all three frontend variables in the platform's **build-time** environment. `VITE_API_URL` is the backend origin from step 2.
5. Update backend `FRONTEND_URL` and any preview `TRUSTED_ORIGINS` to the actual frontend origin(s), restart the backend, and rebuild the frontend if its API origin changed. Do not grant wildcard preview domains.
6. Configure SPA fallback: `public/_redirects` is copied into `dist` for Netlify-compatible hosts; `vercel.json` covers Vercel. On nginx, use `try_files $uri $uri/ /index.html;`. Serve `/assets/*` as files, not SPA HTML, with immutable caching; do not cache `index.html` indefinitely.

### CORS, cookies and trusted origins

Preferred production topology: `https://app.example.com` and `https://api.example.com`, on independent hosts with a shared parent domain.

- `FRONTEND_URL` equals the frontend's exact HTTPS origin.
- `BETTER_AUTH_URL` equals the public API's exact HTTPS origin.
- `VITE_API_URL` equals that same API origin.
- Use `COOKIE_SAME_SITE=lax`. Set `COOKIE_DOMAIN=example.com` to enable Better Auth's cross-subdomain cookie option when all relevant subdomains are trusted. Leave it empty for narrower API-host-only cookies if cross-subdomain sharing is unnecessary.
- Secure and HttpOnly cookies are enabled in production. The app does not store auth tokens in localStorage; localStorage contains only the theme, while sessionStorage holds a non-secret checkout idempotency key.
- `TRUST_PROXY=1` is correct only behind one trusted proxy; match your actual topology and prevent direct bypass of that proxy.
- API CORS returns the requesting allowed origin and `Access-Control-Allow-Credentials: true`, never `*`. Preflights support the methods plus `Content-Type` and `Idempotency-Key` headers.
- Store mutations require an allowed `Origin` as CSRF protection; direct API scripts must also send that header. Better Auth separately handles its own origin/CSRF protection. Neither CSRF nor origin validation is disabled.
- Different registrable domains require `COOKIE_SAME_SITE=none`, HTTPS and an empty `COOKIE_DOMAIN`. **This still fails in browsers that block third-party cookies, especially Safari ITP.** Cookie attributes cannot override that browser policy.

For completely unrelated domains, prefer a **reverse-proxy rewrite** of `/api/*` on the frontend host to the backend. It must be a server-side proxy (HTTP 200 rewrite), not a browser 301/302 redirect. Proxy all `/api` routes, preserve cookie headers and the browser Origin, and put the proxy rule before the SPA fallback. Set `VITE_API_URL` and `BETTER_AUTH_URL` to the public frontend/proxy origin, `FRONTEND_URL` to that same origin, `COOKIE_SAME_SITE=lax`, and leave `COOKIE_DOMAIN` empty. The API still runs on its own host; its public auth entrypoint is now the proxy. On Netlify, the shape is `/api/* https://YOUR_API_HOST/api/:splat 200`; on Vercel, add a `/api/:path*` rewrite to your API destination before the catch-all rewrite. Substitute the real deployment destination in your host configuration.

Current integration references: [Express 5 handler](https://better-auth.com/docs/integrations/express), [MongoDB adapter](https://better-auth.com/docs/adapters/mongo), [cookies, subdomains and Safari ITP](https://better-auth.com/docs/concepts/cookies), [separate-app additional fields](https://better-auth.com/docs/concepts/typescript).

## API contract

All store responses are JSON. Errors use `{ "error": { "code": "…", "message": "…", "fields": {} } }`; `fields` is present for validation errors. Better Auth endpoints retain Better Auth's own error contract. The frontend handles both. IDs and route/query/body input are validated with Zod. Collections paginate with `{items,total,page,pages}`; page starts at 1 and maximum limit is 48.

| Routes | Access / behavior |
| --- | --- |
| `GET /health` | Public, 200 when connected; 503 when not connected. |
| `/api/auth/*` | Better Auth handler, mounted before JSON parsing. |
| `GET /api/config` | Currency and delivery pricing. |
| `GET /api/me` | Current authenticated user. |
| `GET /api/products` | `q`, `category`, `minPrice`, `maxPrice` (minor units), `featured`, `deal`, `inStock`, `page`, `limit`, `sort`. Sort: `featured`, `newest`, `price-asc`, `price-desc`, `rating`. |
| `GET /api/products/:slug` | Active product details. |
| `GET /api/categories` | Public categories. |
| `GET/POST /api/products/:id/reviews` | Paginated reads; writes require a delivered purchase, one review per user/product. |
| `GET /api/cart` | Current user's cart, joined to current catalog prices. |
| `PUT /api/cart/items` | `{productId,variant,quantity}`; quantity 0 removes, otherwise absolute quantity 1–20. |
| `GET/POST /api/orders` | Own orders; checkout takes `{address,paymentMethod:"cod",expectedTotal}` and UUID `Idempotency-Key`. |
| `GET /api/orders/:id` | Owner-only snapshot including delivery address and purchase prices. |
| `GET/POST /api/addresses` | Own addresses. |
| `PUT/DELETE /api/addresses/:id` | Owner-only update/removal. |
| `GET /api/admin/stats` | Delivered revenue, order/product counts and low stock. |
| `GET/POST /api/admin/products` | Paginated management list / create. |
| `PUT/DELETE /api/admin/products/:id` | Update / soft archive; order snapshots are preserved. |
| `POST /api/admin/categories` | Create category. |
| `PUT/DELETE /api/admin/categories/:id` | Edit / remove only when unused; slugs are immutable. |
| `GET /api/admin/orders` | Paginated full store order list. |
| `GET/PATCH /api/admin/orders/:id` | View / transition status. |

## Correctness and deliberate defaults

Prices are integers in paise. India/INR, tax-inclusive catalog prices, flat ₹99 delivery below ₹5,000 and COD are the initial business defaults. Change the env and the related localization/validation together for another market. Finishes share a product-level stock pool and price; SKU-level inventory is a future extension.

Orders recalculate from the server cart and current products. `expectedTotal` is only a customer-consent guard: a changed total aborts, and the frontend asks for review. It never determines the amount. Inventory uses a conditional `stock >= quantity` update; order creation, stock changes and clearing the user's cart happen in one MongoDB transaction. Insufficient inventory or any later failure rolls back the whole operation. The unique `(userId,idempotencyKey)` index prevents double orders; a request fingerprint rejects reusing the key for different checkout details. Simultaneous edits to the same cart cause a transaction retry.

Order flow is `placed → processing → shipped → delivered`; placed/processing may transition to cancelled. Cancellation restores stock once, in the same transaction as the status change. Delivered COD orders are recorded as paid. The admin should mark delivered only after delivery and cash collection are confirmed. Product archival preserves order snapshots. Category removal is rejected while referenced, including by archived products.

`PaymentProvider` is a typed, deterministic preparation interface with a COD implementation. For Razorpay/Stripe, add a pending payment intent/outbox and initialize the remote provider **after** the database commit, using the order ID as the provider idempotency key. Verify webhook signatures and reconcile payment/refund states before adding online payment methods to the UI. Do not make network/payment calls inside a transaction callback, which MongoDB may retry. No live online payment integration is claimed.

Better Auth exclusively manages its user/account/session/verification collections through the MongoDB adapter; the Mongoose User model is a read-only view. `role` is server-only (`input: false`), defaults to `user`, and only the seed/admin provisioning process promotes accounts. No backend auth types are imported into the frontend.

The component primitives follow shadcn's source-owned Button/CVA/Slot pattern, with Radix Dialog sheets/modals and Tabs. Tailwind CSS 4 and explicit CSS tokens define the storefront. Routes are lazy-loaded. Zustand is intentionally omitted: Query owns server state and React owns local UI state.

TypeScript is `typescript@^7` (locked to 7.0.2) in each app, with strict/noUncheckedIndexedAccess/noImplicitOverride enabled. `tsc` builds the API and typechecks both apps; `tsx watch` handles backend development without old compiler APIs. Installed Vite/React tooling works with TypeScript 7, so no TypeScript 6 tooling alias or downgrade was needed. `skipLibCheck` skips dependency declaration internals; application source remains strictly checked.

Email verification/password reset delivery, live payment gateways, upload storage, carrier integrations and automated returns are not configured. They were not needed for the requested email/password + COD flows. Product images are external public URLs, so neither app relies on local upload files. Replace the seed imagery and the starter delivery/returns text with merchant-approved content before a real launch. Page titles/description/Open Graph tags update per route in the client; crawlers that do not execute JavaScript need prerendering or SSR for product-specific share previews.

The Express request limiters use process memory, while Better Auth uses its database rate-limit store. Better Auth receives the client IP through a private header that is always overwritten from Express's proxy-aware IP; caller-provided values cannot bypass the limiter. For multiple API replicas, supply a shared Express limiter store or enforce equivalent limits at the gateway. In production, configure log retention, database backups and TLS at the hosting layer. The backend Docker image build was verified; integration tests run Node directly against the local replica set.

## Verification

Completed locally: both TypeScript 7 typechecks and production builds, 3 domain tests, 36 API integration checks, and the backend Docker image build. Browser checks covered registration, sign-in, cart, COD checkout, order confirmation, admin product editing and cancellation with stock restoration. Home and checkout layouts were checked at 320, 360, 768 and 1280 pixels; no page-level horizontal overflow was observed. These checks do not constitute a hosted production deployment.

```sh
cd backend
pnpm typecheck
pnpm build
pnpm test
# With a seeded local API already running from this same .env:
pnpm test:e2e
```

```sh
cd frontend
pnpm typecheck
pnpm build
```

The integration suite uses real HTTP cookies, real Better Auth and a real MongoDB replica set. It creates uniquely named fixtures and removes only its own data. It rejects `NODE_ENV=production`; point both the API and test process at the same development database. Coverage includes registration/sign-in/sign-out, roles, CORS/origin protection, catalog validation, cart isolation, addresses, price tampering, transaction rollback, simultaneous idempotency retries, last-item inventory races, order ownership/lifecycle, verified reviews, cancellation restocking and archival. No external payments or email are sent.

Local URL audit (run from the repository root):

```sh
rg -n 'localhost|127\.0\.0\.1|https?://' backend/src frontend/src frontend/vite.config.ts
```

Service origins and image hosts are read from environment; expected local URLs belong only in examples and documentation. The SVG XML namespace and the shadcn schema URL are metadata, not service endpoints.
