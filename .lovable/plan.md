# PARIKSHA — Premium Platform Upgrade Plan

A full pass to elevate PARIKSHA to Linear/Notion/Stripe-tier polish while preserving every existing feature, route, and backend contract.

## Scope guardrails
- No backend schema changes. No route renames. No new auth flows.
- Dark theme only (current palette extended, not replaced).
- All edits frontend/presentation. No edge function logic changes.

---

## 1. Design system upgrade (`src/styles.css`)
- Add semantic tokens: `--surface-1/2/3`, `--border-subtle/strong`, `--text-primary/secondary/tertiary`, `--gradient-brand`, `--gradient-mesh`, `--shadow-sm/md/lg/glow`.
- Add utilities: `.surface-elevated`, `.gradient-brand-text`, `.gradient-mesh-bg`, `.shadow-glow`, `.focus-ring` (a11y), `.tap-target` (≥44px).
- Add animations: `shimmer`, `pulse-glow`, `slide-up-stagger`, `gradient-shift`.
- Refine type scale: display (Space Grotesk 56/72), h1–h6 ratios, body sizes, mono for stats.

## 2. Shared component library (new in `src/components/ui-pro/`)
- `PageHeader` — title + subtitle + actions, consistent across authed pages.
- `StatCard` — icon, label, value (count-up), delta chip, sparkline slot.
- `EmptyState` — illustration slot, title, description, CTA.
- `SectionCard` — elevated surface with header/footer.
- `GradientButton`, `GhostIconButton` (44px tap target, aria-label enforced).
- `Skeleton` presets: `SkeletonCard`, `SkeletonRow`, `SkeletonChart`.
- `Badge` variants: success/warning/danger/info/brand.

## 3. Landing page (`src/routes/index.tsx`)
- Hero: bold H1 with gradient keyword, sub-headline, dual CTA (Start free / Watch demo), trust strip ("Trusted by 12,000+ aspirants"), animated mesh background.
- Logo cloud (mock exam bodies).
- Feature bento grid (6 features: AI Doubt Solver, Mock Tests, Smart Notes, Planner, Current Affairs, Analytics).
- "How it works" 3-step section with numbered cards.
- Exam grid (JEE/NEET/UPSC/SSC/CAT/Banking) with hover lift.
- Social proof: testimonials carousel, stats band (questions solved, tests taken, avg score lift).
- Pricing table (Free / Pro / Pro+ — keeps current model, just copy).
- FAQ (accordion, 8 Qs).
- Final CTA band + footer.
- Copywriting rewritten to outcome-driven SaaS voice.

## 4. Auth + Onboarding polish
- `auth.tsx`: split-screen layout (form left, gradient brand panel right with rotating quotes/social proof). Cleaner input states, password strength hint, Google button prominent.
- `onboarding.tsx`: progress bar, step transitions, larger touch targets, success confetti micro-moment on finish.

## 5. Dashboard (`_authenticated/dashboard.tsx`)
- New layout: greeting + streak flame + exam-readiness ring (0–100 score derived client-side from existing stats).
- Stat row: Tests taken, Avg score, Study minutes, Streak (StatCard with count-up).
- Today's plan card + "Continue where you left off" card.
- Weekly heatmap (7-day activity from existing session data).
- Quick actions grid (Doubt Solver, Mock Test, Notes, Planner) with hover-lift.
- Recommendation widget (existing) restyled.
- Empty states for new users.

## 6. Per-feature page polish (presentation-only)
- `mock-test/index.tsx`, `mock-test/$testId`, `results.tsx` — consistent PageHeader, better question card, progress bar, results page already has share card (keep, restyle).
- `notes/*` — card grid with cover gradient by subject, hover-lift.
- `doubt-solver.tsx` — chat surface refinement, message bubbles, suggested prompts chips.
- `planner/*`, `current-affairs/*`, `performance/*`, `analyser/*`, `referral/*`, `settings/*` — apply PageHeader + SectionCard + Skeleton states. No logic changes.

## 7. Sidebar + topbar (`AppSidebar.tsx`, `_authenticated.tsx`)
- Tighter spacing, group labels, active-state animated indicator (already partially present — refine).
- Topbar: breadcrumb + user menu (avatar dropdown with profile/settings/logout).
- Mobile: refined sheet drawer.

## 8. Mobile + a11y pass
- All interactive elements ≥44×44 tap targets.
- `aria-label` on every icon-only button.
- `focus-visible` ring on all interactives via `.focus-ring` utility.
- `h-dvh` instead of `h-screen` for full-height layouts.
- Single `<main>` per route (already correct in `_authenticated.tsx` — verify others).
- Test at 375/768/1024/1440.

## 9. SEO per route (TanStack head)
- Each public route (`/`, `/auth`) and key authed-but-shareable pages get `head()` with title, description, og:title, og:description, og:url, canonical.
- JSON-LD: Organization on `__root.tsx`, SoftwareApplication on `/`, FAQPage on landing FAQ section.
- Update root `og:image` removed (currently set in root — move to leaf `/` only to avoid override on every page).
- Fix duplicate description tags currently in `__root.tsx` (two `description` meta entries present).

## 10. Performance
- Lazy-load heavy authed routes via dynamic imports where TanStack supports (`html-to-image`, charts).
- Add `loading="lazy"` + width/height to all `<img>`.
- Memoize Stat/Heatmap calculations with `useMemo`.
- Remove any unused deps surfaced during pass.

## 11. Verification
- Build passes (auto).
- Manual viewport check at 375, 768, 1440 on `/`, `/auth`, `/dashboard`, `/mock-test`, `/notes`.
- Console clean.

---

## Files touched (estimate)
**Edited:** `src/styles.css`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/auth.tsx`, `src/routes/onboarding.tsx`, `src/routes/_authenticated.tsx`, `src/routes/_authenticated/dashboard.tsx`, plus light polish on the 12 other authed route files, `src/components/Navbar.tsx`, `src/components/Footer.tsx`, `src/components/AppSidebar.tsx`.
**New:** `src/components/ui-pro/PageHeader.tsx`, `StatCard.tsx`, `EmptyState.tsx`, `SectionCard.tsx`, `Skeleton*.tsx`, `GradientButton.tsx`.

## Out of scope (confirm if you want included)
- Backend/RLS/edge function changes.
- New features (gamification badges, daily challenges DB) — UI scaffolding only unless you want me to add tables.
- Adding real testimonials/logos — I'll use tasteful placeholders you can swap.

Approve and I'll execute top-to-bottom in one pass.