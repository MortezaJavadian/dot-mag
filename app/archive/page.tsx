import { Metadata } from "next";
import { MagazineCard } from "@/components/feature/MagazineCard";
import { getPublicMagazines } from "@/lib/magazines";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "آرشیو مجله",
  description: "آرشیو کامل و خواندن آنلاین تمام شماره‌های منتشر شده از نشریه و مجله دات دانشگاه علم و صنعت ایران",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_API_BASE_URL}/archive`,
  },
};

export default async function ArchivePage() {
  const magazines = await getPublicMagazines();

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
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-background-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black">
            آرشیو مجله
          </h1>
        </div>
      </section>

      <section className="section-spacing-sm bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {magazines.map((magazine, index) => (
              <div
                key={magazine.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(index * 60, 420)}ms` }}
              >
                <MagazineCard magazine={magazine} />
              </div>
            ))}
          </div>

          {magazines.length === 0 && (
            <div className="text-center py-16">
              <p className="text-foreground-secondary text-lg">
                هنوز شماره‌ای منتشر نشده است.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
