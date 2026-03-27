"use client";

import { ArticleCard } from "@/components/feature/ArticleCard";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const categories = [
  {
    label: "#ازـما",
    value: "از ما",
    hashtag: "#ازـما",
    description: "نوشتارهای تیم مجله دات",
  },
  {
    label: "#ازـشما",
    value: "از شما",
    hashtag: "#ازـشما",
    description: "مطالب ارسالی خوانندگان",
  },
  {
    label: "#ازـدیگران",
    value: "از دیگران",
    hashtag: "#ازـدیگران",
    description: "برگزیده‌ها از سراسر وب",
  },
];

const categoryMapping: { [key: string]: string } = {
  تکنولوژی: "از ما",
  طراحی: "از ما",
  معماری: "از ما",
  عکاسی: "از دیگران",
  "مد و لباس": "از دیگران",
  "سبک زندگی": "از شما",
};

function PostsContent() {
  const searchParams = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string>("از ما");
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const categoryFromUrl = searchParams.get("category");
    if (categoryFromUrl) {
      const categoryMap: { [key: string]: string } = {
        "from-us": "از ما",
        "from-you": "از شما",
        "from-others": "از دیگران",
      };

      const mappedCategory = categoryMap[categoryFromUrl] || "از ما";
      setSelectedCategory(mappedCategory);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/articles");
        const data = await res.json();
        setArticles(data);
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const filteredArticles = articles.filter((article) => {
    const articleCategory = categoryMapping[article.category] || "از ما";
    return articleCategory === selectedCategory;
  });

  const currentCategoryData = categories.find(
    (cat) => cat.value === selectedCategory,
  );

  return (
    <>
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-background-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
            نوشتار
          </h1>
          <p className="text-foreground-secondary text-lg max-w-2xl">
            جدیدترین نوشتارهای ما درباره طراحی، تکنولوژی، هنر و سبک زندگی مدرن
            را بخوانید.
          </p>
        </div>
      </section>

      <section className="py-6 border-b border-card-border sticky top-16 md:top-20 bg-background/95 backdrop-blur-md z-30">
        <div className="container">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat: any) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  cat.value === selectedCategory
                    ? "bg-primary text-white"
                    : "bg-foreground/5 hover:bg-foreground/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {currentCategoryData && (
            <p className="text-foreground-secondary text-sm mt-3">
              {currentCategoryData.description}
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
                  هنوز نوشتاری در این بخش نیست
                </h3>
                <p className="text-foreground-secondary mb-6">
                  {currentCategoryData?.hashtag} به زودی با محتوای جذاب آماده
                  می‌شود. در حال حاضر می‌توانید سایر بخش‌ها را بررسی کنید.
                </p>
                <div className="flex gap-2 justify-center">
                  {categories
                    .filter((cat) => cat.value !== selectedCategory)
                    .map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedCategory(cat.value)}
                        className="px-4 py-2 bg-primary text-white text-sm rounded-full hover:bg-primary/90 transition-colors"
                      >
                        {cat.hashtag}
                      </button>
                    ))}
                </div>
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
