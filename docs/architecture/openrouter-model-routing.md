# OpenRouter model routing & cost guide

Kova sends all LLM work through `OpenRouterService` (`apps/kova_ai/services/openrouter.py`). Each call is labeled with a **task** (feature). Admin chooses which OpenRouter model that task uses.

**Source of truth for defaults:** `apps/kova_ai/services/model_routes.py`  
**Admin UI:** Django admin → **Kova → AI model control**  
**Usage log:** Django admin → **Kova → AI usage events** (`AiUsageEvent`)

---

## How routing works

1. Code calls `OpenRouterService.chat(..., feature="<task>")` (or wraps work in `track_ai_usage("<task>")`).
2. Resolver order:
   - one-off `model=` on the call, else
   - constructor `OpenRouterService(model=...)`, else
   - **DB row** `AiModelRoute` for that task, else
   - **catalog default** in `model_routes.py`, else
   - `OPENROUTER_MODEL` env
3. Alias: usage label `snap_to_sell` → route `product_vision`.

After changing routes in admin, the in-process cache is cleared on save. Redeployed workers pick up DB values on first resolve after cache miss.

**Migrate once:**

```bash
python manage.py migrate kova_ai
```

---

## Allowed models (admin dropdown)

| OpenRouter slug | Role | List price (approx., Oct 2026) | Best use cases |
|-----------------|------|--------------------------------|----------------|
| `google/gemini-2.5-flash-lite` | Cheapest Flash-family | **$0.10 / $0.40** per 1M in/out | High-volume short JSON, inbox replies, schedule slots, seeds, starter prompts, profile field drafts, broadcast packs |
| `google/gemini-3.1-flash-lite` | **Best cheap default** | **$0.25 / $1.50** per 1M | Captions & campaign packs, briefs, Autopilot plan, Ask Kova tools, Snap vision / polish, market research, LinkedIn |
| `google/gemini-2.5-flash` | Stronger mid-tier | **$0.30 / $2.50** per 1M | When Lite copy or tool-calling is weak but 3.8 is too expensive |
| `google/gemini-3.8-flash` | Highest quality | **$0.75 / $3.75** per 1M | Raise **only** Snap and/or Ask Kova if listing quality or tool loops suffer |

**Extra cost (not in token price):** web search (market research, stale starters, thin website scan). Google native search on Gemini is listed around **~$14 / 1,000 searches** (~$0.014/call) on top of tokens. Prefer caching; starters already refresh market notes at most every ~2 days.

Env fallbacks (used when a call has no task, or as last resort):

- `OPENROUTER_MODEL` — text default  
- `OPENROUTER_VISION_MODEL` — optional force for vision; leave empty so admin `product_vision` / `product_polish` routes win  

---

## Per-task defaults (shipped)

### Tier A — keep on 2.5 Flash Lite

| Task key | Product surface | Why this model |
|----------|-----------------|----------------|
| `inbox` | Inbox reply drafts | High volume; short JSON reply |
| `broadcast_pack` | Post-delivery review ask | Tiny JSON |
| `organic_seeds` | Organic idea seeds | Often cached; list-shaped JSON |
| `schedule` | Schedule planner | Slot times + reasons |
| `starters` | Home “ask Kova” prompts | Four short questions |
| `business_draft` | Business Brain section drafts | Short editable fields |
| `reasoning` | Internal reasoner | Low volume structured JSON |

**Best use cases for Tier A:** classify/reply, fill a small schema, propose times, invent short prompts — not long-form brand voice.

### Tier B — 3.1 Flash Lite (value default)

| Task key | Product surface | Why this model |
|----------|-----------------|----------------|
| `draft` | Single Post draft | Needs readable voice |
| `organic` | Organic content packs | Multi-piece copy |
| `campaign` | Product campaign packs | Multi-platform JSON |
| `morning_brief` | Morning brief | Narrative over evidence |
| `weekly_brief` | Weekly report | Longer structured report |
| `autopilot` | Autopilot shift **plan** | Nested work uses its own tasks |
| `ask_kova` | Ask Kova agent + tools | Tool calling + business context |
| `product_vision` | Snap to Sell | Multimodal listing |
| `product_polish` | Listing polish | Vision + rewrite |
| `market_research` | Market brief (+ web) | Grounded synthesis |
| `website_scan` | Website → profile | Extract fields from page/note |
| `professional` | LinkedIn programs / briefs | Longer professional copy |

**Best use cases for Tier B:** anything a shop owner *reads* (captions, briefs, listings) or that must call tools / see images — still far cheaper than 3.8 Flash.

### When to raise quality in admin

| Symptom | Raise this task | To |
|---------|-----------------|-----|
| Snap names/categories often wrong | `product_vision` | 2.5 Flash → then 3.8 Flash |
| Store polish sounds generic / misses product | `product_polish` | 2.5 Flash or 3.8 Flash |
| Ask Kova skips tools or invents actions | `ask_kova` | 2.5 Flash or 3.8 Flash |
| Campaign/organic captions feel flat | `campaign` / `organic` / `draft` | 2.5 Flash |
| Inbox is fine but too “robotic” | `inbox` | 3.1 Flash Lite (usually enough) |

Do **not** put inbox, schedule, or broadcast on 3.8 Flash — volume will dominate the bill with little product gain.

---

## Cost: very active user (defaults)

Assumptions for **one busy SME business / calendar month** (engineering token estimates × OpenRouter list prices, Oct 2026):

| Activity (examples) | Calls / mo | Model tier |
|---------------------|------------|------------|
| Snap to Sell | ~40 | 3.1 Flash Lite |
| Ask Kova (≈2 rounds each) | ~80 | 3.1 Flash Lite |
| Inbox drafts | ~120 | 2.5 Flash Lite |
| Autopilot plans | ~60 | 3.1 Flash Lite |
| Campaign + organic + drafts | ~57 | 3.1 Flash Lite |
| Morning + weekly briefs | ~26 | 3.1 Flash Lite |
| Seeds, schedule, starters, broadcast, brain | ~100+ | mostly 2.5 Flash Lite |
| Market / starters web | ~10 searches | tokens + ~$0.014/search |

### Point estimate (defaults)

| | Amount |
|--|--------|
| **Typical power user** | **~$0.90 / month** (~$0.03 / day) |
| Plausible band | **~$0.65 – $1.30 / month** |
| Same activity all on **3.8 Flash** | **~$2.50 / month** |
| Savings vs all-3.8 | **~60–65%** |

### What usually tops the bill (defaults)

1. Ask Kova  
2. Snap to Sell  
3. Web-backed starters / market research  
4. Campaign packs  
5. Autopilot plan  

Raising **only** Snap + Ask Kova to 3.8 Flash (leaving everything else on defaults) adds on the order of **tens of cents per month** on this scenario — still well under an all-3.8 bill.

> These are **OpenRouter USD estimates**, not a Kova product “credit” balance. Live token totals are in `AiUsageEvent`. Re-check OpenRouter’s model pages when prices change.

Interactive breakdown: Cursor canvas `active-user-ai-cost.canvas.tsx` (workspace canvases). Call-site map: `openrouter-credits-map.canvas.tsx`.

---

## Best use cases by product feature

| Feature | Owner outcome | Recommended model posture |
|---------|---------------|---------------------------|
| **Snap to Sell** | Photo → draft listing | Default 3.1 Lite; 3.8 if category/material accuracy is critical (fashion, cosmetics) |
| **Product polish** | Storefront-ready copy | Same as vision; keep paired with vision quality |
| **Ask Kova** | Owner commands with tools | 3.1 Lite; upgrade if tools are skipped |
| **Inbox** | Fast reply suggestions | Stay on 2.5 Lite |
| **Autopilot** | Shift plan + nested posts/inbox | Plan on 3.1 Lite; nested tasks follow their own routes |
| **Campaign / organic / draft** | Publishable social copy | 3.1 Lite; mid-tier Flash if voice is weak |
| **Morning / weekly brief** | Manager-style summary | 3.1 Lite |
| **Market research** | Competitor / market note | 3.1 Lite + **minimize** how often search runs |
| **Starters** | Suggested questions on Home | Lite for prompts; web refresh stays infrequent |
| **Broadcast** | “Leave a review” style pack | 2.5 Lite |
| **LinkedIn / professional** | Topic weeks & briefs | 3.1 Lite |

---

## Ops checklist

- [ ] `migrate kova_ai` on each environment  
- [ ] Confirm **AI model control** rows exist (admin seeds missing tasks on open)  
- [ ] Leave high-volume tasks on 2.5 Flash Lite  
- [ ] Watch **AI usage events** after a busy day (feature + `model_name` + tokens)  
- [ ] Only upgrade Snap / Ask Kova if quality tickets appear  
- [ ] Avoid frequent market research re-runs (web fee)

---

## Code map

| Piece | Path |
|-------|------|
| Task catalog + defaults | `backend/apps/kova_ai/services/model_routes.py` |
| HTTP client + resolve | `backend/apps/kova_ai/services/openrouter.py` |
| Usage attribution | `backend/apps/kova_ai/services/usage.py` |
| Models | `AiModelRoute`, `AiUsageEvent` in `backend/apps/kova_ai/models.py` |
| Admin | `backend/apps/kova_ai/admin.py` |
| Tests | `backend/apps/kova_ai/test_model_routes.py` |
