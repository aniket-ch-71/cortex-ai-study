// PARIKSHA Notes Analyser — scores user-pasted notes and returns structured feedback via Lovable AI Gateway
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { topic, subject = "", exam = "", text, language = "en" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!topic || !text) throw new Error("topic and text are required");

    const systemPrompt =
      `You are PARIKSHA AI, an expert Indian exam tutor evaluating a student's study notes ` +
      `on "${topic}"${subject ? ` (subject: ${subject})` : ""}${exam ? ` for the ${exam} exam` : ""}. ` +
      `Score the notes from 0-100 across coverage, accuracy, clarity, and exam-readiness. ` +
      `List the top strengths, the gaps/missing topics the student should add, factual errors if any, ` +
      `and 3-5 concrete improvement suggestions. Reply in ${language === "hi" ? "Hindi" : language === "hinglish" ? "Hinglish" : "English"}. ` +
      `Use the submit_analysis tool.`;

    const tool = {
      type: "function",
      function: {
        name: "submit_analysis",
        description: "Submit the analysis of the student's notes",
        parameters: {
          type: "object",
          properties: {
            score: { type: "integer", description: "0-100 score" },
            summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            gaps: { type: "array", items: { type: "string" } },
            errors: { type: "array", items: { type: "string" } },
            suggestions: { type: "array", description: "3-5 concrete suggestions", items: { type: "string" } },
          },
          required: ["score", "summary", "strengths", "gaps", "suggestions"],
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
          { role: "user", content: `Student's notes:\n\n${String(text).slice(0, 12000)}` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
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
      return new Response(JSON.stringify({ error: "AI did not return analysis" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyse-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
