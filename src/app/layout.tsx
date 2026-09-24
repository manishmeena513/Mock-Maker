import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/shared/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mockmaster.in";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "MockMaster — 80% Verified PYQs + 20% AI Model Questions",
    template: "%s | MockMaster",
  },
  description:
    "Generate and attempt authentic exam-grade mock tests combining genuine previous-year questions with syllabus-aligned model questions, instant explanations, and performance analysis.",
  keywords: [
    "UPSC CSE mock test",
    "UPPSC PCS mock test",
    "SSC CGL test series",
    "authentic PYQ practice",
    "civil services prelims mocks",
    "negative marking practice",
    "topic wise pyqs",
  ],
  authors: [{ name: "MockMaster Team" }],
  creator: "MockMaster",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: appUrl,
    title: "MockMaster — Authentic Exam Preparation Platform",
    description:
      "Strict 80:20 authentic ratio: 80% genuine verified PYQs + 20% syllabus-aligned model questions. Zero artificial gamification.",
    siteName: "MockMaster",
  },
  twitter: {
    card: "summary_large_image",
    title: "MockMaster — Authentic Exam Mock Tests",
    description:
      "Strict 80% verified PYQs + 20% syllabus-aligned model questions for UPSC, UPPSC, and SSC CGL.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
