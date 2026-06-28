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

  const cleanDescription = magazine.description ? (magazine.description.length > 150 ? magazine.description.slice(0, 150) + "..." : magazine.description) : magazine.subtitle;

  return {
    title: `${magazine.title} - خواندن مجله`,
    description: `خواندن آنلاین ${magazine.title} با قابلیت ورق‌زدن و مرور صفحات. ${cleanDescription}`,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_API_BASE_URL}/archive/${encodeURIComponent(magazine.slug)}/read`,
    },
  };
}

export default async function MagazineReadPage({ params }: PageProps) {
  const { slug } = await params;
  const magazine = await getMagazineBySlug(slug);

  if (!magazine) {
    notFound();
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "خانه",
        "item": process.env.NEXT_PUBLIC_API_BASE_URL
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "آرشیو مجله",
        "item": `${process.env.NEXT_PUBLIC_API_BASE_URL}/archive`
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": magazine.title,
        "item": `${process.env.NEXT_PUBLIC_API_BASE_URL}/archive/${encodeURIComponent(magazine.slug)}`
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": "خواندن مجله",
        "item": `${process.env.NEXT_PUBLIC_API_BASE_URL}/archive/${encodeURIComponent(magazine.slug)}/read`
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <MagazineReaderClient magazine={magazine} />
    </>
  );
}
