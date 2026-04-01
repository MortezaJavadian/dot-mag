import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getUploadUrl } from "@/lib/uploads";
import { getMagazineBySlug } from "@/lib/magazines";

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
    description: magazine.description || magazine.subtitle,
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

  return (
    <article>
      <header className="pt-8 pb-12 md:pt-12 md:pb-16">
        <div className="container max-w-6xl">
          <div className="md:flex md:items-start md:gap-8 lg:gap-10">
            <div className="md:flex-1">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-4">
                {magazine.title}
              </h1>

              <p className="text-xl md:text-2xl font-semibold text-foreground mb-5">
                {magazine.subtitle}
              </p>

              <p className="text-base md:text-lg leading-8 text-foreground-secondary mb-8">
                {magazine.description || "برای این شماره توضیحی ثبت نشده است."}
              </p>

              <div className="flex items-center justify-between text-sm text-foreground-secondary border-y border-card-border py-3">
                <span>{magazine.pageCount} صفحه</span>
                <span>{magazine.publishedAt}</span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/archive/${magazine.slug}/read`}
                  className="inline-flex items-center justify-center rounded-full bg-primary px-7 py-3 text-white font-bold hover:bg-primary/90 transition-colors"
                >
                  مطالعه مجله
                </Link>

                {pdfDownloadUrl && (
                  <a
                    href={pdfDownloadUrl}
                    download
                    className="inline-flex items-center justify-center rounded-full border border-card-border px-7 py-3 text-foreground font-semibold hover:bg-foreground/5 transition-colors"
                  >
                    دانلود PDF
                  </a>
                )}
              </div>
            </div>

            <div className="mt-8 md:mt-0 md:w-[44%] lg:w-[40%] md:shrink-0">
              <div className="rounded-2xl overflow-hidden border border-card-border bg-card-bg p-2.5 md:p-3 shadow-[0_12px_30px_rgba(0,0,0,0.12)]">
                {coverSrc ? (
                  <img
                    src={coverSrc}
                    alt={magazine.title}
                    className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                  />
                ) : (
                  <div className="aspect-[3/4] rounded-xl bg-background-secondary flex flex-col items-center justify-center text-center p-6">
                    <span className="text-primary text-5xl font-black mb-3">
                      .
                    </span>
                    <p className="text-lg font-bold mb-1">{magazine.title}</p>
                    <p className="text-sm text-foreground-secondary">
                      تصویر جلد در دسترس نیست
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </article>
  );
}
