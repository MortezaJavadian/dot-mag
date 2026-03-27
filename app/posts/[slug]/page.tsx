import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleCard } from "@/components/feature/ArticleCard";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getArticles() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"}/api/articles`,
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
  const articles = await getArticles();
  const article = articles.find((a: any) => a.slug === slug);

  if (!article) {
    return { title: "مقاله یافت نشد" };
  }

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.publishedAt,
      authors: [article.author],
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const articles = await getArticles();
  const article = articles.find((a: any) => a.slug === slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = articles
    .filter((a: any) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  return (
    <>
      <article>
        <header className="pt-8 pb-12 md:pt-12 md:pb-16">
          <div className="container max-w-4xl">
            <Link
              href={`/posts?category=${article.category}`}
              className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6 hover:bg-primary/20 transition-colors"
            >
              {article.category}
            </Link>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-6">
              {article.title}
            </h1>

            <p className="text-xl text-foreground-secondary leading-relaxed mb-8">
              {article.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-6 text-foreground-secondary">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-cream flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-khaki"
                  >
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 0 0-16 0" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground">
                    {article.author}
                  </p>
                  <p className="text-sm">{article.publishedAt}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{article.readingTime} دقیقه مطالعه</span>
              </div>
            </div>
          </div>
        </header>

        <div className="py-8 md:py-12 border-t border-b">
          <div className="container max-w-4xl">
            <div className="prose dark:prose-invert max-w-none leading-relaxed">
              {article.content
                .split("\n")
                .map((paragraph: string, i: number) => (
                  <p key={i} className="mb-4 text-foreground-secondary">
                    {paragraph}
                  </p>
                ))}
            </div>

            {article.tags && article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-8">
                {article.tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-foreground/5 text-sm rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      {relatedArticles.length > 0 && (
        <section className="py-12 md:py-16 bg-background-secondary">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              نوشتارهای مرتبط
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedArticles.map((related: any) => (
                <ArticleCard key={related.id} article={related} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
