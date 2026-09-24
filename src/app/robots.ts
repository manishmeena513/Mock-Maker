import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mockmaster.in";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/exam/", "/pricing", "/search", "/login", "/signup"],
      disallow: ["/admin/", "/api/", "/test/", "/results/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
