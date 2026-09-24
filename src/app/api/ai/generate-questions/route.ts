import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai";
import {
  getExamBySlug,
  getSubjectsByExamId,
  getTopicsBySubjectId,
  getQuestionsPool,
  getAllQuestions,
  addQuestionsBatchToBank,
} from "@/lib/db";
import { verifyAdminAuthorization } from "@/lib/auth/admin";
import { normalizeQuestionText } from "@/lib/import/importService";
import { Question } from "@/types/database";
import { aiGenerationLimiter } from "@/lib/security/rateLimit";
import { generateRequestId, logger, withRequestIdHeaders } from "@/lib/monitoring/logger";

const RequestSchema = z.object({
  examSlug: z.string().min(1, "examSlug is required"),
  subjectSlug: z.string().min(1, "subjectSlug is required"),
  topicSlug: z.string().min(1, "topicSlug is required"),
  count: z.number().int().min(1).max(20).default(5),
  difficulty: z.enum(["easy", "moderate", "hard"]).default("moderate"),
});

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  // Rate Limiting Guard
  const rateCheck = await aiGenerationLimiter.check(req);
  if (!rateCheck.success) {
    logger.warn("Rate limit exceeded for AI generation", { requestId });
    return withRequestIdHeaders(
      NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 }),
      requestId
    );
  }

  // 1. Server-side Admin Authorization Guard
  const auth = await verifyAdminAuthorization();
  if (!auth.authorized) {
    logger.warn("Unauthorized attempt to trigger AI generation", { requestId, error: auth.error });
    return withRequestIdHeaders(
      NextResponse.json({ error: auth.error || "Forbidden" }, { status: 403 }),
      requestId
    );
  }

  try {
    const body = await req.json();
    const validated = RequestSchema.parse(body);

    const exam = await getExamBySlug(validated.examSlug);
    if (!exam) {
      return NextResponse.json({ error: `Exam "${validated.examSlug}" not found.` }, { status: 404 });
    }

    const subjects = await getSubjectsByExamId(exam.id);
    const subject = subjects.find((s) => s.slug === validated.subjectSlug);
    if (!subject) {
      return NextResponse.json({ error: `Subject "${validated.subjectSlug}" not found.` }, { status: 404 });
    }

    const topics = await getTopicsBySubjectId(subject.id);
    const topic = topics.find((t) => t.slug === validated.topicSlug);
    if (!topic) {
      return NextResponse.json({ error: `Topic "${validated.topicSlug}" not found.` }, { status: 404 });
    }

    // Fetch up to 3 approved PYQs as few-shot reference
    const samplePyqs = await getQuestionsPool({
      examId: exam.id,
      subjectIds: [subject.id],
      topicIds: [topic.id],
      type: "PYQ",
    });

    const aiProvider = getAIProvider();

    const generated = await aiProvider.generateQuestions({
      examName: exam.name,
      subjectName: subject.name,
      topicName: topic.name,
      count: validated.count,
      difficulty: validated.difficulty,
      samplePyqs: samplePyqs.slice(0, 3).map((q) => ({
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
      })),
    });

    if (generated.length === 0) {
      return NextResponse.json(
        { error: "AI generation returned empty results or API key is unconfigured." },
        { status: 502 }
      );
    }

    // 2. Duplicate Detection: Check against existing questions bank
    const existingQuestions = await getAllQuestions();
    const existingNormalized = new Set(existingQuestions.map((q) => normalizeQuestionText(q.question_text)));

    const uniqueGenerated = generated.filter((g) => {
      const norm = normalizeQuestionText(g.question_text);
      if (existingNormalized.has(norm)) {
        return false;
      }
      existingNormalized.add(norm);
      return true;
    });

    if (uniqueGenerated.length === 0) {
      return NextResponse.json(
        { error: "Generated questions were identified as duplicates of existing questions in the bank." },
        { status: 409 }
      );
    }

    // 3. Strict Integrity Rule: Questions are saved as type = 'MODEL', verification_status = 'pending'
    const storedQuestions: Question[] = [];
    const timestamp = new Date().toISOString();

    for (let i = 0; i < uniqueGenerated.length; i++) {
      const g = uniqueGenerated[i];
      const newQuestion: Question = {
        id: `ai-model-${Date.now()}-${i + 1}`,
        exam_id: exam.id,
        subject_id: subject.id,
        topic_id: topic.id,
        type: "MODEL", // Never tagged as PYQ
        question_text: g.question_text,
        option_a: g.option_a,
        option_b: g.option_b,
        option_c: g.option_c,
        option_d: g.option_d,
        correct_answer: g.correct_answer,
        explanation: g.explanation,
        difficulty: g.difficulty,
        source_year: null, // Never given a fake year
        source_paper: null,
        verification_status: "pending", // Starts as pending for admin approval
        times_shown: 0,
        times_correct: 0,
        import_batch_id: `ai-gen-${Date.now()}`,
        import_source_filename: `AI_${aiProvider.name.toUpperCase()}`,
        import_source_row: i + 1,
        created_at: timestamp,
        updated_at: timestamp,
      };
      storedQuestions.push(newQuestion);
    }

    await addQuestionsBatchToBank(storedQuestions);

    return NextResponse.json({
      success: true,
      count: storedQuestions.length,
      provider: aiProvider.name,
      questions: storedQuestions,
      message: `${storedQuestions.length} model questions generated and stored with verification_status='pending' for administrator review.`,
    });
  } catch (err: unknown) {
    console.error("AI question generation error:", err);
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
