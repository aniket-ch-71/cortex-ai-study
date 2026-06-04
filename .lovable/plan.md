# Plan — Bug fix + remaining polish tasks

## 1. Fix `/src/styles.css` 500 error

Lightning CSS error: `@import rules must precede all rules aside from @charset and @layer statements`.

Current top of `src/styles.css`:
```css
@import "tailwindcss" source(none);
@source "../src";            ← non-@import rule
@import "tw-animate-css";    ← @import after a non-@import → invalid
@import url("https://fonts.googleapis.com/css2?...");  ← also remote @import, banned on this stack
```

Two issues: ordering, plus remote Google Fonts `@import` (Lightning CSS resolves `@import` from disk and will break the production build per the tailwind4-gotchas guidance).

Fix:
- Reorder so all `@import` statements come first, `@source` after:
  ```css
  @import "tailwindcss" source(none);
  @import "tw-animate-css";
  @source "../src";
  ```
- Remove the Google Fonts CSS `@import` entirely.
- Add the font link tags to `src/routes/__root.tsx` `head().links`:
  ```ts
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
  ```

All other styles untouched.

## 2. Shareable Result Card — `mock-test/$testId/results.tsx`

- Install `html-to-image` (`bun add html-to-image`).
- Add state `const [showShare, setShowShare] = useState(false)` and `const cardRef = useRef<HTMLDivElement>(null)`.
- Read first name via existing `useProfile()` hook (`profile.full_name?.split(" ")[0] ?? "Student"`).
- Render a **"Share Results"** button right after the score-card section. Clicking toggles `showShare`.
- When `showShare`, render:
  - The card (`ref={cardRef}`, fixed 600×800 px-ish layout, scales down on mobile via responsive wrapper):
    - Gradient bg `linear-gradient(135deg,#0A0E1A,#141C2E)`, rounded-2xl, padding, border `border-white/10`.
    - Header row: `⚡ PARIKSHA` (gradient P, matches Task 4 logo) on left, today's date `Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',year:'numeric'})` on right.
    - Student first name (text-xl muted).
    - Test title (display font, text-3xl bold, line-clamp-2).
    - SVG progress circle (120×120, cx=60 cy=60 r=54, `strokeDasharray={pct*3.39+" 339"}`, stroke = grade color — teal/blue/amber/coral, rotate −90°). Score number centered with `<text>` inside SVG.
    - Score `{finalScore}/{maxMarks}` line + percentage.
    - Grade badge (Excellent / Good / Keep Practicing / Needs work — uses existing `grade.label`).
    - Footer: `Powered by PARIKSHA · pariksha.ai` (muted).
  - Two full-width buttons below:
    - **Share on WhatsApp** (`bg-emerald-500/90`, white text): opens `https://wa.me/?text=` with the exact Hinglish message specified, URL-encoded, using `testName` and `pct`.
    - **Download Image** (`bg-primary`, white text): `toPng(cardRef.current,{pixelRatio:2,backgroundColor:'#0A0E1A'})` → trigger download `pariksha-result-${Date.now()}.png`.
- Loading/error states: toast on download failure.
- Card hidden when `showShare` is false; clicking the toggle button again hides it.

## 3. Referral capture (`?ref=CODE`)

`src/routes/index.tsx` (landing):
- Add `useEffect` on mount: parse `window.location.search` for `ref`, if present `localStorage.setItem('pariksha_ref', ref)`.

`src/routes/onboarding.tsx` (already the place "after successful signup completion"):
- After the existing profile-finalize/onboarded update succeeds, run a helper `redeemReferral(userId)`:
  1. `const code = localStorage.getItem('pariksha_ref')`. Skip if missing.
  2. Find referrer: `supabase.from('profiles').select('id').eq('referral_code', code).maybeSingle()`. Skip if not found or `id === userId` (no self-referral).
  3. Insert `{ referrer_id: foundId, referred_id: userId }` into `referrals`. The DB trigger `bump_referral_count` auto-increments the referrer's count, so the client does not need to do step 3 of the spec separately.
  4. `localStorage.removeItem('pariksha_ref')`.
- Wrap in try/catch; swallow errors silently so a failed referral never blocks onboarding.

(Note: RLS already allows `insert where auth.uid() = referred_id`, so this works without service role.)

## 4. Navbar logo polish — `src/components/Navbar.tsx`

Replace the current logo node with:
```tsx
<Link to="/" className="flex items-center gap-1.5 font-display text-xl font-bold tracking-tight">
  <Zap className="h-5 w-5 text-primary" aria-hidden />
  <span>
    <span className="bg-gradient-to-br from-[#4F8EF7] to-[#00C9A7] bg-clip-text text-transparent">P</span>
    <span className="text-foreground">ARIKSHA</span>
  </span>
</Link>
```
- Keep all existing nav links, mobile hamburger, and auth-aware items unchanged.
- Apply the same logo treatment inside the shareable card so branding matches.

## Technical notes

- New dependency: `html-to-image` (already used pattern; `html2canvas` is present but `html-to-image` is what the spec asks for and produces cleaner SVG/text output).
- No DB migrations, no edge function changes.
- No changes to security posture from the previous turn.
- Files touched:
  - `src/styles.css` (reorder, drop Google Fonts @import)
  - `src/routes/__root.tsx` (font `<link>` tags)
  - `src/routes/_authenticated/mock-test/$testId/results.tsx` (share card + buttons)
  - `src/routes/index.tsx` (capture `?ref=`)
  - `src/routes/onboarding.tsx` (redeem referral on finalize)
  - `src/components/Navbar.tsx` (logo)
  - `package.json` / `bun.lock` (new dep)

Mobile (≤375px): share card uses `max-w-[360px] mx-auto`, score circle scales via responsive width; WhatsApp/Download buttons stack full-width; navbar logo size unchanged from current responsive behavior.
