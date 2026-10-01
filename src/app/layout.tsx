import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/shared/Navbar";
import { AppShell } from "@/components/shared/AppShell";
import { Footer } from "@/components/shared/Footer";
import { AIAssistantProvider } from "@/components/ai/AIAssistantContext";
import { AIAssistantDrawer } from "@/components/ai/AIAssistantDrawer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const editorialSerif = Newsreader({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mockmaster.in";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0c" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "MockMaster — Serious preparation. Measurable progress.",
    template: "%s | MockMaster",
  },
  description:
    "Practice with verified previous-year questions, calibrate your PYQ/Model ratio, analyze performance across 22 competitive examinations, and identify exactly where to improve.",
  icons: {
    icon: "/brand/favicon.svg",
    shortcut: "/brand/favicon.svg",
    apple: "/brand/logo-mark.svg",
  },
  keywords: [
    "UPSC CSE mock test",
    "UPPSC PCS mock test",
    "SSC CGL test series",
    "authentic PYQ practice",
    "civil services prelims mocks",
    "negative marking practice",
    "topic wise pyqs",
  ],
  authors: [{ name: "Manish Meena" }],
  creator: "Manish Meena",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: appUrl,
    title: "MockMaster — Serious preparation. Measurable progress.",
    description:
      "Verified PYQs + calibrated Model questions across 22 competitive examinations with real commission marking and diagnostic analytics.",
    siteName: "MockMaster",
  },
  twitter: {
    card: "summary_large_image",
    title: "MockMaster — Serious preparation. Measurable progress.",
    description:
      "Practice with verified PYQs, analyze your performance, and identify exactly where you need to improve.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${editorialSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent-soft)] selection:text-[var(--foreground)] transition-colors duration-150">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AIAssistantProvider>
            <Navbar />
            <AppShell>{children}</AppShell>
            <Footer />
            <AIAssistantDrawer />
          </AIAssistantProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
