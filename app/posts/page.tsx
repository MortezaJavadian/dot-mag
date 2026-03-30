"use client";

import { ArticleCard } from "@/components/feature/ArticleCard";
import { useState, useEffect, Suspense } from "react";

function PostsContent() {
  const [selectedTab, setSelectedTab] = useState<"all" | string>("all");
  const [articles, setArticles] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [articlesRes, tagsRes] = await Promise.all([
          fetch("/api/articles"),
          fetch("/api/tags"),
        ]);
        const articlesData = await articlesRes.json();
        const tagsData = await tagsRes.json();
        setArticles(articlesData || []);
        setTags(tagsData || []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredArticles =
    selectedTab === "all"
      ? articles
      : articles.filter((article) =>
          article.tags?.some((tag: any) => tag.id === selectedTab),
        );

  return (
    <>
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-background-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
            نوشتار
          </h1>
        </div>
      </section>

      <section className="py-6 border-b border-card-border sticky top-16 md:top-20 bg-background/95 backdrop-blur-md z-30">
        <div className="container">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedTab("all")}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedTab === "all"
                  ? "bg-primary text-white"
                  : "bg-foreground/5 hover:bg-foreground/10"
              }`}
            >
              #همه
            </button>
            {tags.map((tag: any) => (
              <button
                key={tag.id}
                onClick={() => setSelectedTab(tag.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedTab === tag.id
                    ? "bg-primary text-white"
                    : "bg-foreground/5 hover:bg-foreground/10"
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
          {selectedTab !== "all" && (
            <p className="text-foreground-secondary text-sm mt-3">
              نوشتارهای برچسب‌شده با{" "}
              {tags.find((t) => t.id === selectedTab)?.name}
            </p>
          )}
          {selectedTab === "all" && (
            <p className="text-foreground-secondary text-sm mt-3">
              تمام نوشتارهای منتشر‌شده
            </p>
          )}
        </div>
      </section>

      <section className="section-spacing-sm">
        <div className="container">
          {loading ? (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-foreground-secondary">در حال بارگذاری...</p>
              </div>
            </div>
          ) : filteredArticles.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {filteredArticles.map((article, index) => (
                  <div
                    key={article.id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ArticleCard article={article} />
                  </div>
                ))}
              </div>

              <div className="mt-12 text-center">
                <button className="px-8 py-4 bg-foreground/5 hover:bg-foreground/10 rounded-full font-medium transition-colors">
                  بارگذاری بیشتر
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-foreground/5 flex items-center justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-foreground-secondary"
                  >
                    <path
                      d="M14.5 3a1 1 0 0 1 1 1v4h4a1 1 0 1 1 0 2h-4v4a1 1 0 1 1-2 0v-4h-4a1 1 0 1 1 0-2h4V4a1 1 0 0 1 1-1z"
                      fill="currentColor"
                    />
                    <path
                      d="M6 2a4 4 0 0 0-4 4v12a4 4 0 0 0 4 4h12a4 4 0 0 0 4-4V6a4 4 0 0 0-4-4H6zm0 2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">
                  هنوز نوشتاری برای این برچسب نیست
                </h3>
                <p className="text-foreground-secondary mb-6">
                  به زودی نوشتارهای بیشتری اضافه خواهد شد.
                </p>
                {tags.length > 0 && (
                  <div className="flex gap-2 justify-center flex-wrap">
                    {tags.map((tag: any) => (
                      <button
                        key={tag.id}
                        onClick={() => setSelectedTab(tag.id)}
                        className="px-4 py-2 bg-primary text-white text-sm rounded-full hover:bg-primary/90 transition-colors"
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default function PostsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-foreground-secondary">در حال بارگذاری...</p>
          </div>
        </div>
      }
    >
      <PostsContent />
    </Suspense>
  );
}
