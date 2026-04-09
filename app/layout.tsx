import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { AppWrapper } from "@/components/shared/AppWrapper";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import "./globals.css";

const vazirmatn = localFont({
  src: [
    {
      path: "../public/assets/fonts/webfonts/Vazirmatn-FD-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Vazirmatn-FD-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Vazirmatn-FD-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Vazirmatn-FD-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Vazirmatn-FD-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Vazirmatn-FD-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Vazirmatn-FD-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Vazirmatn-FD-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Vazirmatn-FD-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "دات | خانه",
    template: "%s | دات",
  },
  description: "مجله دات",
  keywords: ["دات"],
  authors: [{ name: "دات" }],
  creator: "دات",
  publisher: "دات",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://dotmag.ir",
    siteName: "دات",
    title: "دات | خانه",
    description: "مجله دات",
  },
  twitter: {
    card: "summary_large_image",
    title: "دات",
    description: "خانه",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 3,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0B0B" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const isAdminRoute = requestHeaders.get("x-admin-route") === "1";

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/app/icon.png" />
      </head>
      <body
        className={`${vazirmatn.variable} font-vazir min-h-screen flex flex-col antialiased`}
      >
        <ThemeProvider>
          <AppWrapper>
            {!isAdminRoute && <Header />}
            <main
              className={`flex-1 ${
                isAdminRoute ? "" : "pt-16 md:pt-20 footer-buffer"
              }`}
            >
              {children}
            </main>
            {!isAdminRoute && <Footer />}
          </AppWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
