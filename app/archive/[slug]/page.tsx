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

  return {
    title: `${magazine.title} - آرشیو مجله`,
    description: toPlainText(magazine.description) || magazine.subtitle,
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

  return (
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
  );
}
