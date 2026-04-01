import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMagazineBySlug } from "@/lib/magazines";
import { MagazineReaderClient } from "../_components/MagazineReaderClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const magazine = await getMagazineBySlug(slug);

  if (!magazine) {
    return { title: "مجله یافت نشد" };
  }

  return {
    title: `${magazine.title} - مطالعه مجله`,
    description: magazine.description || magazine.subtitle,
  };
}

export default async function MagazineReadPage({ params }: PageProps) {
  const { slug } = await params;
  const magazine = await getMagazineBySlug(slug);

  if (!magazine) {
    notFound();
  }

  return <MagazineReaderClient magazine={magazine} />;
}
