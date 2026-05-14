// PARIKSHA Study Planner — generates a weekly study schedule via Lovable AI Gateway
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const {
      exam,
      examDate = "",
      hoursPerDay = 4,
      subjects = [],
      weaknesses = "",
      language = "en",
    } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!exam) throw new Error("exam is required");

    const lang = language === "hi" ? "Hindi" : language === "hinglish" ? "Hinglish" : "English";
    const subjStr = (subjects as string[]).length ? (subjects as string[]).join(", ") : "core syllabus subjects";

    const systemPrompt =
      `You are PARIKSHA AI, a study planner for Indian competitive exams. ` +
      `Create a realistic 7-day weekly study plan for the ${exam} exam` +
      `${examDate ? ` (target date: ${examDate})` : ""}, with ${hoursPerDay} hours of study per day. ` +
      `Subjects to cover: ${subjStr}. ${weaknesses ? `Student weaknesses: ${weaknesses}.` : ""} ` +
      `For each day (Monday-Sunday), break the time into 2-4 focused blocks with subject, topic, duration in minutes, ` +
      `and the activity type (concept/practice/revision/mock-test). Include short breaks. ` +
      `Add 2-3 overall weekly tips. Reply in ${lang}. Use the submit_plan tool.`;

    const tool = {
      type: "function",
      function: {
        name: "submit_plan",
        description: "Submit the weekly study plan",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            tips: { type: "array", description: "2-5 weekly tips", items: { type: "string" } },
            days: {
              type: "array",
              description: "Exactly 7 days, Monday through Sunday",
              items: {
                type: "object",
                properties: {
                  day: {
                    type: "string",
                    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                  },
                  blocks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string" },
                        topic: { type: "string" },
                        durationMinutes: { type: "integer", description: "15-240 minutes" },
                        activity: {
                          type: "string",
                          enum: ["concept", "practice", "revision", "mock-test", "break"],
                        },
                      },
                      required: ["subject", "topic", "durationMinutes", "activity"],
                    },
                  },
                },
                required: ["day", "blocks"],
              },
            },
          },
          required: ["title", "tips", "days"],
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
          { role: "user", content: `Generate the weekly plan now.` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_plan" } },
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
      return new Response(JSON.stringify({ error: "AI did not return a plan" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
