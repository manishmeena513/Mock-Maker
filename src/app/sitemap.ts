import { MetadataRoute } from "next";
import { getExams } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mockmaster.in";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  let examRoutes: MetadataRoute.Sitemap = [];
  try {
    const exams = await getExams();
    examRoutes = exams.map((exam) => ({
      url: `${baseUrl}/exam/${exam.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    }));
  } catch {
    // fallback static exams if db error
    examRoutes = [
      { url: `${baseUrl}/exam/upsc-cse`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
      { url: `${baseUrl}/exam/uppsc-pcs`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
      { url: `${baseUrl}/exam/ssc-cgl`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ];
  }

  return [...staticRoutes, ...examRoutes];
}
