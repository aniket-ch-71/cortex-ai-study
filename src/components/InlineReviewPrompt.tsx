import { useEffect, useState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "cortex.reviewDismissed";

export function InlineReviewPrompt({ delayMs = 0 }: { delayMs?: number }) {
  const { profile, primaryExam, refetch } = useProfile();
  const [show, setShow] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if ((profile as any).has_reviewed) return;
    if (typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1") return;
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [profile, delayMs]);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  };

  const submit = async () => {
    if (!rating) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("reviews").insert({
        user_id: u.user.id,
        rating,
        review_text: text.trim() || null,
        exam: primaryExam ?? null,
      });
      if (error) throw error;
      await supabase
        .from("profiles")
        .update({ has_reviewed: true } as any)
        .eq("id", u.user.id);
      toast.success("Thanks for your review!");
      if (rating >= 4) confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
      refetch();
      setShow(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit review");
    } finally {
      setSaving(false);
    }
  };

  const expanded = rating >= 4;

  return (
    <div className="relative mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5 animate-fade-up">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="font-medium">How was this experience?</p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = (hover || rating) >= n;
          return (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(n)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star className={cn("h-6 w-6", active ? "fill-amber text-amber" : "text-muted-foreground")} />
            </button>
          );
        })}
      </div>
      {expanded && (
        <div className="mt-3 space-y-3">
          <Textarea
            placeholder="Tell others about your experience (optional)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[80px]"
            maxLength={500}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={dismiss} disabled={saving}>
              Not now
            </Button>
            <Button size="sm" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        </div>
      )}
      {!expanded && rating > 0 && rating < 4 && (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
