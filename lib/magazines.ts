import { prisma } from "@/lib/prisma";

export type MagazinePageData = {
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

export function decodeMagazineSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function normalizeMagazineSlug(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[۰-۹٠-٩0-9]/g, (char) => digitMap[char] ?? char)
    .replace(/[\u200c\u200f\u202a\u202b\u202c]/g, "")
    .toLowerCase();
}

export async function getPublicMagazines(): Promise<MagazinePageData[]> {
  try {
    return await prisma.magazine.findMany({
      include: { pages: { orderBy: { number: "asc" } } },
      orderBy: [{ sortDate: "desc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("Error fetching magazines:", error);
    return [];
  }
}

export async function getMagazineBySlug(
  rawSlug: string,
): Promise<MagazinePageData | null> {
  const normalizedSlug = normalizeMagazineSlug(decodeMagazineSlug(rawSlug));
  const magazines = await getPublicMagazines();

  return (
    magazines.find(
      (magazine) => normalizeMagazineSlug(magazine.slug) === normalizedSlug,
    ) ?? null
  );
}
