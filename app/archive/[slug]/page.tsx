import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUploadOriginalFileName, getUploadUrl } from "@/lib/uploads";
import { getMagazineBySlug } from "@/lib/magazines";
import { toPlainText, toSafeArticleHtml } from "@/lib/articleContent";
import { ScrollToTargetFloatingButton } from "@/components/shared/ScrollToTargetFloatingButton";

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

  const plainDescription = toPlainText(magazine.description);
  const cleanDescription = plainDescription.length > 150 ? plainDescription.slice(0, 150) + "..." : plainDescription;

  const imageUrl = getUploadUrl(magazine.cover);
  const absoluteImageUrl = imageUrl ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${imageUrl}` : `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/images/dot-logo.png`;

  return {
    title: `${magazine.title} - آرشیو مجله`,
    description: cleanDescription || magazine.subtitle,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_API_BASE_URL}/archive/${encodeURIComponent(magazine.slug)}`,
    },
    openGraph: {
      title: `${magazine.title} - آرشیو مجله`,
      description: cleanDescription || magazine.subtitle,
      type: "article",
      url: `${process.env.NEXT_PUBLIC_API_BASE_URL}/archive/${encodeURIComponent(magazine.slug)}`,
      siteName: "مجله دات",
      publishedTime: magazine.sortDate.toISOString(),
      images: [
        {
          url: absoluteImageUrl,
          width: 800,
          height: 600,
          alt: magazine.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: magazine.title,
      description: cleanDescription || magazine.subtitle,
      images: [absoluteImageUrl],
    },
  };
}

export default async function MagazineDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const magazine = await getMagazineBySlug(slug);

  if (!magazine) {
    notFound();
  }

  const coverSrc = getUploadUrl(magazine.cover);
  const pdfDownloadUrl = getUploadUrl(magazine.pdfUrl);
  const pdfFileName =
    getUploadOriginalFileName(pdfDownloadUrl) || `${magazine.slug}.pdf`;
  const safeDescriptionHtml = toSafeArticleHtml(
    magazine.description || "برای این شماره توضیحی ثبت نشده است.",
  );

  const plainDescription = toPlainText(magazine.description);
  const cleanDescription = plainDescription.length > 150 ? plainDescription.slice(0, 150) + "..." : plainDescription;
  const imageUrl = getUploadUrl(magazine.cover);
  const absoluteImageUrl = imageUrl ? `${process.env.NEXT_PUBLIC_API_BASE_URL}${imageUrl}` : `${process.env.NEXT_PUBLIC_API_BASE_URL}/assets/images/dot-logo.png`;

  const issueSchema = {
    "@context": "https://schema.org",
    "@type": "PublicationIssue",
    "@id": `${process.env.NEXT_PUBLIC_API_BASE_URL}/archive/${encodeURIComponent(magazine.slug)}#publicationissue`,
    "name": magazine.title,
    "alternativeHeadline": magazine.subtitle,
    "description": cleanDescription || magazine.title,
    "datePublished": magazine.sortDate.toISOString(),
    "image": absoluteImageUrl,
    "issueNumber": magazine.slug,
    "numPages": magazine.pageCount,
    "publisher": {
      "@type": "Organization",
      "@id": `${process.env.NEXT_PUBLIC_API_BASE_URL}/#organization`
    }
  };

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
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(issueSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <article>
        <header className="pt-8 pb-12 md:pt-12 md:pb-16">
          <div className="container max-w-6xl">
            <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_44%] lg:grid-cols-[minmax(0,1fr)_40%] md:items-start md:gap-8 lg:gap-10">
              <div className="md:col-start-1">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-4">
                  {magazine.title}
                </h1>

                <p className="text-xl md:text-2xl font-semibold text-foreground mb-5">
                  {magazine.subtitle}
                </p>
              </div>

              <div className="mt-3 md:mt-0 md:col-start-2 md:row-span-3 md:w-full lg:w-[85%] md:shrink-0 md:justify-self-end">
                <div className="image-frame-shell">
                  {coverSrc ? (
                    <div className="image-frame-inner">
                      <img
                        src={coverSrc}
                        alt={magazine.title}
                        className="image-frame-media"
                      />
                    </div>
                  ) : (
                    <div className="image-frame-inner">
                      <div className="aspect-[3/4] bg-background-secondary flex flex-col items-center justify-center text-center p-6">
                        <span className="text-primary text-5xl font-black mb-3">
                          .
                        </span>
                        <p className="text-lg font-bold mb-1">{magazine.title}</p>
                        <p className="text-sm text-foreground-secondary">
                          تصویر جلد در دسترس نیست
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 md:mt-0 md:col-start-1">
                <div
                  className="prose article-content-prose dark:prose-invert max-w-none text-base md:text-lg text-foreground-secondary mb-8"
                  dangerouslySetInnerHTML={{ __html: safeDescriptionHtml }}
                />

                <div className="flex items-center justify-between text-sm text-foreground-secondary border-y border-card-border py-3">
                  <span>{magazine.pageCount} صفحه</span>
                  <span>{magazine.publishedAt}</span>
                </div>

                <div
                  id="magazine-actions-anchor"
                  className="mt-8 flex flex-wrap gap-3 scroll-mt-28"
                >
                  <Link
                    href={`/archive/${magazine.slug}/read`}
                    className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-white font-bold hover:bg-primary/90 transition-colors"
                  >
                    خواندن مجله
                  </Link>

                  {pdfDownloadUrl && (
                    <a
                      href={pdfDownloadUrl}
                      download={pdfFileName}
                      className="inline-flex items-center justify-center rounded-full border border-card-border px-7 py-3 text-foreground font-semibold hover:bg-foreground/5 transition-colors"
                    >
                      دانلود PDF
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <ScrollToTargetFloatingButton
          targetId="magazine-actions-anchor"
          buttonLabel="خواندن مجله"
        />
      </article>
    </>
  );
}
