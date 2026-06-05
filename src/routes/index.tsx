import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Brain,
  FileText,
  MessageCircleQuestion,
  ScanSearch,
  CalendarRange,
  Newspaper,
  ChevronDown,
  Check,
  Sparkles,
  Star,
  ArrowRight,
  ShieldCheck,
  Zap,
  Languages,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EXAMS } from "@/lib/cortex-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PARIKSHA — India's AI Study Platform for JEE, NEET, UPSC & more" },
      {
        name: "description",
        content:
          "Crack JEE, NEET, UPSC, SSC and CAT with an AI tutor that speaks English, Hindi and Hinglish. Unlimited mock tests, smart notes, doubt solver and a personal study planner.",
      },
      { property: "og:title", content: "PARIKSHA — India's AI Study Platform" },
      {
        property: "og:description",
        content: "Unlimited AI mock tests, smart notes, doubt solver and study planner for 20+ Indian exams.",
      },
      { property: "og:url", content: "https://pariksha-ai-study.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://pariksha-ai-study.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "PARIKSHA",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
          description: "AI study platform for Indian competitive exams.",
        }),
      },
    ],
  }),
  component: Index,
});

type LiveStats = {
  total_registered?: number;
  doubts_solved_today?: number;
  tests_taken_this_week?: number;
  active_today?: number;
  reviews?: number;
};

const FEATURES = [
  {
    icon: MessageCircleQuestion,
    tone: "purple",
    title: "AI Doubt Solver",
    desc: "Ask anything, get a step-by-step answer in English, Hindi or Hinglish — 24/7.",
    big: true,
  },
  {
    icon: Brain,
    tone: "primary",
    title: "AI Mock Tests",
    desc: "Generate exam-grade mock tests with instant AI explanations.",
  },
  {
    icon: FileText,
    tone: "teal",
    title: "Smart Notes",
    desc: "Exam-ready notes on any topic in seconds.",
  },
  {
    icon: ScanSearch,
    tone: "coral",
    title: "Notes Analyser",
    desc: "Upload your notes — AI scores them and shows the gaps.",
  },
  {
    icon: CalendarRange,
    tone: "amber",
    title: "Study Planner",
    desc: "Personal week-by-week schedule built around your exam date.",
  },
  {
    icon: Newspaper,
    tone: "primary",
    title: "Current Affairs",
    desc: "Daily AI-curated current affairs for UPSC, SSC and banking exams.",
  },
];

const STEPS = [
  { n: "01", title: "Pick your exam", desc: "Choose from JEE, NEET, UPSC, SSC and 20+ Indian exams." },
  { n: "02", title: "Ask, test, learn", desc: "Use the AI tutor, take mocks, generate notes — your way." },
  { n: "03", title: "Track and improve", desc: "See your weak topics, streaks and exam-readiness score." },
];

const FAQ = [
  { q: "Is PARIKSHA free to start?", a: "Yes — sign up free and get 5 AI doubts every day plus access to basic notes and tests. No credit card needed." },
  { q: "Which exams are supported?", a: "JEE, NEET, UPSC, SSC, GATE, CAT, NDA, CDS, Bank PO, IBPS, RRB, CBSE, ICSE and major State Boards." },
  { q: "Can I study in Hindi or Hinglish?", a: "Absolutely. Every AI feature responds in English, Hindi or natural Hinglish — your choice." },
  { q: "Do I need my own AI key?", a: "No. PARIKSHA includes the AI — no setup, no keys, no extra accounts." },
  { q: "Is my data safe?", a: "Yes. Your data is private to your account, protected with row-level security on every table." },
  { q: "Can I cancel anytime?", a: "Yes — paid plans are month-to-month or yearly with no lock-in." },
];

function Index() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) localStorage.setItem("pariksha_ref", ref);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="min-h-dvh">
      <Navbar />
      <main>
        <Hero />
        <LogoStrip />
        <StatsBar />
        <Features />
        <HowItWorks />
        <LanguageDemo />
        <Exams />
        <Pricing />
        <Testimonials />
        <Faq />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 gradient-mesh-bg" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 md:grid-cols-[1.05fr_1fr] md:px-6 md:py-28">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            <Sparkles className="h-3 w-3 text-primary" /> AI for every Indian student
          </span>
          <h1 className="mt-5 font-display text-[44px] font-bold leading-[1.02] tracking-tight md:text-[68px]">
            Crack your exam{" "}
            <span className="gradient-brand-text">with an AI tutor</span>
            <br className="hidden md:block" /> that speaks your language.
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
            Unlimited mock tests, smart notes, a 24/7 doubt solver and a personal
            study planner — built for JEE, NEET, UPSC, SSC, CAT and 20+ Indian exams.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl gradient-brand-bg px-6 py-3.5 text-sm font-semibold text-white shadow-elev-2 transition hover:shadow-glow-blue focus-ring"
            >
              Start free — no card needed
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 px-5 py-3.5 text-sm font-medium text-foreground backdrop-blur-sm transition hover:border-primary/40 hover:bg-card focus-ring"
            >
              See features
            </a>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-teal" /> Private & secure</span>
            <span className="inline-flex items-center gap-1.5"><Languages className="h-3.5 w-3.5 text-purple" /> EN · हिन्दी · Hinglish</span>
            <span className="inline-flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary" /> No setup, no API keys</span>
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative hidden h-[480px] md:block">
      <div className="absolute inset-0 rounded-3xl border border-border/70 bg-card/50 p-5 shadow-elev-2 backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-border/70 pb-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-coral/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-teal/60" />
          </div>
          <span className="ml-2 text-[11px] text-muted-foreground">pariksha.app · Doubt Solver</span>
        </div>
        <div className="mt-4 space-y-3">
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-primary/15 px-4 py-3 text-sm">
            Bhai Newton ka second law samjha do, with example.
          </div>
          <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-border/70 bg-background/60 px-4 py-3 text-sm">
            <span className="font-medium text-primary">Sure! </span>
            Force = mass × acceleration <span className="text-muted-foreground">(F = ma)</span>.
            Heavy cricket ball ko throw karne mein zyada force lagta hai, light tennis ball ko kam — bas wahi concept.
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-border/70 bg-background/60 px-4 py-3">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-teal">Worked example</div>
            <code className="block text-xs">10 kg block · a = 2 m/s² → F = 20 N</code>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 -top-4 w-56 rounded-2xl border border-border/70 bg-card p-3 shadow-elev-2 animate-float">
        <div className="flex items-center gap-2 text-xs">
          <Brain className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium">Mock Test · Physics</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-2/3 gradient-brand-bg" />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">12 / 25 answered · 8m left</p>
      </div>
      <div className="absolute -bottom-2 -left-6 w-60 rounded-2xl border border-border/70 bg-card p-3 shadow-elev-2 animate-float [animation-delay:2s]">
        <div className="flex items-center gap-2 text-xs">
          <TrendingUp className="h-3.5 w-3.5 text-teal" />
          <span className="font-medium">Today's streak</span>
        </div>
        <div className="mt-1 font-display text-xl font-bold">🔥 7 days</div>
        <p className="text-[11px] text-muted-foreground">+15% vs last week</p>
      </div>
    </div>
  );
}

function LogoStrip() {
  const items = ["JEE", "NEET", "UPSC", "SSC CGL", "CAT", "GATE", "Bank PO", "NDA"];
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-6 md:px-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Built for
        </span>
        {items.map((x) => (
          <span key={x} className="font-display text-sm font-semibold text-foreground/70 transition hover:text-foreground">
            {x}
          </span>
        ))}
      </div>
    </section>
  );
}

function StatsBar() {
  const [stats, setStats] = useState<LiveStats>({});

  useEffect(() => {
    let cancelled = false;
    const fetchIt = async () => {
      const { data } = await supabase.rpc("public_stats" as any);
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!cancelled && row) setStats(row as LiveStats);
    };
    fetchIt();
    const id = setInterval(fetchIt, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const items = [
    { value: (stats.active_today ?? 0) > 0 ? `${stats.active_today}` : "100+", label: "Active today", live: true },
    { value: (stats.doubts_solved_today ?? 0) > 0 ? `${stats.doubts_solved_today}` : "50+", label: "Doubts solved today" },
    { value: (stats.tests_taken_this_week ?? 0) > 0 ? `${stats.tests_taken_this_week}` : "200+", label: "Tests this week" },
    { value: "24/7", label: "AI availability" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border/70 bg-card/60 p-6 backdrop-blur-sm md:grid-cols-4">
        {items.map((s) => (
          <div key={s.label} className="text-center">
            <div className="flex items-center justify-center gap-2 font-display text-2xl font-bold md:text-3xl">
              {s.live && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
                </span>
              )}
              {s.value}
            </div>
            <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Features</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-5xl">
          Everything you need to win.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Six AI features built for the way Indian students actually study.
        </p>
      </div>

      <div className="mt-14 grid auto-rows-[1fr] gap-5 md:grid-cols-3">
        {FEATURES.map((f) => {
          const toneClass = {
            primary: "text-primary bg-primary/10 ring-primary/20",
            teal: "text-teal bg-teal/10 ring-teal/20",
            purple: "text-purple bg-purple/10 ring-purple/20",
            amber: "text-amber bg-amber/10 ring-amber/20",
            coral: "text-coral bg-coral/10 ring-coral/20",
          }[f.tone as "primary" | "teal" | "purple" | "amber" | "coral"];
          return (
            <article
              key={f.title}
              className={`group relative overflow-hidden rounded-2xl border border-border/70 bg-card/70 p-7 transition hover-lift hover:border-primary/40 ${
                f.big ? "md:col-span-2 md:row-span-1" : ""
              }`}
            >
              <div className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ring-inset ${toneClass}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground md:text-[15px]">{f.desc}</p>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 transition group-hover:opacity-100" />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Three steps to your best score.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border/70 bg-background/60 p-7 transition hover:border-primary/40">
              <div className="font-display text-4xl font-bold gradient-brand-text">{s.n}</div>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Exams() {
  return (
    <section id="exams" className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Exams</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Built for every Indian exam.
        </h2>
        <p className="mt-3 text-muted-foreground">From boards to UPSC — pick your target, PARIKSHA adapts.</p>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-2.5">
        {EXAMS.map((e) => (
          <span
            key={e}
            className="rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm text-foreground/90 backdrop-blur-sm transition hover:border-primary/50 hover:bg-card"
          >
            {e}
          </span>
        ))}
      </div>
    </section>
  );
}

function LanguageDemo() {
  const cards = [
    { lang: "English", tone: "text-primary", text: "Newton's Second Law: Force equals mass times acceleration (F = ma). When you push a heavier object, you need more force." },
    { lang: "हिन्दी", tone: "text-teal", text: "न्यूटन का दूसरा नियम: बल = द्रव्यमान × त्वरण (F = ma)। भारी वस्तु को धकेलने के लिए अधिक बल चाहिए।" },
    { lang: "Hinglish", tone: "text-purple", text: "Bhai simple hai — Force = Mass × Acceleration. Heavy cheez ko push karne ke liye zyada force chahiye, bas itna hi." },
  ];
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-24 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Your language</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Same answer. Your language.
          </h2>
          <p className="mt-3 text-muted-foreground">Toggle English, Hindi or natural Hinglish anywhere in the app.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {cards.map((c) => (
            <div key={c.lang} className="rounded-2xl border border-border/70 bg-background/60 p-6 transition hover:border-primary/40">
              <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${c.tone}`}>{c.lang}</div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">{c.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: "Free", price: "₹0", period: "forever", cta: "Start free", features: ["5 AI doubts / day", "Basic mock tests", "Smart notes (3 / day)", "English + Hindi + Hinglish"] },
    { name: "Student Pro", price: "₹99", period: "/ month", featured: true, cta: "Go Pro", features: ["Unlimited AI doubts", "Unlimited mock tests", "Unlimited smart notes", "Notes Analyser", "Study Planner"] },
    { name: "Exam Bundle", price: "₹499", period: "/ year", cta: "Best value", features: ["Everything in Pro", "Exam-day countdown plans", "Priority AI", "PDF export", "Save ₹689 vs monthly"] },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Pricing</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Built for every student budget.
        </h2>
        <p className="mt-3 text-muted-foreground">Start free. Upgrade when you need more.</p>
      </div>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative rounded-2xl border p-7 transition ${
              t.featured
                ? "border-primary/60 bg-card shadow-glow-blue"
                : "border-border/70 bg-card/70 hover:border-primary/40"
            }`}
          >
            {t.featured && (
              <span className="absolute -top-3 left-7 rounded-full gradient-brand-bg px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-elev-1">
                Most popular
              </span>
            )}
            <h3 className="font-display text-lg font-semibold">{t.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold tracking-tight">{t.price}</span>
              <span className="text-sm text-muted-foreground">{t.period}</span>
            </div>
            <ul className="mt-7 space-y-3 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  <span className="text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className={`mt-8 block rounded-xl px-4 py-3 text-center text-sm font-semibold transition ${
                t.featured
                  ? "gradient-brand-bg text-white shadow-elev-1 hover:shadow-glow-blue"
                  : "border border-border bg-secondary text-foreground hover:bg-secondary/70"
              }`}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

type RealReview = { id: string; rating: number; review_text: string | null; exam: string | null; created_at: string; first_name: string };

function Testimonials() {
  const [reviews, setReviews] = useState<RealReview[]>([]);
  const [stats, setStats] = useState<{ users: number; reviews: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: rs }, { data: st }] = await Promise.all([
        supabase
          .from("reviews")
          .select("id, rating, review_text, exam, created_at")
          .eq("display", true)
          .gte("rating", 4)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase.rpc("public_stats" as any),
      ]);
      const list = (rs ?? []).map((r: any) => ({ ...r, first_name: "Student" })) as RealReview[];
      setReviews(list);
      const row: any = Array.isArray(st) ? st[0] : st;
      if (row) setStats({ users: Number(row.total_registered ?? row.users) || 0, reviews: Number(row.reviews) || 0 });
    })();
  }, []);

  const placeholdersNeeded = Math.max(0, 3 - reviews.length);

  return (
    <section className="mx-auto max-w-7xl px-4 py-24 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Loved by students</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Real students. Real progress.
        </h2>
      </div>
      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {reviews.map((t) => (
          <figure key={t.id} className="rounded-2xl border border-border/70 bg-card/70 p-6 transition hover:border-primary/40">
            <div className="flex gap-0.5 text-amber">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">
              "{t.review_text ?? "Loved using PARIKSHA for my prep."}"
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full gradient-brand-bg font-semibold text-white">
                {t.first_name[0]}
              </div>
              <div>
                <div className="text-sm font-medium">{t.first_name}</div>
                <div className="text-xs text-muted-foreground">{t.exam ?? "Aspirant"}</div>
              </div>
            </figcaption>
          </figure>
        ))}
        {Array.from({ length: placeholdersNeeded }).map((_, i) => (
          <Link
            key={`ph-${i}`}
            to="/dashboard"
            className="group flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 text-center transition hover:border-primary/50"
          >
            <Star className="h-6 w-6 text-amber" />
            <p className="mt-3 text-sm font-medium">Be the first to review PARIKSHA</p>
            <p className="mt-1 text-xs text-muted-foreground">Share your experience after using our features.</p>
            <span className="mt-4 text-xs font-medium text-primary group-hover:underline">Write a review →</span>
          </Link>
        ))}
      </div>
      {stats && stats.users > 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Join <span className="font-semibold text-foreground">{stats.users.toLocaleString("en-IN")}+</span> students already using PARIKSHA
        </p>
      )}
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-24 md:px-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">FAQ</p>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Questions, answered.
        </h2>
      </div>
      <div className="mt-12 divide-y divide-border/70 rounded-2xl border border-border/70 bg-card/70">
        {FAQ.map((item, i) => (
          <div key={item.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-sm font-medium transition hover:bg-secondary/30 focus-ring"
              aria-expanded={open === i}
            >
              {item.q}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  open === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {open === i && <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 md:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-10 text-center shadow-glow-blue md:p-16">
        <div className="pointer-events-none absolute inset-0 gradient-mesh-bg opacity-70" />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Your AI tutor is waiting.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground md:text-[15px]">
            Join thousands of Indian students preparing smarter. Free forever to start.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-brand-bg px-7 py-3.5 text-sm font-semibold text-white shadow-elev-2 transition hover:shadow-glow-blue focus-ring"
          >
            Start free <Sparkles className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
