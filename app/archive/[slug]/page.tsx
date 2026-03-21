import { Metadata } from "next";
import { notFound } from "next/navigation";
import { MagazineReader } from "@/components/feature/MagazineReader";
import magazines from "@/data/magazines.json";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const magazine = magazines.find((m) => m.slug === slug);

  if (!magazine) {
    return { title: "مجله یافت نشد" };
  }

  return {
    title: `${magazine.title} - آرشیو مجله`,
    description: magazine.description,
  };
}

export function generateStaticParams() {
  return magazines.map((magazine) => ({
    slug: magazine.slug,
  }));
}

export default async function MagazineReaderPage({ params }: PageProps) {
  const { slug } = await params;
  const magazine = magazines.find((m) => m.slug === slug);

  if (!magazine) {
    notFound();
  }

  return <MagazineReader magazine={magazine} />;
}
