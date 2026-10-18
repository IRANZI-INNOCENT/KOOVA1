# KCOVA SEO — What we built and what you need to do

This document explains the SEO work shipped for KCOVA (Phases 0–4), how the system works, and the exact actions you must take on Railway and in Google/Bing for it to pay off.

---

## 1. Goal (in one sentence)

Appear when people search for **problems** (WhatsApp shop, Instagram selling, Nairobi fashion) and when buyers search for **merchant products** — not only when someone already knows “KCOVA”.

---

## 2. Strategy summary

| Layer | Purpose |
|--------|---------|
| **Brand site** | Homepage, guides, “for” pages — non-brand discovery |
| **Merchant storefront** | Every published `/store/...` page is crawlable HTML with real titles |
| **Engines** | Google, Bing/DDG (IndexNow), WhatsApp/FB link previews (Open Graph), AI engines (`llms.txt`) |
| **Ops in workspace** | SEO health score so owners keep listings search-ready |

**Important:** Social autopilot already appends product URLs to posts. Those URLs only help SEO/shares if the public pages are SSR with metadata (they now are).

---

## 3. What we built (by phase)

### Phase 0 — Foundations

| Feature | Where | What it does |
|---------|--------|----------------|
| `metadataBase`, Open Graph, Twitter cards | `frontend/app/layout.tsx`, `lib/seo.ts` | Correct titles/descriptions/images when links are shared |
| Canonical URLs | `lib/seo.ts` → `buildPageMetadata` | One preferred URL per page |
| `robots.txt` | `frontend/app/robots.ts` | Allows marketing + stores; blocks workspace/login/signup/api |
| `noindex` on private areas | `workspace/`, `login/`, `signup/`, `offline/` layouts | Stops thin auth pages from competing in search |
| Organization JSON-LD | Root layout | Helps search/AI understand the company entity |
| FAQPage JSON-LD | Homepage | Landing FAQ eligible for rich results |

### Phase 1 — Merchant SEO moat (highest impact)

| Feature | Where | What it does |
|---------|--------|----------------|
| SSR store + product pages | `app/store/[slug]/...` | Crawlers see real HTML (not a loading spinner) |
| `generateMetadata` from `seo_title` / `seo_description` | Same | Product DB fields become `<title>` and meta description |
| Product + Offer JSON-LD | Product page | Path to product rich results |
| Store JSON-LD | Store page | Store entity markup |
| Store `<h1>` | Store page | Clear shop heading for SEO |
| Dynamic sitemap | `app/sitemap.ts` + API `GET /api/commerce/public/sitemap/` | Lists marketing URLs + all published stores/products |
| IndexNow-ready catalog API | `PublicSitemapCatalogView` | Feeds the Next sitemap |

### Phase 2 — Non-brand content

| URL | Role |
|-----|------|
| `/for/whatsapp-shops` | Intent: WhatsApp selling |
| `/for/instagram-sellers` | Intent: Instagram → orders |
| `/guides` | Guide hub |
| `/guides/sell-on-whatsapp-kenya` | How-to |
| `/guides/instagram-to-whatsapp-orders` | How-to |
| `/guides/product-photos-to-listings` | Snap-to-Sell style how-to |

Guides include **Article + HowTo** JSON-LD. Content source: `frontend/lib/marketing-content.ts`. Nav/footer link to Guides and key “for” pages.

### Phase 3 — Multi-engine ops

| Feature | Where | What it does |
|---------|--------|----------------|
| IndexNow pings | `backend/.../indexnow.py` | Notifies Bing/partners when a store is published or a product goes live |
| Key file | `https://YOUR-SITE/indexnow-key.txt` | Proves ownership for IndexNow |
| GSC / Bing verification meta | Layout env vars | HTML-tag verification without committing secrets |
| `llms.txt` | `https://YOUR-SITE/llms.txt` | Short site map for AI answer engines |
| Docs | `RAILWAY.md` §9c | Deploy checklist |

### Phase 4 — Local pages + merchant SEO health

| Feature | Where | What it does |
|---------|--------|----------------|
| Local/industry pages | `/for/nairobi-shops`, `/for/mombasa-shops`, `/for/fashion-kenya`, `/for/beauty-kenya`, `/for/campus-sellers` | Geo/industry discovery (`lib/local-intent.ts`) |
| SEO health score | Product editor in workspace | Live % + checklist (name, price, photos, SEO fields, alt, keywords, active) |
| Character counter | SEO description field | Targets ~50–160 characters |

---

## 4. Public URL map (what should be indexed)

**Index these**

- `/`
- `/guides`, `/guides/*`
- `/for/*`
- `/store/{slug}`, `/store/{slug}/{productSlug}` (published only)
- `/privacy`, `/terms`, `/cookies`, `/ai`
- `/sitemap.xml`, `/robots.txt`, `/llms.txt`

**Do not index (blocked / noindex)**

- `/workspace/*`
- `/login`, `/signup`, `/offline`
- `/api/*`

---

## 5. Environment variables you must set

### Site service (Next.js)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | **Yes** | Public site origin, **no trailing slash** (canonicals, OG, sitemap, robots) |
| `INDEXNOW_KEY` | Recommended | Same key as API; serves `/indexnow-key.txt` |
| `GOOGLE_SITE_VERIFICATION` or `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | For GSC | Google HTML-tag content value |
| `BING_SITE_VERIFICATION` or `NEXT_PUBLIC_BING_SITE_VERIFICATION` | For Bing | `msvalidate.01` content value |
| `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_PUBLIC_URL` | As today | SSR store pages fetch the public commerce API |

### API service (Django)

| Variable | Required | Purpose |
|----------|----------|---------|
| `FRONTEND_URL` | **Yes** | Must match public site origin (product links + IndexNow host) |
| `INDEXNOW_KEY` | Recommended | **Identical** to site `INDEXNOW_KEY` |
| `INDEXNOW_DISABLED=1` | Optional | Turns off IndexNow without removing the key |

Generate `INDEXNOW_KEY` once (e.g. a UUID without dashes). Set the **same value** on site and API.

---

## 6. What YOU need to do (checklist)

### A. Before / right after deploy

- [ ] Set `NEXT_PUBLIC_SITE_URL` on the **site** service to your live URL  
- [ ] Set `FRONTEND_URL` on the **API** service to that **same** URL  
- [ ] Generate and set `INDEXNOW_KEY` on **both** site and API  
- [ ] Redeploy site + API  
- [ ] Open and confirm:
  - [ ] `https://YOUR-SITE/robots.txt`
  - [ ] `https://YOUR-SITE/sitemap.xml` (includes `/`, guides, `/for/*`, and published stores)
  - [ ] `https://YOUR-SITE/indexnow-key.txt` (returns the key as plain text)
  - [ ] `https://YOUR-SITE/llms.txt`
  - [ ] A published store page shows the **shop name** as `<h1>` and a normal title in the browser tab
  - [ ] A product page title uses `seo_title` (or a sensible fallback) and sharing preview looks correct (WhatsApp/Facebook debugger optional)

### B. Google Search Console

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add a property for `https://YOUR-SITE` (URL-prefix is fine)
3. Choose **HTML tag** verification → copy the content value  
4. Set it as `GOOGLE_SITE_VERIFICATION` (or `NEXT_PUBLIC_…`) on the **site** service → redeploy site  
5. Click Verify  
6. **Sitemaps** → submit: `https://YOUR-SITE/sitemap.xml`  
7. Use **URL Inspection** on homepage + one store + one product after they are live  

### C. Bing Webmaster Tools

1. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters)
2. Add the same site  
3. Verify with the meta tag → set `BING_SITE_VERIFICATION` on the site → redeploy  
4. Submit the same sitemap URL  
5. IndexNow will also notify Bing automatically when stores/products publish (once `INDEXNOW_KEY` is set)

### D. Product / content ops (ongoing)

- [ ] For each important product: open workspace → product → check **SEO health** toward “Strong”  
- [ ] Fill **SEO title** (~15–70 chars) and **SEO description** (~50–160 chars) — polish AI can draft these; you confirm  
- [ ] Prefer **2+ photos** (unlocks real carousels + better previews)  
- [ ] Keep products **Active** and the commerce page **Published**  
- [ ] Add new guides/local pages in code when needed:
  - Guides / core “for” pages → `frontend/lib/marketing-content.ts`
  - City/industry pages → `frontend/lib/local-intent.ts`

### E. Optional but valuable

- [ ] Share a product link in WhatsApp and confirm the preview title/image look right  
- [ ] After big content launches, re-submit sitemap or wait for crawlers (IndexNow already covers catalog changes)  
- [ ] Do **not** create dozens of thin city pages — only add locales/industries with real unique copy (same pattern as existing seeds)

---

## 7. How merchant SEO works end-to-end

```
Owner adds product + photos + price
        ↓
Snap to Sell / Polish can fill seo_title, seo_description, alt, keywords
        ↓
Owner checks SEO health in workspace and saves
        ↓
Product Active + Store Published
        ↓
Public SSR page at /store/{slug}/{productSlug}
  • <title> / meta / Open Graph from seo_* fields
  • Product + Offer JSON-LD
        ↓
Sitemap lists the URL · IndexNow pings Bing/partners
        ↓
Social posts can link the same URL (captions already append product links)
```

If `NEXT_PUBLIC_SITE_URL` / `FRONTEND_URL` are wrong, canonicals, OG images, IndexNow host, and shared links will point at the wrong place.

---

## 8. Key files (for engineers)

| Area | Path |
|------|------|
| SEO helpers | `frontend/lib/seo.ts`, `frontend/lib/site-url.ts` |
| Public store fetch | `frontend/lib/public-store-api.ts` |
| Robots / sitemap | `frontend/app/robots.ts`, `frontend/app/sitemap.ts` |
| Store SSR | `frontend/app/store/[slug]/page.tsx`, `.../[productSlug]/page.tsx` |
| Guides & intent | `frontend/lib/marketing-content.ts`, `frontend/lib/local-intent.ts` |
| SEO health | `frontend/lib/product-seo-health.ts`, `components/commerce/seo-health-card.tsx` |
| IndexNow | `backend/apps/commerce/services/indexnow.py` |
| Sitemap catalog API | `GET /api/commerce/public/sitemap/` |
| Deploy notes | `RAILWAY.md` §9c |

---

## 9. What we deliberately did *not* do yet

- Full Swahili / `hreflang` locale pack (en-KE is set; expand later if needed)
- Automatic Google Indexing API (IndexNow covers Bing ecosystem; GSC still needs sitemap + crawl)
- Pricing page (add when pricing is finalized)
- Burning slide text onto carousel images (native multi-image publish is separate from SEO)

---

## 10. Success metrics to watch

| Metric | Where | Cadence |
|--------|--------|---------|
| Indexed pages | Google Search Console → Pages | Weekly |
| Non-brand queries | GSC → Queries (exclude “kcova”) | Monthly |
| Store/PDP impressions | GSC → Pages filtered by `/store/` | Weekly |
| SEO health on top SKUs | Workspace product editor | Before big campaigns |
| Sitemap freshness | Open `/sitemap.xml` after publishing a store | After releases |

---

## 11. Quick “is it working?” test

1. Publish one store with two products that have SEO titles filled in.  
2. Open `/sitemap.xml` — those URLs appear.  
3. Open a product URL in a private window — tab title matches SEO title; View Source shows `og:title` and `application/ld+json`.  
4. With IndexNow configured, publish/activate a product and check API logs for `IndexNow accepted`.  
5. After GSC verification, request indexing on that product URL once.

---

*Last updated for SEO Phases 0–4. For Railway-specific admin/deploy steps beyond SEO, see `RAILWAY.md`.*
