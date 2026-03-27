import { Metadata } from "next";
import { notFound } from "next/navigation";
import { MagazineReader } from "@/components/feature/MagazineReader";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getMagazines() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"}/api/magazines`,
      {
        next: { revalidate: 3600 },
      },
    );
    return await res.json();
  } catch {
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
