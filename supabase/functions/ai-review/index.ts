// PARIKSHA AI Review — analyses a question and returns structured QA verdict via Lovable AI Gateway
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, requireUser } from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireUser(req);
    if (auth instanceof Response) return auth;
    const { admin, userId } = auth;

    // Staff check
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isStaff = ((roles ?? []) as { role: string }[]).some((r) => r.role !== "user");
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question_id } = await req.json();
    if (!question_id) throw new Error("question_id is required");

    const { data: q, error: qe } = await admin
      .from("question_bank")
      .select(
        "id, question, options, correct_index, explanation, subject, chapter, topic, difficulty, tags, question_type",
      )
      .eq("id", question_id)
      .maybeSingle();
    if (qe || !q) throw new Error("Question not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const model = "google/gemini-3.6-flash";

    const tool = {
      type: "function",
      function: {
        name: "submit_qa_review",
        description: "Submit the AI QA review of the exam question",
        parameters: {
          type: "object",
          properties: {
            overall_score: { type: "integer", description: "0-100 overall quality" },
            components: {
              type: "object",
              properties: {
                question_clarity: { type: "integer" },
                explanation_quality: { type: "integer" },
                metadata_completeness: { type: "integer" },
                difficulty_consistency: { type: "integer" },
                exam_alignment: { type: "integer" },
                language_quality: { type: "integer" },
                distractor_quality: { type: "integer" },
                formatting: { type: "integer" },
              },
              required: [
                "question_clarity",
                "explanation_quality",
                "metadata_completeness",
                "difficulty_consistency",
                "exam_alignment",
                "language_quality",
                "distractor_quality",
                "formatting",
              ],
            },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  category: {
                    type: "string",
                    enum: [
                      "grammar",
                      "spelling",
                      "ambiguity",
                      "duplicate",
                      "weak_explanation",
                      "incorrect_difficulty",
                      "missing_metadata",
                      "wrong_tag",
                      "wrong_chapter",
                      "wrong_topic",
                      "weak_distractor",
                      "factual",
                      "formatting",
                    ],
                  },
                  message: { type: "string" },
                },
                required: ["severity", "category", "message"],
              },
            },
            suggestions: { type: "array", items: { type: "string" } },
            verdict: { type: "string", enum: ["excellent", "good", "needs_review", "critical"] },
          },
          required: ["overall_score", "components", "issues", "suggestions", "verdict"],
        },
      },
    };

    const system =
      "You are a senior QA reviewer for a competitive-exam question bank. Analyse the given question " +
      "for grammar, spelling, ambiguity, duplicate concepts, weak explanations, incorrect difficulty, " +
      "missing/incorrect metadata (chapter/topic/tags), and weak distractors. Score each component 0-100. " +
      "Return an actionable list of issues with severities and concrete suggestions. Never say the question is perfect if issues exist. Use the submit_qa_review tool.";

    const payload = {
      model,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            `Subject: ${q.subject}\nChapter: ${q.chapter ?? "-"}\nTopic: ${q.topic ?? "-"}\n` +
            `Difficulty: ${q.difficulty}\nType: ${q.question_type}\nTags: ${(q.tags ?? []).join(", ")}\n\n` +
            `Question:\n${q.question}\n\nOptions:\n${(q.options ?? []).map((o: string, i: number) => `${i}. ${o}`).join("\n")}\n\n` +
            `Correct index: ${q.correct_index}\n\nExplanation:\n${q.explanation}`,
        },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "submit_qa_review" } },
    };

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const t = await r.text();
      console.error("ai gateway", r.status, t);
      const status = r.status === 429 || r.status === 402 ? r.status : 500;
      return new Response(JSON.stringify({ error: r.status === 429 ? "Rate limited" : r.status === 402 ? "AI credits exhausted" : "AI gateway error" }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await r.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return verdict");
    const verdict = JSON.parse(call.function.arguments);

    // Persist verdict and update quality_score
    await admin.from("question_ai_reviews").insert({
      question_id,
      model,
      verdict,
      score: verdict.overall_score,
      created_by: userId,
    });
    await admin
      .from("question_bank")
      .update({
        ai_review: verdict,
        quality_score: verdict.overall_score,
        quality_score_breakdown: verdict.components,
        updated_at: new Date().toISOString(),
      })
      .eq("id", question_id);
    await admin.from("audit_logs").insert({
      actor_id: userId,
      action: "ai.review",
      entity_type: "question",
      entity_id: question_id,
      diff: { score: verdict.overall_score, verdict: verdict.verdict },
    });

    return new Response(JSON.stringify(verdict), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-review error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
