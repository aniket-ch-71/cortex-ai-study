import { useState } from "react";
import { Bookmark, AlertTriangle, Clock, Heart, ChevronDown, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { saveQuestion, type VaultTag } from "@/lib/vault";
import type { CanonicalQuestion } from "@/lib/question-schema";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TAGS: { value: VaultTag; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "save", label: "Save", icon: Bookmark },
  { value: "important", label: "Mark important", icon: AlertTriangle },
  { value: "revise_later", label: "Revise later", icon: Clock },
  { value: "favorite", label: "Favorite", icon: Heart },
];

export function SaveQuestionMenu({ q, compact = false }: { q: CanonicalQuestion; compact?: boolean }) {
  const [busy, setBusy] = useState<VaultTag | null>(null);
  const [saved, setSaved] = useState<VaultTag | null>(null);

  const onSave = async (tag: VaultTag) => {
    setBusy(tag);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { toast.error("Please sign in"); return; }
      const r = await saveQuestion(u.user.id, q, tag);
      if (!r) throw new Error("Save failed");
      setSaved(tag);
      toast.success(`Added to ${tag === "revise_later" ? "Revise Later" : tag.charAt(0).toUpperCase() + tag.slice(1)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium transition hover:border-primary/50 ${
          saved ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {saved ? <Check className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
        {!compact && (saved ? "Saved" : "Save")}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {TAGS.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => onSave(t.value)}
            disabled={busy === t.value}
            className="cursor-pointer text-sm"
          >
            {busy === t.value ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <t.icon className="mr-2 h-3.5 w-3.5" />
            )}
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
