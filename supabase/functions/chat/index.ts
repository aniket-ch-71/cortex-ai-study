// PARIKSHA AI Doubt Solver — streams from Lovable AI Gateway.
// System prompt lives server-side; client picks language + subject.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari script)",
  hinglish: "Hinglish (a natural mix of Hindi and English, written in Latin script)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, language = "en", subject } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = LANG_LABEL[language] ?? LANG_LABEL.en;
    const subjectLine = subject ? ` The student's current subject is ${subject}.` : "";

    const systemPrompt =
      `You are PARIKSHA AI, an expert tutor for Indian competitive-exam students ` +
      `(JEE, NEET, UPSC, SSC, GATE, CAT, NDA, CDS, Bank PO, IBPS, RRB, CBSE/ICSE/State Boards). ` +
      `Always reply in ${lang}. ` +
      `Explain concepts clearly with step-by-step reasoning, give a worked example where useful, ` +
      `and end with a one-line summary. Use markdown (headings, lists, code blocks for formulas). ` +
      `Stay focused on academics — politely refuse non-study questions.` +
      subjectLine;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit hit. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
