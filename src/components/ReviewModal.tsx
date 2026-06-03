import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

export function ReviewModal({
  open,
  onOpenChange,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmitted?: () => void;
}) {
  const { profile, primaryExam } = useProfile();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!rating) return toast.error("Pick a rating first");
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
      toast.success("Thanks for your review! It will appear after verification.");
      if (rating >= 4) {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.7 } });
      }
      onSubmitted?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit review");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate PARIKSHA</DialogTitle>
          <DialogDescription>
            Your honest feedback helps other students discover us.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex items-center justify-center gap-1.5">
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
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition",
                    active ? "fill-amber text-amber" : "text-muted-foreground",
                  )}
                />
              </button>
            );
          })}
        </div>

        <Textarea
          placeholder="What do you like most? What could be better? (optional)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          className="mt-2 min-h-[100px]"
        />
        {primaryExam && (
          <p className="text-xs text-muted-foreground">
            Posting as preparing for <span className="font-medium text-foreground">{primaryExam}</span>
            {profile?.full_name ? ` · ${profile.full_name.split(" ")[0]}` : ""}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Skip
          </Button>
          <Button onClick={submit} disabled={saving || !rating}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
