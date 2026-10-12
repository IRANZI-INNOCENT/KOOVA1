# Kova UX audit and polish plan

Goal: **Using Kova feels like A → B → C** — plain language, one obvious next step, no duplicate screens.

## Principles (non‑negotiable)

1. **One home for each job** — Leads live in one place; social is for posting, not a second leads app.
2. **One shell** — Sidebar + top bar once per page (no nested `AppShell`).
3. **Same page shape** — Eyebrow → title → one-line help → action → content.
4. **Verbs owners understand** — “Create posts”, “Connect Facebook”, not “Campaign bundle” or “Operating mode” without context.
5. **Progress, not guilt** — Show “Step 2 of 3” and what Kova handles vs what they tap once.

---

## Audit summary (current system)

### Navigation

| Issue | Impact | Action |
|--------|--------|--------|
| **Social → Social Leads** vs **Leads** | Same data, two UIs | Redirect social/leads → `/workspace/leads` |
| **8 social sub-tabs** | Overwhelming on mobile | Group into 5: Overview, Connect, Create, Calendar, Autopilot (+ Engagement under Inbox link) |
| **LinkedIn 7 tabs** | Pro/power-user heavy | Keep for v1 but add “Start here” on Home |
| **Analytics placeholder** | Dead end | Label “Coming soon” or hide until data exists |
| **Duplicate routes** `frontend/workspace/*` (outside `app/`) | Confusion for devs, not user-facing | Remove dead tree (not in Next router) |

### Layout / technical debt

| Issue | Action |
|--------|--------|
| Mix of `AppShell` vs `WorkspacePageFrame` | Prefer `WorkspacePageFrame` for all top-level workspace pages; sub-layouts (social tabs) must **not** wrap `AppShell` |
| Social layout wraps `AppShell` — correct for studio/autopilot | Social overview must **not** double-wrap (fixed) |
| Settings: 6 separate long forms | Keep forms; add hub progress + “Next recommended step” |
| Inbox / Analytics minimal placeholders | Single empty state with link to Social → Engagement |

### Journeys (ABC)

#### A — First day

1. **Sign up / sign in**
2. **Onboarding** — business name, industry (existing)
3. **Settings → Business profile** (short) OR skip with defaults
4. **Overview “Start here”** — 3 cards: Connect social, Add product, Create first post

#### B — Every week

1. **Morning Brief** (optional read)
2. **Social → Create** — product, organic, or video
3. **Inbox / Leads** — reply or mark done

#### C — Autopilot

1. **Settings → Policies** — turn on Autopilot
2. **Social → Autopilot** — read shift log, no daily manual publish

---

## Phase 1 (done in this pass)

- Shared `PageHeader` + `KovaStepsGuide` on Overview
- Content Studio uses same header pattern
- Social tab cleanup + leads dedupe redirect
- This document

## Phase 2 (done)

- Commerce tab bar: Overview | Products | Snap | Store | Orders (`commerce/layout.tsx`)
- Settings: single `AppShell` in layout; sub-pages no longer double-wrap
- LinkedIn Home: compact A→B→C strip + inline connection status
- `EmptyState` (minimal by default) and `FormSection` for forms
- Social mobile: primary tabs + **More** for Calendar / Replies / Autopilot
- **Step UI:** `KovaStepsGuide` is a compact inline strip (not large cards)

## Phase 3 (next)

- Onboarding checklist persisted on Overview until complete
- Contextual “Talk to Kova” prompts on empty pages
- Remove/replace placeholder Analytics with real metrics or hide nav item

---

## Copy guidelines

| Avoid | Prefer |
|--------|--------|
| Campaign, bundle, pipeline | Create posts, Schedule |
| Operating mode | How Kova works (Assist / You approve / Autopilot) |
| Channel | Account (Facebook, Instagram) |
| Asset, piece | Post |
| OAuth, proxy, API | Connect account |

---

## File map (canonical UI)

| Area | Route | Primary file |
|------|--------|----------------|
| Home | `/workspace` | `app/workspace/page.tsx` |
| Social | `/workspace/social/*` | `app/workspace/social/layout.tsx` |
| Create | `/workspace/social/studio` | `app/workspace/social/studio/page.tsx` |
| Commerce | `/workspace/commerce` | `app/workspace/commerce/page.tsx` |
| Leads | `/workspace/leads` | `app/workspace/leads/page.tsx` |
| Settings | `/workspace/settings` | `app/workspace/settings/page.tsx` |
| LinkedIn | `/workspace/linkedin/*` | `app/workspace/linkedin/layout.tsx` |
