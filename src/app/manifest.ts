import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MockMaster — Authentic Exam Mock Platform",
    short_name: "MockMaster",
    description:
      "80% genuine verified PYQs + 20% AI model questions for UPSC CSE, UPPSC PCS, and SSC CGL.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
