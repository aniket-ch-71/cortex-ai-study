// PARIKSHA Daily Current Affairs — generates and caches today's digest via Lovable AI Gateway
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function todayIST(): string {
  // YYYY-MM-DD in Asia/Kolkata
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let force = false;
    try {
      const body = await req.json();
      force = !!body?.force;
    } catch (_) {
      /* no body */
    }

    const date = todayIST();

    if (!force) {
      const { data: cached } = await admin
        .from("current_affairs")
        .select("date, items, generated_at")
        .eq("date", date)
        .maybeSingle();
      if (cached) {
        return new Response(JSON.stringify({ ...cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt =
      `You are an expert on Indian current affairs for competitive exams (SSC, UPSC, Banking, Railway, CDS, GATE). ` +
      `Generate today's top 8 current affairs most likely to appear in upcoming exams. ` +
      `Today's date: ${date}. ` +
      `For each item: a 1-line headline, 2-3 line plain-language explanation, exam tags (SSC, UPSC, Banking, Railway, CDS, Defence — pick all that apply), ` +
      `and exactly 2 MCQs each (4 options, 0-indexed correct_index, brief explanation). ` +
      `Focus on: Government schemes, International relations, Economy, Science & Tech, Defence, Awards, Sports. ` +
      `Use the submit_affairs tool to return the result.`;

    const tool = {
      type: "function",
      function: {
        name: "submit_affairs",
        description: "Submit today's curated current affairs",
        parameters: {
          type: "object",
          properties: {
            items: {
              type: "array",
              minItems: 8,
              maxItems: 8,
              items: {
                type: "object",
                properties: {
                  headline: { type: "string" },
                  explanation: { type: "string" },
                  exam_tags: { type: "array", items: { type: "string" } },
                  questions: {
                    type: "array",
                    minItems: 2,
                    maxItems: 2,
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: {
                          type: "array",
                          minItems: 4,
                          maxItems: 4,
                          items: { type: "string" },
                        },
                        correct_index: { type: "integer", minimum: 0, maximum: 3 },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "correct_index", "explanation"],
                    },
                  },
                },
                required: ["headline", "explanation", "exam_tags", "questions"],
              },
            },
          },
          required: ["items"],
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate today's current affairs now." },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_affairs" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      const msg =
        status === 429
          ? "Rate limit hit. Try again in a minute."
          : status === 402
            ? "AI credits exhausted."
            : "AI gateway error";
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      console.error("No tool call returned", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return affairs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(call.function.arguments);
    const items = Array.isArray(args?.items) ? args.items.slice(0, 8) : [];

    // Upsert cache
    const { error: upErr } = await admin
      .from("current_affairs")
      .upsert({ date, items }, { onConflict: "date" });
    if (upErr) console.error("upsert current_affairs:", upErr);

    return new Response(
      JSON.stringify({ date, items, generated_at: new Date().toISOString(), cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-current-affairs error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
