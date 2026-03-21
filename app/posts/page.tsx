import { Metadata } from "next";
import { ArticleCard } from "@/components/feature/ArticleCard";
import articles from "@/data/articles.json";

export const metadata: Metadata = {
  title: "مقالات",
  description: "آخرین مقالات مجله دات در حوزه طراحی، تکنولوژی و سبک زندگی",
};

const categories = [
  { label: "همه", value: "all" },
  { label: "تکنولوژی", value: "تکنولوژی" },
  { label: "طراحی", value: "طراحی" },
  { label: "معماری", value: "معماری" },
  { label: "سبک زندگی", value: "سبک زندگی" },
  { label: "عکاسی", value: "عکاسی" },
  { label: "مد و لباس", value: "مد و لباس" },
];

export default function PostsPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-background-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
            مقالات
          </h1>
          <p className="text-foreground-secondary text-lg max-w-2xl">
            جدیدترین مقالات ما درباره طراحی، تکنولوژی، هنر و سبک زندگی مدرن را
            بخوانید.
          </p>
        </div>
      </section>

      {/* Categories Filter */}
      <section className="py-6 border-b border-card-border sticky top-16 md:top-20 bg-background/95 backdrop-blur-md z-30">
        <div className="container">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.value}
                className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  cat.value === "all"
                    ? "bg-primary text-white"
                    : "bg-foreground/5 hover:bg-foreground/10"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {articles.map((article, index) => (
              <div
                key={article.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ArticleCard article={article} />
              </div>
            ))}
          </div>

          {/* Load More */}
          <div className="mt-12 text-center">
            <button className="px-8 py-4 bg-foreground/5 hover:bg-foreground/10 rounded-full font-medium transition-colors">
              بارگذاری بیشتر
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
