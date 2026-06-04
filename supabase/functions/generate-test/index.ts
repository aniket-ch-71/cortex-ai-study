// PARIKSHA Mock Test Generator — generates MCQs via Lovable AI Gateway using tool calling for structured JSON.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireUser, enforceDailyQuota } from "../_shared/auth.ts";

const AI_TEST_DAILY_LIMIT = 3;

const LANG_LABEL: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari)",
  hinglish: "Hinglish (Hindi-English mix in Latin script)",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const quota = await enforceDailyQuota(auth.admin, auth.userId, "tests", AI_TEST_DAILY_LIMIT);
    if (quota) return quota;

    const {
      subject,
      exam = "",
      difficulty = "medium",
      numQuestions = 10,
      language = "en",
      topic = "",
      marksPerQuestion = 1,
      negativeMarking = 0,
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = LANG_LABEL[language] ?? LANG_LABEL.en;
    // Hard cap: max 25 questions per AI call to keep generation reliable.
    const n = Math.max(5, Math.min(100, Number(numQuestions) || 10));

    const negInfo =
      Number(negativeMarking) !== 0
        ? `This exam uses negative marking of ${negativeMarking} per wrong answer, so make distractors plausible (no obvious throwaways).`
        : `This exam has no negative marking.`;

    const systemPrompt =
      `You are PARIKSHA AI, an expert exam-question setter for Indian competitive exams. ` +
      `Generate exactly ${n} high-quality multiple-choice questions for the "${exam || "general study"}" exam ` +
      `from the section "${subject}"${topic ? ` (topic focus: ${topic})` : ""} at ${difficulty} difficulty. ` +
      `Each question is worth ${marksPerQuestion} marks. ${negInfo} ` +
      `Match the real syllabus, style, and difficulty pattern of ${exam || "the exam"} for the ${subject} section. ` +
      `Each question must have exactly 4 options and one correct answer. ` +
      `Provide a concise explanation for each correct answer. ` +
      `Write all content in ${lang}. ` +
      `Use the submit_test tool to return the questions.`;

    const tool = {
      type: "function",
      function: {
        name: "submit_test",
        description: "Submit the generated mock test questions",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "A short title for this test" },
            questions: {
              type: "array",
              description: `Exactly ${n} questions`,
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    description: "Exactly 4 options",
                    items: { type: "string" },
                  },
                  correct_index: { type: "integer", description: "0-3 index of correct option" },
                  explanation: { type: "string" },
                },
                required: ["question", "options", "correct_index", "explanation"],
              },
            },
          },
          required: ["title", "questions"],
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
          { role: "user", content: `Generate the test now.` },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_test" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      console.error("No tool call returned", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "AI did not return questions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(call.function.arguments);
    // Hard cap: never let AI overshoot the requested question count.
    if (Array.isArray(args?.questions) && args.questions.length > n) {
      args.questions = args.questions.slice(0, n);
    }
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-test error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
