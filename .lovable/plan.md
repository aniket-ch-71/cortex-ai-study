
# CORTEX — Phase 1 Build Plan

India's AI-Powered Study Platform. Phase 1 covers the foundation and the most-used feature (AI Doubt Solver). Mock Tests, Notes Generator, Notes Analyser, and Study Planner come in follow-up phases.

## Stack adjustments from your spec

Your spec assumed vanilla HTML + Firebase + user-pasted Anthropic key. Adapting to this Lovable project:
- React + TanStack Start (file-based routes) instead of static .html files
- Lovable Cloud (Supabase) for Auth + database instead of Firebase
- Lovable AI Gateway (server-side, no key needed from users) instead of browser Claude calls
- Tailwind v4 design tokens instead of plain CSS variables (same dark palette and fonts)

## Design system

Dark theme inspired by Vercel/Linear/Raycast. Wired into `src/styles.css` as semantic tokens (light mode disabled — app is dark-only).

- Background `#0A0E1A`, card `#141C2E`, border `#1E2D4A`
- Accents: blue `#4F8EF7`, teal `#00C9A7`, purple `#7B61FF`, amber `#FFA63D`, coral `#FF6B6B`
- Text: `#FFFFFF` primary, `#8B9BBF` secondary
- Fonts: Space Grotesk (headings), Inter (body) via Google Fonts
- Radius 12px cards / 8px buttons, 0.2s ease transitions, subtle scroll fade-ins, no gradients beyond soft background glows

## Pages in Phase 1

### 1. Landing (`/`)
Sticky navbar (logo + Features / Exams / Pricing / Login / Sign Up CTA) → Hero "Study Smarter with AI" with two CTAs and floating feature cards → stats bar (50Cr+ Students, 20+ Exams, 3 Languages, 24/7 AI) → 6 feature cards (AI Mock Tests, Smart Notes, Doubt Solver, Audio Lectures, Notes Analyser, Study Planner) → exam category chips (JEE, NEET, UPSC, SSC, GATE, CAT, NDA, CDS, Bank PO, IBPS, RRB, CBSE, ICSE, State Boards) → EN/Hindi/Hinglish side-by-side demo → 3-tier pricing (Free / Student Pro ₹99/mo / Exam Bundle ₹499/yr) → 3 testimonials → 6-item FAQ accordion → footer.

### 2. Auth (`/auth`)
Split-screen layout. Toggle between Login and Sign Up with smooth animation. Sign Up collects: Full Name, Email, Password, Target Exam (dropdown), Preferred Language (EN/Hindi/Hinglish). Login: email + password + forgot password link. "Continue with Google" button (Lovable Cloud Google sign-in). Real-time Zod validation with inline errors. On success → redirect to `/dashboard`. Session persists via Supabase auth.

### 3. Dashboard (`/dashboard`) — protected
Collapsible shadcn sidebar (Dashboard, AI Doubt Solver, Mock Tests [coming soon], Notes Generator [coming soon], Notes Analyser [coming soon], Study Planner [coming soon], My Performance, Settings). Top bar with welcome + 🔥 streak + notification bell. Stats cards row (tests taken, average score, doubts solved, study hours). 4 big quick-action cards. Recent activity feed (last 5). Upcoming-exam countdown widget. Per-subject progress bars. Empty-state copy until the user has activity.

### 4. AI Doubt Solver (`/doubt-solver`) — protected
WhatsApp/ChatGPT-style chat. Top controls: language toggle (EN / Hindi / Hinglish), subject tag selector (Maths, Physics, Chemistry, Biology, History, etc.), clear chat. Streaming responses from Lovable AI Gateway via a server function with system prompt:

> "You are Cortex AI, an expert Indian education tutor. Explain concepts clearly for competitive exam students. Respond in [language] — when Hinglish, mix Hindi and English naturally. Always give step-by-step explanations with examples."

Typing indicator (3 dots), copy-response button on each AI message, daily free-doubt counter ("5 free doubts remaining today" — tracked in DB per user per day), input + Enter-to-send. Conversations persisted to `doubts` table.

## Data model (Lovable Cloud)

- `profiles` (id → auth.users, full_name, target_exam, language, streak, last_active, created_at) — auto-created on signup via trigger
- `doubts` (id, user_id, subject, language, question, answer, created_at)
- `daily_usage` (user_id, date, doubts_used) — for the rate limit
- `user_roles` + `app_role` enum + `has_role()` security-definer function (admin/user) — set up now so future admin features are safe
- RLS on all tables: users only read/write their own rows

## AI integration

Single edge function `chat` calls Lovable AI Gateway with `google/gemini-3-flash-preview`, streams SSE back to the client, handles 429 (rate limit) and 402 (credits) with friendly toasts. System prompt lives server-side; client only sends messages, language, subject.

## Global pieces

- Sonner toasts (success/error/info)
- Skeleton loaders for AI content, spinner state on buttons
- `_authenticated` layout route guards `/dashboard` and `/doubt-solver`, redirects to `/auth` with redirect-back
- Semantic HTML, alt text on images, fully responsive (375 / 768 / 1280)

## Technical notes

- Routes: `src/routes/index.tsx`, `auth.tsx`, `_authenticated.tsx`, `_authenticated/dashboard.tsx`, `_authenticated/doubt-solver.tsx`
- Components: `Navbar`, `Footer`, `AppSidebar`, `FeatureCard`, `PricingCard`, `TestimonialCard`, `FaqAccordion`, `ChatMessage`, `LanguageToggle`
- Edge function: `supabase/functions/chat/index.ts` (streaming)
- DB migration creates profiles/doubts/daily_usage/user_roles + RLS + signup trigger
- Auth uses Email/Password + Google (Lovable Cloud defaults)

## What's NOT in Phase 1 (next phases)

- Mock Test generator + test-taking UI + results + PDF
- Notes Generator with PDF download
- Notes Analyser scoring
- Study Planner with calendar grid
- Performance analytics page
- Sidebar links for these will show "Coming soon"

After approval I'll enable Lovable Cloud, run the migration, and build the four pages.
