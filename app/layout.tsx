import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { AppWrapper } from "@/components/shared/AppWrapper";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";
import "./globals.css";

const aradFont = localFont({
  src: [
    {
      path: "../public/assets/fonts/webfonts/Arad-Thin.woff2",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Arad-ExtraLight.woff2",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Arad-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Arad-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Arad-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Arad-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Arad-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Arad-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/assets/fonts/webfonts/Arad-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-arad",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "مجله دات | رسانه فرهنگی و اجتماعی دانشجویان دانشگاه علم و صنعت",
    template: "%s | مجله دات",
  },
  description: "مجله دات - رسانه فرهنگی، اجتماعی و صوتی دانشجویان دانشگاه علم و صنعت ایران (IUST) - پادکست، یادداشت‌ها و آرشیو نشریات",
  keywords: [
    "دات",
    "مجله دات",
    "دات مگ",
    "نشریه دات",
    "رسانه دات",
    "پادکست دات",
    "رادیو دات",
    "رادیودات",
    "مجله داات",
    "داتمگ",
    "مجله ی دات",
    "مجله dot",
    "نشریه dot",
    "دانشگاه علم و صنعت ایران",
    "دانشگاه علم و صنعت",
    "علم و صنعت",
    "علموصنعت",
    "علم و صنعت تهران",
    "دانشجویان علم و صنعت",
    "dot",
    "dotmag",
    "dot-mag",
    "dotmag.ir",
    "dot mag",
    "dot iust",
    "dotmag iust",
    "dot mag iust",
    "magazine dot",
    "dot magazine",
    "iust",
    "dot-mag.ir",
    "dotm"
  ],
  authors: [{ name: "مجله دات" }],
  creator: "مجله دات",
  publisher: "مجله دات",
  robots: "index, follow",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: process.env.NEXT_PUBLIC_API_BASE_URL,
    siteName: "مجله دات",
    title: "مجله دات | رسانه فرهنگی و اجتماعی دانشجویان دانشگاه علم و صنعت",
    description: "مجله دات - رسانه فرهنگی، اجتماعی و صوتی دانشجویان دانشگاه علم و صنعت ایران (IUST) - پادکست، یادداشت‌ها و آرشیو نشریات",
  },
  twitter: {
    card: "summary_large_image",
    title: "مجله دات",
    description: "رسانه فرهنگی، اجتماعی و صوتی دانشجویان دانشگاه علم و صنعت ایران",
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

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${process.env.NEXT_PUBLIC_API_BASE_URL}/#organization`,
    "name": "مجله دات",
    "alternateName": [
      "Dot Mag",
      "دات مگ",
      "دات",
      "مجله dot",
      "رسانه دات",
      "نشریه دات",
      "پادکست دات",
      "رادیو دات",
      "رادیودات",
      "دات مگ علم و صنعت",
      "iust",
      "dotmag iust",
      "dot-mag"
    ],
    "url": process.env.NEXT_PUBLIC_API_BASE_URL,
    "logo": `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/images/dot-logo.png`,
    "image": `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/images/dot-logo.png`,
    "description": "مجله دات - رسانه فرهنگی، اجتماعی و صوتی دانشجویان دانشگاه علم و صنعت ایران",
    "sameAs": [
      "https://ble.ir/dotmag",
      "https://eitaa.ir/dotmag",
      "https://virasty.com/dotmag",
      "https://t.me/dotmag_ir"
    ]
  };

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/app/icon.png" />
        {!isAdminRoute && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
        )}
      </head>
      <body
        className={`${aradFont.variable} font-arad min-h-screen flex flex-col antialiased`}
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
