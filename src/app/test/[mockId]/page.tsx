import { notFound } from "next/navigation";
import { getMockTestById } from "@/lib/db";
import { TestClient } from "@/components/test/TestClient";

interface TestPageProps {
  params: Promise<{
    mockId: string;
  }>;
}

export default async function TestPage({ params }: TestPageProps) {
  const { mockId } = await params;
  const data = await getMockTestById(mockId);

  if (!data) {
    notFound();
  }

  return <TestClient mockTest={data.test} initialQuestions={data.questions} />;
}
