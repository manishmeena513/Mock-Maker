import { getExams } from "@/lib/db";
import { SEED_SUBJECTS, SEED_TOPICS } from "@/lib/data/seedData";
import { MockConfigWizard } from "@/components/mock/MockConfigWizard";

interface ConfigurePageProps {
  searchParams?: Promise<{
    exam?: string;
  }>;
}

export default async function ConfigurePage({ searchParams }: ConfigurePageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const exams = await getExams();

  return (
    <div className="py-6 sm:py-8">
      <MockConfigWizard
        exams={exams}
        subjects={SEED_SUBJECTS}
        topics={SEED_TOPICS}
        initialExamSlug={resolvedSearchParams.exam}
      />
    </div>
  );
}
