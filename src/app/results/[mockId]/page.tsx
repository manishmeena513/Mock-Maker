import { notFound } from "next/navigation";
import { getMockTestById } from "@/lib/db";
import { ResultsClient } from "@/components/results/ResultsClient";

interface ResultsPageProps {
  params: Promise<{
    mockId: string;
  }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { mockId } = await params;
  const data = await getMockTestById(mockId);

  if (!data) {
    notFound();
  }

  return <ResultsClient mockTest={data.test} questions={data.questions} />;
}
