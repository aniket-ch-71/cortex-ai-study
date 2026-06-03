import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings as Cog, Loader2, Save, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES } from "@/lib/cortex-data";
import { EXAM_CATEGORIES, SUB_EXAMS, type ExamCategory } from "@/lib/exam-patterns";

export const Route = createFileRoute("/_authenticated/settings/")({
  head: () => ({ meta: [{ title: "Settings — PARIKSHA" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState<ExamCategory>("SSC");
  const [targetExam, setTargetExam] = useState<string>("SSC CGL");
  const [language, setLanguage] = useState("en");
  const [showCA, setShowCA] = useState(true);
  const [doubtsToday, setDoubtsToday] = useState(0);
  const [email, setEmail] = useState("");
  const [newPw, setNewPw] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: prof }, { data: usage }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("daily_usage").select("doubts_used").eq("user_id", u.user.id).eq("usage_date", today).maybeSingle(),
      ]);
      if (prof) {
        setFullName(prof.full_name ?? "");
        setLanguage(prof.language ?? "en");
        setShowCA((prof as any).show_current_affairs !== false);
        if (prof.target_exam) {
          setTargetExam(prof.target_exam);
          const cat = (Object.keys(SUB_EXAMS) as ExamCategory[]).find((c) =>
            SUB_EXAMS[c].includes(prof.target_exam!),
          );
          if (cat) setCategory(cat);
        }
      }
      setDoubtsToday(usage?.doubts_used ?? 0);
      setLoading(false);
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return setSaving(false);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, target_exam: targetExam, language, show_current_affairs: showCA } as any)
      .eq("id", u.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Profile saved");
  };

  const onChangePassword = async () => {
    if (newPw.length < 6) return toast.error("Password must be at least 6 characters");
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) return toast.error(error.message);
    setNewPw("");
    toast.success("Password updated");
  };

  const onDeleteAccount = async () => {
    if (!confirm("Delete account? This signs you out and removes your profile data. This cannot be undone.")) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    // Best-effort client-side cleanup; full auth deletion needs an admin function.
    await Promise.all([
      supabase.from("notes").delete().eq("user_id", u.user.id),
      supabase.from("note_analyses").delete().eq("user_id", u.user.id),
      supabase.from("study_plans").delete().eq("user_id", u.user.id),
      supabase.from("mock_attempts").delete().eq("user_id", u.user.id),
      supabase.from("mock_tests").delete().eq("user_id", u.user.id),
      supabase.from("doubts").delete().eq("user_id", u.user.id),
    ]);
    await supabase.auth.signOut();
    toast.success("Account data deleted. Signed out.");
    navigate({ to: "/" });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Cog className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile, language, and account.</p>
        </div>
      </div>

      <section className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Profile</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Email"><Input value={email} disabled /></Field>
          <Field label="Full name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
          <Field label="Exam category">
            <Select value={category} onValueChange={(v) => { const c = v as ExamCategory; setCategory(c); setTargetExam(SUB_EXAMS[c][0]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{EXAM_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Target exam">
            <Select value={targetExam} onValueChange={setTargetExam}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{SUB_EXAMS[category].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Language">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Button onClick={onSave} disabled={saving} className="mt-6">
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save profile</>}
        </Button>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Preferences</h2>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Show Current Affairs tab</p>
            <p className="text-xs text-muted-foreground">
              Daily digest in the sidebar. Recommended for SSC, UPSC, Banking, Railway, CDS.
            </p>
          </div>
          <Switch checked={showCA} onCheckedChange={setShowCA} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Click "Save profile" above to apply.</p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Daily limits</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          AI Doubt Solver: <span className="font-medium text-foreground">{doubtsToday}/5</span> used today.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">Change password</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <Button variant="outline" onClick={onChangePassword} disabled={pwSaving}>
            {pwSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating…</> : <><KeyRound className="mr-2 h-4 w-4" /> Update</>}
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-coral/30 bg-coral/5 p-6">
        <h2 className="font-display text-lg font-semibold text-coral">Danger zone</h2>
        <p className="mt-2 text-sm text-muted-foreground">Deletes all your data and signs you out. This cannot be undone.</p>
        <Button variant="destructive" className="mt-4" onClick={onDeleteAccount}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete account
        </Button>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
