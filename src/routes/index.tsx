import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Brain,
  FileText,
  MessageCircleQuestion,
  Headphones,
  ScanSearch,
  CalendarRange,
  ChevronDown,
  Check,
  Sparkles,
  Play,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { EXAMS } from "@/lib/cortex-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

const FEATURES = [
  { icon: Brain, color: "text-primary", title: "AI Mock Tests", desc: "Generate unlimited exam-grade tests with AI-explained answers." },
  { icon: FileText, color: "text-teal", title: "Smart Notes", desc: "Get clean, exam-ready notes on any topic in seconds." },
  { icon: MessageCircleQuestion, color: "text-purple", title: "AI Doubt Solver", desc: "24/7 tutor in English, Hindi or Hinglish — step-by-step." },
  { icon: Headphones, color: "text-amber", title: "Audio Lectures", desc: "Listen to AI-narrated concepts on the go. (Coming soon)" },
  { icon: ScanSearch, color: "text-coral", title: "Notes Analyser", desc: "Upload your notes — AI scores them and shows the gaps." },
  { icon: CalendarRange, color: "text-primary", title: "Study Planner", desc: "Personal week-by-week schedule built around your exam date." },
];

type LiveStats = {
  total_registered?: number;
  doubts_solved_today?: number;
  tests_taken_this_week?: number;
  active_today?: number;
  reviews?: number;
};

const TESTIMONIALS = [
  { name: "Aarav S.", exam: "JEE Advanced 2025", quote: "The AI doubt solver in Hinglish saved me hours every night. It actually explains step-by-step." },
  { name: "Priya K.", exam: "NEET 2025", quote: "Mock tests feel exactly like the real thing. The AI explanations made organic chem finally click." },
  { name: "Rohan M.", exam: "UPSC CSE", quote: "Notes Analyser told me exactly which topics I was weak in. Game changer for revision." },
];

const FAQ = [
  { q: "Is PARIKSHA free to start?", a: "Yes — sign up free and get 5 AI doubts every day plus access to basic notes and tests." },
  { q: "Which exams are supported?", a: "JEE, NEET, UPSC, SSC, GATE, CAT, NDA, CDS, Bank PO, IBPS, RRB, CBSE, ICSE and major State Boards." },
  { q: "Can I study in Hindi or Hinglish?", a: "Absolutely. Every AI feature responds in English, Hindi or natural Hinglish — your choice." },
  { q: "Do I need my own AI key?", a: "No. PARIKSHA includes the AI — no setup, no keys, no extra accounts." },
  { q: "Is my data safe?", a: "Yes. Your data is private to your account, protected with row-level security on every table." },
  { q: "Can I cancel anytime?", a: "Yes — paid plans are month-to-month or yearly with no lock-in." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <Features />
        <Exams />
        <LanguageDemo />
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
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:px-6 md:py-28">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> AI for every Indian student
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] md:text-6xl">
            Study Smarter <br />
            <span className="bg-gradient-to-r from-primary via-purple to-teal bg-clip-text text-transparent">
              with AI
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
            Crack JEE, NEET, UPSC, SSC and more with an AI tutor that speaks English, Hindi
            and Hinglish. Mock tests, smart notes, doubt solver — all in one place.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Start Free <Sparkles className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              <Play className="h-4 w-4" /> Watch Demo
            </a>
          </div>
        </div>

        <div className="relative hidden md:block">
          <FloatingCard
            className="absolute left-0 top-4 w-72 animate-float"
            icon={<Brain className="h-4 w-4 text-primary" />}
            title="AI Mock Test"
            body="Question 12/25 · Physics · 8m left"
            tone="primary"
          />
          <FloatingCard
            className="absolute right-0 top-32 w-72 animate-float [animation-delay:1.5s]"
            icon={<MessageCircleQuestion className="h-4 w-4 text-purple" />}
            title="Doubt solved in Hinglish"
            body="Bhai dekh — Newton ka second law ka matlab F = ma…"
            tone="purple"
          />
          <FloatingCard
            className="absolute left-8 bottom-0 w-72 animate-float [animation-delay:3s]"
            icon={<FileText className="h-4 w-4 text-teal" />}
            title="Smart Notes generated"
            body="Photosynthesis — 3 key points, 1 diagram"
            tone="teal"
          />
        </div>
      </div>
    </section>
  );
}

function FloatingCard({
  className,
  icon,
  title,
  body,
  tone,
}: {
  className?: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: "primary" | "teal" | "purple";
}) {
  const ring =
    tone === "primary" ? "ring-primary/30" : tone === "teal" ? "ring-teal/30" : "ring-purple/30";
  return (
    <div className={`rounded-xl border border-border bg-card p-4 shadow-2xl ring-1 ${ring} ${className ?? ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span className="font-medium text-foreground">{title}</span>
      </div>
      <p className="mt-2 text-sm text-foreground/90">{body}</p>
    </div>
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
    {
      value: (stats.active_today ?? 0) > 0 ? `${stats.active_today}` : "100+",
      label: "Students active today",
      live: true,
    },
    {
      value: (stats.doubts_solved_today ?? 0) > 0 ? `${stats.doubts_solved_today}` : "50+",
      label: "Doubts solved today",
    },
    {
      value: (stats.tests_taken_this_week ?? 0) > 0 ? `${stats.tests_taken_this_week}` : "200+",
      label: "Tests this week",
    },
    { value: "24/7", label: "AI Support" },
  ];

  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 md:grid-cols-4 md:px-6">
        {items.map((s) => (
          <div key={s.label} className="text-center">
            <div className="flex items-center justify-center gap-2 font-display text-2xl font-bold md:text-3xl">
              {s.live && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
              )}
              {s.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
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
    <section id="features" className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Everything you need to win</h2>
        <p className="mt-3 text-muted-foreground">
          Six AI features built for the way Indian students actually study.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="group rounded-xl border border-border bg-card p-6 transition hover:border-primary/40 hover:bg-card/80"
          >
            <div className={`grid h-10 w-10 place-items-center rounded-lg bg-secondary ${f.color}`}>
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Exams() {
  return (
    <section id="exams" className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Built for every Indian exam</h2>
        <p className="mt-3 text-muted-foreground">
          From boards to UPSC — pick your target, PARIKSHA adapts.
        </p>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {EXAMS.map((e) => (
          <span
            key={e}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground/90 transition hover:border-primary/40 hover:bg-secondary"
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
    {
      lang: "English",
      tone: "text-primary",
      text: "Newton's Second Law: Force equals mass times acceleration (F = ma). When you push a heavier object, you need more force.",
    },
    {
      lang: "हिन्दी",
      tone: "text-teal",
      text: "न्यूटन का दूसरा नियम: बल = द्रव्यमान × त्वरण (F = ma)। भारी वस्तु को धकेलने के लिए अधिक बल चाहिए।",
    },
    {
      lang: "Hinglish",
      tone: "text-purple",
      text: "Bhai simple hai — Force = Mass × Acceleration. Heavy cheez ko push karne ke liye zyada force chahiye, bas itna hi.",
    },
  ];
  return (
    <section className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Same answer. Your language.</h2>
          <p className="mt-3 text-muted-foreground">
            Toggle English, Hindi or natural Hinglish anywhere in the app.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {cards.map((c) => (
            <div key={c.lang} className="rounded-xl border border-border bg-background p-6">
              <div className={`text-xs font-semibold uppercase tracking-wider ${c.tone}`}>
                {c.lang}
              </div>
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
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      cta: "Start free",
      features: ["5 AI doubts / day", "Basic mock tests", "Smart notes (3 / day)", "English + Hindi + Hinglish"],
    },
    {
      name: "Student Pro",
      price: "₹99",
      period: "/ month",
      featured: true,
      cta: "Go Pro",
      features: ["Unlimited AI doubts", "Unlimited mock tests", "Unlimited smart notes", "Notes Analyser", "Study Planner"],
    },
    {
      name: "Exam Bundle",
      price: "₹499",
      period: "/ year",
      cta: "Best value",
      features: ["Everything in Pro", "Exam-day countdown plans", "Priority AI", "PDF export of notes & tests", "Save ₹689 vs monthly"],
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Pricing for every student</h2>
        <p className="mt-3 text-muted-foreground">
          Start free. Upgrade when you need more.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`relative rounded-2xl border p-6 ${
              t.featured
                ? "border-primary/60 bg-card glow-blue"
                : "border-border bg-card"
            }`}
          >
            {t.featured && (
              <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Most popular
              </span>
            )}
            <h3 className="font-display text-lg font-semibold">{t.name}</h3>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold">{t.price}</span>
              <span className="text-sm text-muted-foreground">{t.period}</span>
            </div>
            <ul className="mt-6 space-y-3 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className={`mt-7 block rounded-md px-4 py-2.5 text-center text-sm font-medium transition ${
                t.featured
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
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
      const row = Array.isArray(st) ? st[0] : st;
      if (row) setStats({ users: Number(row.users) || 0, reviews: Number(row.reviews) || 0 });
    })();
  }, []);

  const placeholdersNeeded = Math.max(0, 3 - reviews.length);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Loved by students across India</h2>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {reviews.map((t) => (
          <figure key={t.id} className="rounded-xl border border-border bg-card p-6">
            <div className="flex gap-0.5 text-amber">
              {Array.from({ length: t.rating }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">
              "{t.review_text ?? "Loved using PARIKSHA for my prep."}"
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 font-semibold text-primary">
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
            className="group flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/40 p-8 text-center transition hover:border-primary/50"
          >
            <Star className="h-6 w-6 text-amber" />
            <p className="mt-3 text-sm font-medium">Be the first to review PARIKSHA!</p>
            <p className="mt-1 text-xs text-muted-foreground">Share your experience after using our features.</p>
            <span className="mt-4 text-xs font-medium text-primary group-hover:underline">Write a Review →</span>
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
    <section className="mx-auto max-w-3xl px-4 py-20 md:px-6">
      <div className="text-center">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Questions, answered</h2>
      </div>
      <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-card">
        {FAQ.map((item, i) => (
          <div key={item.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium transition hover:bg-secondary/40"
            >
              {item.q}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  open === i ? "rotate-180" : ""
                }`}
              />
            </button>
            {open === i && (
              <p className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-card via-card to-primary/10 p-10 text-center md:p-14">
        <h2 className="font-display text-3xl font-bold md:text-4xl">
          Your AI tutor is waiting.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Join thousands of Indian students preparing smarter. Free forever to start.
        </p>
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Start free <Sparkles className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
