# LinkedIn OAuth — Kova Fashions (Railway)

Use these hostnames (yours):

| Service | Public host |
| --- | --- |
| Site | `https://site-service-production-6036.up.railway.app` |
| API | `https://api-service-production-f044.up.railway.app` |

## LinkedIn Developer app

**Auth → Authorized redirect URLs for OAuth 2.0** — add exactly:

```text
https://site-service-production-6036.up.railway.app/api/professional/linkedin/callback/
```

Products: **Sign In with LinkedIn using OpenID Connect**, **Share on LinkedIn**.

## API service variables

| Variable | Value |
| --- | --- |
| `FRONTEND_URL` | `https://site-service-production-6036.up.railway.app` |
| `CORS_ALLOWED_ORIGINS` | `https://site-service-production-6036.up.railway.app` |
| `OPENROUTER_SITE_URL` | `https://site-service-production-6036.up.railway.app` |
| `API_PUBLIC_URL` | `https://api-service-production-f044.up.railway.app` |
| `LINKEDIN_CLIENT_ID` | From LinkedIn app |
| `LINKEDIN_CLIENT_SECRET` | From LinkedIn app |

Do **not** set `LINKEDIN_REDIRECT_URI` unless you intentionally use the API hostname in LinkedIn (advanced).

Kova builds the redirect as: `{FRONTEND_URL}/api/professional/linkedin/callback/`

## Site service variables

Set before **build**; redeploy site after changes.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `/api` |
| `API_PROXY_TARGET` | `https://api-service-production-f044.up.railway.app/api` |
| `NEXT_PUBLIC_API_PUBLIC_URL` | `https://api-service-production-f044.up.railway.app/api` |
| `NEXT_PUBLIC_SITE_URL` | `https://site-service-production-6036.up.railway.app` |

## Smoke tests

1. `https://api-service-production-f044.up.railway.app/api/health/` → `{"status":"ok"}`
2. `https://site-service-production-6036.up.railway.app/api/health/` → same (proxy works)
3. Kova → **LinkedIn → Connect** — box shows the same redirect URL as in LinkedIn
