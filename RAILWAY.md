# Deploy Kova on Railway

## Fix: “Railpack could not determine how to build the app”

If deploy logs show the repo root as `backend/`, `frontend/`, and `manage.py` together, the service **Root Directory** is wrong. Railpack must run inside **`backend`** or **`frontend`**, not the parent `kova` folder.

| What you see at the top of the log | Set Root Directory to |
| --- | --- |
| `backend/`, `frontend/`, `RAILWAY.md` | **`backend`** (API) or **`frontend`** (site) |
| `kova/backend/`, `kova/frontend/` | **`kova/backend`** or **`kova/frontend`** |

In Railway: open the service → **Settings** → **Root Directory** → save → redeploy.

Each service only loads `railway.toml` from that root (for example `backend/railway.toml`).

---

Kova runs as two Railway services from this folder, plus a Postgres database.

| Service | Root directory | What it does |
| --- | --- | --- |
| API | `kova/backend` | Django, product photos, Facebook callback, comment pulls, scheduled posts |
| Site | `kova/frontend` | The Next.js site |
| Postgres | Railway plugin | The API database |

The API start script also runs the scheduler. Comments are pulled and due posts are sent every minute, on the same disk as the uploaded photos. A Railway volume can be attached to only one service, so a separate worker would not see those files.

Copy secret values from `kova/backend/.env` into the Railway dashboard. Leave that file on this machine. Do not commit it.

Use the public `https://` address Railway gives each service. The examples below say `YOUR-API` and `YOUR-SITE`. Replace those with the real hostnames after Railway generates them.

## 1. Create the project

1. Sign in at [railway.com](https://railway.com).
2. Create a new project.
3. Connect the Git repository that contains this `kova` folder, or deploy from this machine with the Railway CLI.

Railway reads `railway.toml` from each service **Root Directory**. If the connected Git repo is the **`kova`** folder, use **`backend`** and **`frontend`**. If the repo is the parent monorepo, use **`kova/backend`** and **`kova/frontend`**.

## 2. Add Postgres

1. In the project, choose **New** → **Database** → **PostgreSQL**.
2. Wait until the database is running.
3. You will attach it to the API in the next step. Railway then provides `DATABASE_URL`. Production settings read that variable. You do not type the database password yourself.

## 3. Create the API service

1. Choose **New** → **GitHub Repo** (or the same empty-service flow you use for a local upload).
2. Select this repository.
3. Open the service **Settings**.
4. Set **Root Directory** to `kova/backend`.
5. Railway will use `kova/backend/railway.toml`:
   - Before each deploy it runs migrations and collects static files.
   - It starts with `sh scripts/web.sh`.
   - The health check is `GET /api/health/`.
6. In **Settings → Networking**, generate a public domain. Copy it. That hostname is `YOUR-API`.

Leave this service undeployed until the variables in the next step are saved. If it already started and crashed, set the variables and redeploy.

## 4. Set the API variables

Open the API service → **Variables**.

Attach the Postgres database with **Add variable reference** / **Variable Reference** so `DATABASE_URL` points at the database service. The name on the API must be `DATABASE_URL`.

Then add these yourself. Values marked “from local `.env`” are copied from `kova/backend/.env` and are not written in this file.

| Variable | Value |
| --- | --- |
| `DJANGO_SECRET_KEY` | A long random string (**32+ characters**). Use Railway’s secret generator. Shorter keys trigger JWT warnings; changing the key logs everyone out. |
| `FRONTEND_URL` | Leave this for step 8, after the site has a domain. If Railway requires a value now, use `https://placeholder.invalid` and replace it in step 8. |
| `CORS_ALLOWED_ORIGINS` | The same address you put in `FRONTEND_URL`, with no path on the end. |
| `OPENROUTER_API_KEY` | From local `.env` |
| `OPENROUTER_MODEL` | `google/gemini-3.8-flash` |
| `OPENROUTER_SITE_URL` | The public site URL, once you have it. Same host as `FRONTEND_URL`. |
| `OPENROUTER_APP_NAME` | `Kova` |
| `FACEBOOK_APP_ID` | From local `.env` |
| `FACEBOOK_APP_SECRET` | From local `.env` |
| `FACEBOOK_WEBHOOK_VERIFY_TOKEN` | `kova`, unless you already chose another token in the local `.env` |
| `MEDIA_ROOT` | `/data/media` (optional if the volume is mounted at `/data`; production defaults to `/data/media` on Railway when this is empty) |
| `LINKEDIN_CLIENT_ID` | Optional — LinkedIn Developer app (Share on LinkedIn). Without these, professional posts still work via **Copy**. |
| `LINKEDIN_CLIENT_SECRET` | Optional — pair with `LINKEDIN_CLIENT_ID`. |
| `LINKEDIN_REDIRECT_URI` | Optional override. If unset, Kova uses `{FRONTEND_URL}/api/professional/linkedin/callback/` (correct when the site proxies `/api`). |

**LinkedIn OAuth redirect (Developer app → Auth):** register **exactly** (trailing slash included):

`https://YOUR-SITE.up.railway.app/api/professional/linkedin/callback/`

Do **not** use the API service hostname here when the browser uses the site proxy (`API_PROXY_TARGET`). That mismatch causes LinkedIn’s “redirect_uri does not match the registered value”.

`DJANGO_SETTINGS_MODULE` is already set to `config.settings.production` by the start script and by `preDeployCommand` in `railway.toml`. Local development keeps using `config.settings.development`.

Production refuses to start without `DJANGO_SECRET_KEY` and `DATABASE_URL`.

`DJANGO_ALLOWED_HOSTS` can stay empty. Production settings already allow the Railway public and private hostnames.

## 5. Add the photo volume

Product photos are files on disk. Without a volume, a redeploy deletes them.

1. Open the API service → **Volumes** (or **Settings → Volumes**).
2. Add a volume.
3. Set the mount path to `/data`.
4. Confirm `MEDIA_ROOT` is `/data/media`.

Uploads are stored under that directory. Public photo addresses look like:

`https://YOUR-API.up.railway.app/media/commerce/products/...`

Instagram can fetch a photo from that public address. It cannot fetch a file that only exists on your computer.

## 6. Create the site service

1. In the same project, add a second service from the same repository.
2. Set **Root Directory** to `kova/frontend`.
3. Railway will run `npm run build`, then `npm run start`. The site listens on `0.0.0.0` and on Railway’s `PORT`.
4. The health check is `/`.

Set these variables **before the first build** (recommended — keeps login cookies on the site host):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `/api` |
| `NEXT_PUBLIC_API_PUBLIC_URL` | `https://YOUR-API.up.railway.app/api` |
| `API_PROXY_TARGET` | `https://YOUR-API.up.railway.app/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://YOUR-SITE.up.railway.app` (same as your site domain; used for server-side `/api` fetches) |

The site serves `/api/*` and Next.js **rewrites** those requests to `API_PROXY_TARGET`. The browser only talks to `YOUR-SITE`, so the HttpOnly `kova_refresh_token` cookie is first-party and survives refresh / PWA install.

`NEXT_PUBLIC_API_PUBLIC_URL` must stay the **absolute API URL** — Meta OAuth callbacks still hit the API host directly.

Next.js bakes `NEXT_PUBLIC_*` values in at build time. Change them only together with a **new site deploy** (rebuild).

**Legacy setup (cross-origin API):** you can still set `NEXT_PUBLIC_API_URL` to `https://YOUR-API.up.railway.app/api`, but refresh cookies are third-party between two Railway hostnames and many browsers will drop them — expect redirect-to-login loops. Prefer the proxy table above.

Generate a public domain for the site. That hostname is `YOUR-SITE`.

## 7. Point the API at the site

Go back to the API variables and set:

| Variable | Value |
| --- | --- |
| `FRONTEND_URL` | `https://YOUR-SITE.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | `https://YOUR-SITE.up.railway.app` |
| `OPENROUTER_SITE_URL` | `https://YOUR-SITE.up.railway.app` |

No trailing slash. No `/api` on these three. `FRONTEND_URL` is the address product links and the Facebook return path use. `CORS_ALLOWED_ORIGINS` is the browser origin allowed to send the login cookie.

Redeploy the API after saving these.

## 8. Deploy order

Do the deploys in this order:

1. Save the API variables, including `DATABASE_URL`, `DJANGO_SECRET_KEY`, the OpenRouter key, and the Facebook app id and secret.
2. Deploy the API. Open `https://YOUR-API.up.railway.app/api/health/`. The response is `{"status":"ok"}`.
3. Set `NEXT_PUBLIC_API_URL` on the site, then deploy the site.
4. Set `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, and `OPENROUTER_SITE_URL` on the API, then redeploy the API.

If you had to guess the API hostname, fix `NEXT_PUBLIC_API_URL` and redeploy the site.

Each API deploy runs:

```sh
python manage.py migrate --noinput
python manage.py collectstatic --noinput
```

Then `scripts/web.sh` starts Gunicorn and the loop in `scripts/worker.sh`. Each minute that loop runs:

- `dispatch_social_posts` — send due scheduled posts  
- `pull_comments` — fetch recent Meta comments  
- `run_autopilot` — Autopilot shift when mode is on  

Do not run `scripts/worker.sh` on a second service unless the API no longer starts it (see section 10). Two loops would double-send posts.

## 9. Facebook and Instagram

In the Meta developer app used by the local `.env` values:

1. Add this **Valid OAuth Redirect URI**, including the trailing slash:

   `https://YOUR-API.up.railway.app/api/social/meta/callback/`

2. The callback Facebook redirects to is that same address. Kova then sends the person to:

   `https://YOUR-SITE.up.railway.app/workspace/social/channels`

3. For comment delivery, add a webhook:

   - Callback URL: `https://YOUR-API.up.railway.app/api/social/meta/webhook/`
   - Verify token: the same long random string as `FACEBOOK_WEBHOOK_VERIFY_TOKEN` on the API service
   - POST payloads are rejected unless `X-Hub-Signature-256` matches `FACEBOOK_APP_SECRET` (Meta signs every delivery)

The login dialog requests these scopes (see `apps/social/services/capabilities.py`):

- Facebook: `pages_show_list`, `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`, `pages_messaging`
- Instagram: `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_messages`

Owners who connected before new scopes were added must reconnect from **Channels**.

The scheduler also pulls comments every minute, so a missed webhook is picked up on the next loop.

## 9b. Django admin and deploy superuser (API service)

Set on the **API** service only:

| Variable | Purpose |
|----------|---------|
| `KOVA_SUPERUSER_EMAIL` | Admin login email (`DJANGO_SUPERUSER_EMAIL` also accepted) |
| `KOVA_SUPERUSER_PASSWORD` | At least 12 characters (`DJANGO_SUPERUSER_PASSWORD` also accepted). Synced on deploy when it does not already match |
| `KOVA_SUPERUSER_FORCE_PASSWORD` | Set to `1` to always rewrite the password on deploy |
| `KOVA_SUPERUSER_OPTIONAL` | Set to `1` only if you intentionally skip creating an admin (otherwise production **fails** the deploy when email/password are missing) |
| `KOVA_ADMIN_GATE_SECRET` | Long random secret to open admin (optional if `DJANGO_SECRET_KEY` is set — see below) |
| `KOVA_ADMIN_URL` | Optional path prefix (default `admin/`) |
| `KOVA_ADMIN_IP_ALLOWLIST` | Optional comma-separated IPs/CIDRs allowed to reach admin |

`ensure_superuser` runs in the Railway **preDeploy** hook after migrations and **before** `collectstatic`, so a static-files failure cannot skip admin creation. Missing credentials on Railway fail the deploy (clear error in logs) instead of silently skipping.

**Opening admin in production**

1. Visit once (bookmark this; do not share publicly):

   `https://YOUR-API.up.railway.app/admin/?kova_admin_gate=YOUR_KOVA_ADMIN_GATE_SECRET`

2. The gate sets an HttpOnly cookie for seven days; then sign in with `KOVA_SUPERUSER_EMAIL` / your password.

Without the gate query param, `/admin/` returns 403.

If you omit `KOVA_ADMIN_GATE_SECRET`, the gate value is derived from `DJANGO_SECRET_KEY` (SHA-256 of `SECRET_KEY + ":kova-admin-gate-v1"`). Set an explicit `KOVA_ADMIN_GATE_SECRET` when you want admin access independent of rotating the Django secret.

## 9c. SEO — Search Console, Bing, IndexNow (site + API)

Public discovery depends on the **site** host (`NEXT_PUBLIC_SITE_URL` / `FRONTEND_URL`).

### Variables

| Where | Variable | Purpose |
|-------|----------|---------|
| Site | `NEXT_PUBLIC_SITE_URL` | Canonical origin (no trailing slash) |
| Site | `INDEXNOW_KEY` | Same random key as API (serves `/indexnow-key.txt`) |
| Site | `GOOGLE_SITE_VERIFICATION` or `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | Google Search Console HTML-tag content |
| Site | `BING_SITE_VERIFICATION` or `NEXT_PUBLIC_BING_SITE_VERIFICATION` | Bing `msvalidate.01` content |
| API | `FRONTEND_URL` | Must match the public site origin |
| API | `INDEXNOW_KEY` | Same key as site; enables pings on store/product publish |
| API | `INDEXNOW_DISABLED=1` | Optional kill switch |

Generate a long random `INDEXNOW_KEY` (UUID without dashes is fine). Set it on **both** services.

### After deploy

1. Confirm `https://YOUR-SITE/sitemap.xml` and `https://YOUR-SITE/robots.txt`.
2. Confirm `https://YOUR-SITE/indexnow-key.txt` returns the key body.
3. Confirm `https://YOUR-SITE/llms.txt` loads (AI-engine summary).
4. **Google Search Console** → Add the site property → verify with the meta tag env var → Submit sitemap `https://YOUR-SITE/sitemap.xml`.
5. **Bing Webmaster Tools** → Add site → verify → Submit the same sitemap (IndexNow also notifies Bing automatically when catalogs publish).

Publishing a store or activating a product triggers IndexNow for that store URL and product URLs. Failures are logged and never block commerce.

Local / industry landing pages live under `/for/*` (e.g. Nairobi shops, fashion Kenya). Product SEO health scores appear in the commerce product editor to keep public listings crawl-ready.

## 10. Check the live site

1. `https://YOUR-API.up.railway.app/api/health/` returns `{"status":"ok"}` (503 if Postgres is not attached).
2. `https://YOUR-SITE.up.railway.app` opens the site.
3. Sign up or sign in. The refresh cookie is sent from the site to the API, so both addresses must be the ones you set above.
4. Open a public store page and confirm a product photo loads from `https://YOUR-API.up.railway.app/media/...`.
5. In **Commerce → Store**, set brand colors / logo / layout, save, publish, and confirm the live `/store/...` header matches (migration `0005_commercepage_branding` runs with the usual preDeploy migrate). Custom domains ship later; “Powered by KCOVA” stays for now.
6. Connect a Facebook Page from **Channels** after the redirect URI is saved in the Meta app.
7. In the API deploy logs, look for `Attempted` from the scheduler and a comment pull on the first minute.

## Pre-deploy checklist (this repo)

- [ ] API root `kova/backend`, site root `kova/frontend`
- [ ] Postgres linked → `DATABASE_URL` on API
- [ ] Volume on API at `/data`, or `MEDIA_ROOT=/data/media`
- [ ] `NEXT_PUBLIC_API_URL` set on site **before** first build
- [ ] `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS`, `OPENROUTER_SITE_URL` match the public site (no trailing slash)
- [ ] Meta OAuth redirect and webhook URLs use `YOUR-API`
- [ ] Landing assets under `kova/frontend/public/landing/` are committed (static images for the marketing site)

## Separate scheduler service

Use this only if you change the API start command back to Gunicorn alone:

```sh
DJANGO_SETTINGS_MODULE=config.settings.production gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

Then add a third service:

- Same repository and the same root directory, `kova/backend`
- The same variables as the API, including `DATABASE_URL`
- Custom start command: `sh scripts/worker.sh`

Run that loop in one place. Starting it on the API and again on a third service would send due posts twice.

That third service has its own disk. Scheduled Facebook photos look for the file under `MEDIA_ROOT`. Keep the volume, and the loop, on the service that receives uploads. The default `scripts/web.sh` start command already does that.

## Local development stays the same

`kova/backend/.env` is still the local file. `DATABASE_URL` stays empty there. Django on this machine keeps using `POSTGRES_HOST`, `POSTGRES_PORT` (5433 in this project), and `config.settings.development`.

The site on this machine keeps using `http://localhost:8000/api` when `NEXT_PUBLIC_API_URL` is unset.
