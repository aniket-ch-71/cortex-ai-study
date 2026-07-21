import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Check, X, Loader2, Star, Search, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SUB_EXAMS } from "@/lib/exam-patterns";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to PARIKSHA" }] }),
  component: Onboarding,
});

const ALL_EXAMS = Object.values(SUB_EXAMS).flat();

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman & Nicobar","Chandigarh","Dadra & Nagar Haveli and Daman & Diu","Delhi","Jammu & Kashmir",
  "Ladakh","Lakshadweep","Puducherry",
];

type Step1 = { fullName: string; email: string; password: string; username: string };

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [authedExisting, setAuthedExisting] = useState(false);

  // Step 1
  const [s1, setS1] = useState<Step1>({ fullName: "", email: "", password: "", username: "" });
  const [show, setShow] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");

  // Step 2
  const [exams, setExams] = useState<string[]>([]);
  const [examQuery, setExamQuery] = useState("");

  // Step 3
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [language, setLanguage] = useState("en");
  const [submitting, setSubmitting] = useState(false);

  // If already signed in (e.g., after social login or partial onboarding), prefill
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setAuthedExisting(true);
        const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
        if (p) {
          setS1((s) => ({
            ...s,
            fullName: p.full_name ?? "",
            email: data.user!.email ?? "",
            username: p.username ?? "",
          }));
          if (Array.isArray(p.exams)) setExams(p.exams as string[]);
          setState(p.state ?? "");
          setCity(p.city ?? "");
          setLanguage(p.language ?? "en");
          if (p.onboarded) navigate({ to: "/dashboard" });
        }
      }
    })();
  }, [navigate]);

  // Debounced username availability check
  useEffect(() => {
    const u = s1.username.trim();
    if (!u) { setUsernameStatus("idle"); return; }
    if (!/^[a-z0-9_]{3,20}$/i.test(u)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc("username_available", { uname: u });
      if (error) { setUsernameStatus("idle"); return; }
      setUsernameStatus(data ? "ok" : "taken");
    }, 400);
    return () => clearTimeout(t);
  }, [s1.username]);

  const filteredExams = useMemo(() => {
    const q = examQuery.toLowerCase().trim();
    return q ? ALL_EXAMS.filter((e) => e.toLowerCase().includes(q)) : ALL_EXAMS;
  }, [examQuery]);

  const toggleExam = (e: string) => {
    setExams((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  };

  const canStep1 = s1.fullName.trim().length >= 2
    && /\S+@\S+\.\S+/.test(s1.email)
    && (authedExisting || s1.password.length >= 6)
    && usernameStatus === "ok";

  const canStep2 = exams.length >= 3;
  const canStep3 = state.trim() && city.trim();

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const finish = async () => {
    setSubmitting(true);
    try {
      // 1. Sign up if not already
      let userId: string | null = null;
      if (!authedExisting) {
        const { data, error } = await supabase.auth.signUp({
          email: s1.email,
          password: s1.password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { full_name: s1.fullName, language },
          },
        });
        if (error) throw error;
        userId = data.user?.id ?? null;
        // If email confirmation required, session may be null. Then we cannot update profile yet.
        if (!data.session) {
          toast.success("Account created — please check your email to confirm, then sign in to finish setup.");
          navigate({ to: "/auth", search: { mode: "login", redirect: "/onboarding" } });
          return;
        }
      } else {
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
      }
      if (!userId) throw new Error("No user");

      // 2. Update profile with full onboarding data
      const primary = exams[0];
      const { error: pErr } = await supabase.from("profiles").update({
        full_name: s1.fullName,
        username: s1.username.trim(),
        exams: exams as any,
        primary_exam: primary,
        target_exam: primary,
        state,
        city,
        language,
        onboarded: true,
      } as any).eq("id", userId);
      if (pErr) {
        if (pErr.code === "23505") throw new Error("Username just got taken — please pick another");
        throw pErr;
      }

      // 2b. Redeem referral code if captured on landing page
      try {
        const refCode = localStorage.getItem("pariksha_ref");
        if (refCode) {
          await supabase.rpc("redeem_referral" as any, { _code: refCode } as any);
          localStorage.removeItem("pariksha_ref");
        }
      } catch {
        /* non-blocking */
      }


      // 3. Confetti
      try {
        // @ts-ignore — loaded from CDN at runtime
        if (!window.confetti) {
          await new Promise<void>((res, rej) => {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/canvas-confetti/1.9.3/confetti.browser.min.js";
            s.onload = () => res();
            s.onerror = () => rej();
            document.head.appendChild(s);
          });
        }
        // @ts-ignore
        window.confetti?.({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      } catch {/* non-blocking */}

      toast.success("You're all set!");
      setTimeout(() => navigate({ to: "/dashboard" }), 600);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <Zap className="h-4 w-4" strokeWidth={2.5} />
          </span>
          PARIKSHA
        </Link>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step} of 3</span>
            <span>{step === 1 ? "Account" : step === 2 ? "Exams" : "Location"}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-5 animate-fade-up">
            <div>
              <h1 className="font-display text-2xl font-bold">Create your account</h1>
              <p className="mt-1 text-sm text-muted-foreground">Free forever. No credit card needed.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={s1.fullName} onChange={(e) => setS1({ ...s1, fullName: e.target.value })} placeholder="Your name" />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={s1.email} disabled={authedExisting} onChange={(e) => setS1({ ...s1, email: e.target.value })} placeholder="you@example.com" />
            </div>

            {!authedExisting && (
              <div className="space-y-1.5">
                <Label>Password</Label>
                <div className="relative">
                  <Input type={show ? "text" : "password"} value={s1.password} onChange={(e) => setS1({ ...s1, password: e.target.value })} placeholder="At least 6 characters" />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Toggle password">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                <Input
                  className="pl-7 pr-9"
                  value={s1.username}
                  onChange={(e) => setS1({ ...s1, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                  placeholder="yourhandle"
                  maxLength={20}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {usernameStatus === "ok" && <Check className="h-4 w-4 text-teal" />}
                  {(usernameStatus === "taken" || usernameStatus === "invalid") && <X className="h-4 w-4 text-coral" />}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {usernameStatus === "invalid" && "3-20 chars, letters/numbers/underscore"}
                {usernameStatus === "taken" && "That username is taken"}
                {usernameStatus === "ok" && "Available!"}
                {usernameStatus === "idle" && "Pick a unique handle"}
                {usernameStatus === "checking" && "Checking…"}
              </p>
            </div>

            <Button className="w-full" onClick={next} disabled={!canStep1}>Continue</Button>

            <p className="text-center text-xs text-muted-foreground">
              Already have an account? <Link to="/auth" search={{ mode: "login" }} className="text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-fade-up">
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Which exams are you preparing for?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Select minimum 3 — you can change later. The first one becomes your primary exam.</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={examQuery} onChange={(e) => setExamQuery(e.target.value)} placeholder="Search exams…" className="pl-9" />
            </div>

            <div className="flex flex-wrap gap-2">
              {filteredExams.map((e) => {
                const idx = exams.indexOf(e);
                const selected = idx >= 0;
                const isPrimary = idx === 0;
                return (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggleExam(e)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                      selected
                        ? "border-primary bg-primary/15 text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {isPrimary && <Star className="h-3 w-3 fill-amber text-amber" />}
                    {e}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{exams.length} selected{exams.length < 3 && " (need 3)"}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={back}>Back</Button>
                <Button onClick={next} disabled={!canStep2}>Continue</Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 animate-fade-up">
            <div>
              <h1 className="font-display text-2xl font-bold">Where are you based?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Helps us tailor content and current affairs.</p>
            </div>

            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>City / town</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Lucknow" />
            </div>

            <div className="space-y-1.5">
              <Label>Preferred language</Label>
              <div className="flex gap-2">
                {[{ v: "en", l: "English" }, { v: "hi", l: "हिंदी" }, { v: "hinglish", l: "Hinglish" }].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setLanguage(o.v)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm transition ${
                      language === o.v ? "border-primary bg-primary/15" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={back}>Back</Button>
              <Button onClick={finish} disabled={!canStep3 || submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up…</> : "Complete Setup"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
