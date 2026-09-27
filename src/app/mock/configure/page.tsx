import { getExams, getAllSubjects, getAllTopics, getAllQuestions } from "@/lib/db";
import { MockConfigWizard } from "@/components/mock/MockConfigWizard";

interface ConfigurePageProps {
  searchParams?: Promise<{
    exam?: string;
    ratio?: string;
  }>;
}

export default async function ConfigurePage({ searchParams }: ConfigurePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [exams, subjects, topics, approvedQuestions] = await Promise.all([
    getExams(),
    getAllSubjects(),
    getAllTopics(),
    getAllQuestions({ status: "approved" }),
  ]);

  const examQuestionCounts: Record<string, { pyq: number; model: number }> = {};
  for (const exam of exams) {
    examQuestionCounts[exam.id] = { pyq: 0, model: 0 };
  }
  for (const q of approvedQuestions) {
    if (!examQuestionCounts[q.exam_id]) {
      examQuestionCounts[q.exam_id] = { pyq: 0, model: 0 };
    }
    if (q.type === "PYQ") {
      examQuestionCounts[q.exam_id].pyq += 1;
    } else {
      examQuestionCounts[q.exam_id].model += 1;
    }
  }

  return (
    <div className="py-6 sm:py-8">
      <MockConfigWizard
        exams={exams}
        subjects={subjects}
        topics={topics}
        examQuestionCounts={examQuestionCounts}
        initialExamSlug={resolvedSearchParams.exam}
      />
    </div>
  );
}
