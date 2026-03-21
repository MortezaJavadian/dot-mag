import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { AppWrapper } from "@/components/shared/AppWrapper";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import "./globals.css";

const vazirmatn = localFont({
  src: "../public/assets/fonts/webfonts/Vazirmatn[wght].woff2",
  variable: "--font-vazir",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "دات مگ | مجله دیجیتال طراحی و سبک زندگی",
    template: "%s | دات مگ",
  },
  description:
    "مجله دات، پلتفرمی برای روایت داستان‌های الهام‌بخش از دنیای طراحی، تکنولوژی و سبک زندگی مدرن.",
  keywords: [
    "مجله دیجیتال",
    "طراحی",
    "تکنولوژی",
    "سبک زندگی",
    "هنر",
    "معماری",
    "دات مگ",
  ],
  authors: [{ name: "دات مگ" }],
  creator: "دات مگ",
  publisher: "دات مگ",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://dotmag.ir",
    siteName: "دات مگ",
    title: "دات مگ | مجله دیجیتال طراحی و سبک زندگی",
    description:
      "مجله دات، پلتفرمی برای روایت داستان‌های الهام‌بخش از دنیای طراحی، تکنولوژی و سبک زندگی مدرن.",
  },
  twitter: {
    card: "summary_large_image",
    title: "دات مگ",
    description: "مجله دیجیتال طراحی و سبک زندگی",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0B" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/assets/icons/icon-192x192.png" />
      </head>
      <body
        className={`${vazirmatn.variable} font-vazir min-h-screen flex flex-col antialiased`}
      >
        <ThemeProvider>
          <AppWrapper>
            <Header />
            <main className="flex-1 pt-16 md:pt-20">{children}</main>
            <Footer />
          </AppWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
