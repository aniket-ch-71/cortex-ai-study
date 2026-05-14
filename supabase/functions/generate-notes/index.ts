// PARIKSHA Notes Generator — generates structured study notes + flashcards via Lovable AI Gateway tool calling
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari)",
  hinglish: "Hinglish (Hindi-English mix in Latin script)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { topic, subject, exam = "", language = "en", numFlashcards = 12 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!topic || !subject) throw new Error("topic and subject are required");

    const lang = LANG_LABEL[language] ?? LANG_LABEL.en;
    const n = Math.max(5, Math.min(20, Number(numFlashcards) || 12));

    const systemPrompt =
      `You are PARIKSHA AI, an expert Indian exam tutor. ` +
      `Create comprehensive study notes for the topic "${topic}" in subject "${subject}"` +
      `${exam ? ` for the ${exam} exam` : ""}. ` +
      `Notes must include: a short intro, key concepts as bullets, important formulas/definitions, ` +
      `worked examples, common mistakes, and a quick-revision summary. Use Markdown headings (##, ###), bullets, and code blocks for formulas. ` +
      `Also generate exactly ${n} active-recall flashcards (Q&A) covering the most testable points. ` +
      `Write everything in ${lang}. Use the submit_notes tool to return the result.`;

    const tool = {
      type: "function",
      function: {
        name: "submit_notes",
        description: "Submit the generated study notes and flashcards",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string", description: "Markdown formatted study notes" },
            flashcards: {
              type: "array",
              description: `Exactly ${n} flashcards`,
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  answer: { type: "string" },
                },
                required: ["question", "answer"],
              },
            },
          },
          required: ["title", "content", "flashcards"],
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate the notes now.` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_notes" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429)
        return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (response.status === 402)
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      console.error("No tool call returned", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return notes" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
