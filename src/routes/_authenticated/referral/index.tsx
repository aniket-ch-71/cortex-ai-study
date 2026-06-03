import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Gift, Share2, Sparkles, Trophy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/referral/")({
  head: () => ({ meta: [{ title: "Refer Friends — PARIKSHA" }] }),
  component: ReferralPage,
});

const TIERS = [
  { count: 1, label: "Starter Badge", emoji: "🌱" },
  { count: 3, label: "Bronze Badge", emoji: "🥉" },
  { count: 5, label: "Silver Badge", emoji: "🥈" },
  { count: 10, label: "Gold Badge", emoji: "🥇" },
];

function ReferralPage() {
  const [code, setCode] = useState<string>("");
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, referral_count")
        .eq("id", u.user.id)
        .maybeSingle();
      const p: any = data ?? {};
      setCode(p.referral_code ?? "");
      setCount(p.referral_count ?? 0);
      setLoading(false);
    })();
  }, []);

  const link = typeof window !== "undefined"
    ? `${window.location.origin}/?ref=${code}`
    : `https://pariksha.ai?ref=${code}`;

  const message = `🎓 Pariksha pe padh raha hoon — India's best FREE AI exam prep platform!

Mera code use kar: ${code}

JEE, NEET, UPSC, SSC, GATE sab ke liye.
Join karo: ${link}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied!");
    } catch {
      toast.error("Copy failed");
    }
  };

  const share = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const nextTier = TIERS.find((t) => t.count > count) ?? TIERS[TIERS.length - 1];
  const prevTier = [...TIERS].reverse().find((t) => t.count <= count);
  const pct = nextTier
    ? Math.min(100, Math.round((count / nextTier.count) * 100))
    : 100;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Gift className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Refer & lvl up badges</h1>
          <p className="text-sm text-muted-foreground">3 dost = 1 lvl up</p>
        </div>
      </div>

      {/* Code card */}
      <div className="mt-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-6 text-center">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Your referral code</p>
        <div className="mt-3 font-display text-4xl font-bold tracking-widest text-primary md:text-5xl">
          {loading ? "…" : code || "—"}
        </div>
        <button
          type="button"
          onClick={copy}
          className="mx-auto mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium transition hover:bg-secondary/70"
        >
          <Copy className="h-4 w-4" /> Copy code
        </button>
      </div>

      {/* Progress */}
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold">
              {count}/{nextTier.count} friends joined
            </p>
            {prevTier && (
              <p className="mt-1 text-xs text-muted-foreground">
                Unlocked: {prevTier.emoji} {prevTier.label}
              </p>
            )}
          </div>
          <Trophy className="h-6 w-6 text-amber" />
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-gradient-to-r from-primary to-teal" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Next reward: {nextTier.emoji} {nextTier.label} at {nextTier.count} friends
        </p>

        <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIERS.map((t) => {
            const unlocked = count >= t.count;
            return (
              <li
                key={t.count}
                className={`rounded-lg border p-3 text-center transition ${
                  unlocked
                    ? "border-amber/40 bg-amber/10 text-amber"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                <div className="text-2xl">{t.emoji}</div>
                <div className="mt-1 text-[11px] font-medium">{t.label}</div>
                <div className="text-[10px]">{t.count} friend{t.count === 1 ? "" : "s"}</div>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        type="button"
        onClick={share}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
      >
        <Share2 className="h-4 w-4" /> Share on WhatsApp 📤
      </button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        <Sparkles className="mr-1 inline h-3 w-3" />
        Pre-filled message includes your code + invite link
      </p>
    </div>
  );
}
