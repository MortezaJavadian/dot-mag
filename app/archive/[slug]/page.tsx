import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MagazineReaderClient } from "./_components/MagazineReaderClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

type MagazineReaderItem = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover: string | null;
  pdfUrl: string | null;
  publishedAt: string;
  sortDate: Date;
  pageCount: number;
  pages: {
    id: string;
    number: number;
    type: string;
    image: string;
    title: string;
  }[];
};

async function getMagazines(): Promise<MagazineReaderItem[]> {
  try {
    const magazines = await prisma.magazine.findMany({
      include: { pages: { orderBy: { number: "asc" } } },
      orderBy: { sortDate: "desc" },
    });
    return magazines;
  } catch (error) {
    console.error("Error fetching magazines:", error);
    return [];
  }
}

function normalizeSlug(value: string): string {
  const digitMap: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
    "٠": "0",
    "١": "1",
    "٢": "2",
    "٣": "3",
    "٤": "4",
    "٥": "5",
    "٦": "6",
    "٧": "7",
    "٨": "8",
    "٩": "9",
  };

  return value
    .normalize("NFC")
    .replace(/[۰-۹٠-٩0-9]/g, (char) => digitMap[char] ?? char)
    .replace(/[\u200c\u200f\u202a\u202b\u202c]/g, "")
    .toLowerCase();
}

function decodeSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const magazines = await getMagazines();
  const normalizedSlug = normalizeSlug(slug);
  const magazine = magazines.find(
    (m) => normalizeSlug(m.slug) === normalizedSlug,
  );

  if (!magazine) {
    return { title: "مجله یافت نشد" };
  }

  return {
    title: `${magazine.title} - آرشیو مجله`,
    description: magazine.description,
  };
}

export default async function MagazineReaderPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const magazines = await getMagazines();
  const normalizedSlug = normalizeSlug(slug);
  const magazine = magazines.find(
    (m) => normalizeSlug(m.slug) === normalizedSlug,
  );

  if (!magazine) {
    notFound();
  }

  return <MagazineReaderClient magazine={magazine} />;
}
