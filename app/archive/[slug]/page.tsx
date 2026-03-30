import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MagazineReader } from "@/components/feature/MagazineReader";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getMagazines() {
  try {
    const magazines = await prisma.magazine.findMany({
      include: { pages: { orderBy: { number: "asc" } } },
      orderBy: { publishedAt: "desc" },
    });
    return magazines;
  } catch (error) {
    console.error("Error fetching magazines:", error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const magazines = await getMagazines();
  const magazine = magazines.find((m: any) => m.slug === slug);

  if (!magazine) {
    return { title: "مجله یافت نشد" };
  }

  return {
    title: `${magazine.title} - آرشیو مجله`,
    description: magazine.description,
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function MagazineReaderPage({ params }: PageProps) {
  const { slug } = await params;
  const magazines = await getMagazines();
  const magazine = magazines.find((m: any) => m.slug === slug);

  if (!magazine) {
    notFound();
  }

  return <MagazineReader magazine={magazine} />;
}
