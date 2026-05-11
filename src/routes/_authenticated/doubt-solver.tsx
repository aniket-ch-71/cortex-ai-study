import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Trash2, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES, SUBJECTS, type LangValue } from "@/lib/cortex-data";

export const Route = createFileRoute("/_authenticated/doubt-solver")({
  head: () => ({ meta: [{ title: "AI Doubt Solver — CORTEX" }] }),
  component: DoubtSolverPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const DAILY_LIMIT = 5;
const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

function DoubtSolverPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<LangValue>("en");
  const [subject, setSubject] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [used, setUsed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch today's usage + load user language preference
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const today = new Date().toISOString().slice(0, 10);
      const [{ data: prof }, { data: usage }] = await Promise.all([
        supabase.from("profiles").select("language").eq("id", u.user.id).maybeSingle(),
        supabase
          .from("daily_usage")
          .select("doubts_used")
          .eq("user_id", u.user.id)
          .eq("usage_date", today)
          .maybeSingle(),
      ]);
      if (prof?.language) setLanguage(prof.language as LangValue);
      setUsed(usage?.doubts_used ?? 0);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const remaining = Math.max(0, DAILY_LIMIT - used);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (remaining <= 0) {
      toast.error("You've hit today's free doubt limit. Come back tomorrow or upgrade to Pro.");
      return;
    }

    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) {
      toast.error("Please sign in again.");
      return;
    }

    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    let assistantSoFar = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next, language, subject: subject || undefined }),
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({ error: "Stream failed" }));
        throw new Error(errBody.error || "Stream failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) {
              assistantSoFar += chunk;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
                return copy;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Persist Q&A and bump usage
      const { data: u } = await supabase.auth.getUser();
      if (u.user && assistantSoFar) {
        const today = new Date().toISOString().slice(0, 10);
        await supabase.from("doubts").insert({
          user_id: u.user.id,
          question: text,
          answer: assistantSoFar,
          language,
          subject: subject || null,
        });
        const newCount = used + 1;
        await supabase
          .from("daily_usage")
          .upsert(
            { user_id: u.user.id, usage_date: today, doubts_used: newCount },
            { onConflict: "user_id,usage_date" },
          );
        setUsed(newCount);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
      // Remove the empty assistant placeholder
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const clear = () => setMessages([]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top controls */}
      <div className="border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h1 className="font-display text-base font-semibold">AI Doubt Solver</h1>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs">
              {LANGUAGES.map((l) => (
                <button
                  key={l.value}
                  onClick={() => setLanguage(l.value)}
                  className={`rounded px-2.5 py-1 transition ${
                    language === l.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="rounded-md border border-input bg-card px-2.5 py-1.5 text-xs"
            >
              <option value="">All subjects</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <span
              className={`rounded-full border border-border px-2.5 py-1 text-xs ${
                remaining > 0 ? "text-muted-foreground" : "text-coral"
              }`}
            >
              {remaining}/{DAILY_LIMIT} free today
            </span>

            <button
              onClick={clear}
              disabled={messages.length === 0}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
          {messages.length === 0 && <Welcome onPick={(p) => setInput(p)} language={language} />}

          <div className="space-y-5">
            {messages.map((m, i) => (
              <ChatBubble key={i} msg={m} />
            ))}
            {streaming && messages[messages.length - 1]?.content === "" && <TypingDots />}
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-background">
        <div className="mx-auto max-w-3xl px-4 py-4 md:px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                remaining > 0
                  ? "Ask anything — physics, history, current affairs…"
                  : "Daily limit reached"
              }
              disabled={streaming || remaining <= 0}
              className="flex-1 rounded-md border border-input bg-card px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim() || remaining <= 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            CORTEX AI can make mistakes. Double-check important facts.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const onCopy = () => {
    navigator.clipboard.writeText(msg.content);
    toast.success("Copied");
  };
  return (
    <div className={`animate-message-in flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${
          isUser ? "bg-primary text-primary-foreground" : "bg-purple/20 text-purple"
        }`}
      >
        {isUser ? "You" : "AI"}
      </div>
      <div className={`max-w-[85%] ${isUser ? "items-end" : ""}`}>
        <div
          className={`no-select whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-foreground"
          }`}
        >
          {msg.content || " "}
        </div>
        {!isUser && msg.content && (
          <button
            onClick={onCopy}
            className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
        )}
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-purple/20 text-xs font-semibold text-purple">
        AI
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}

function Welcome({ onPick, language }: { onPick: (p: string) => void; language: LangValue }) {
  const samples =
    language === "hi"
      ? [
          "न्यूटन का दूसरा नियम समझाइए",
          "प्रकाश संश्लेषण क्या है?",
          "भारत के संविधान की विशेषताएँ",
        ]
      : language === "hinglish"
      ? [
          "Bhai Newton ka second law samjha de",
          "Photosynthesis ka step by step process kya hai?",
          "JEE me integration ke important formulas",
        ]
      : [
          "Explain Newton's second law with an example",
          "What is photosynthesis? Step by step",
          "Important integration formulas for JEE",
        ];
  return (
    <div className="mx-auto max-w-xl py-8 text-center">
      <div className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Sparkles className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold">Ask anything</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Your AI tutor — explains step-by-step, in your language.
      </p>
      <div className="mt-6 grid gap-2">
        {samples.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-secondary"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
