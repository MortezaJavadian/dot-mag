import Link from "next/link";

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  category: string;
  image: string;
  publishedAt: string;
  tags?: Tag[];
}

interface ArticleCardProps {
  article: Article;
  variant?: "default" | "featured" | "horizontal";
}

export function ArticleCard({
  article,
  variant = "default",
}: ArticleCardProps) {
  if (variant === "featured") {
    return (
      <Link href={`/posts/${article.slug}`} className="group block">
        <article className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-forest to-deep-black">
          {/* Image */}
          {article.image && (
            <img
              src={article.image}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-deep-black via-deep-black/60 to-transparent z-10" />

          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          {/* Content */}
          <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-10">
            {article.tags && article.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {article.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-block px-3 py-1 bg-primary text-white text-sm font-medium rounded-full w-fit"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
            {(!article.tags || article.tags.length === 0) && (
              <span className="inline-block px-3 py-1 bg-primary text-white text-sm font-medium rounded-full w-fit mb-4">
                بدون برچسب
              </span>
            )}
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-snug">
              {article.title}
            </h2>
            <p className="text-white/80 text-base md:text-lg mb-4 line-clamp-2 max-w-2xl">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-4 text-white/60 text-sm">
              <span>{article.author}</span>
              <span>•</span>
              <span>{article.publishedAt}</span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "horizontal") {
    return (
      <Link href={`/posts/${article.slug}`} className="group block">
        <article className="flex gap-4 md:gap-6 items-start">
          {/* Image */}
          <div className="relative w-28 h-28 md:w-40 md:h-40 flex-shrink-0 rounded-xl overflow-hidden bg-cream">
            {article.image ? (
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="text-khaki"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 py-1">
            {article.tags && article.tags.length > 0 ? (
              <div className="flex gap-2 flex-wrap mb-1">
                {article.tags.map((tag) => (
                  <span key={tag.id} className="text-primary text-sm font-medium">
                    {tag.name}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-primary text-sm font-medium">بدون برچسب</span>
            )}
            <h3 className="text-lg md:text-xl font-bold mt-1 mb-2 group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h3>
            <p className="text-foreground-secondary text-sm line-clamp-2 hidden md:block">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-3 text-foreground-secondary text-xs mt-2">
              <span>{article.author}</span>
              <span>•</span>
              <span>{article.publishedAt}</span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  // Default vertical card
  return (
    <Link href={`/posts/${article.slug}`} className="group block">
      <article className="card-hover bg-card-bg rounded-2xl overflow-hidden border border-card-border">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-cream to-khaki/20 overflow-hidden">
          {article.image ? (
            <img
              src={article.image}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-khaki/50"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
            </div>
          )}
          {article.tags && article.tags.length > 0 && (
            <span className="absolute top-4 right-4 px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">
              {article.tags[0].name}
            </span>
          )}
          {(!article.tags || article.tags.length === 0) && (
            <span className="absolute top-4 right-4 px-3 py-1 bg-primary text-white text-xs font-medium rounded-full">
              بدون برچسب
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5 md:p-6">
          <h3 className="text-lg md:text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h3>
          <p className="text-foreground-secondary text-sm line-clamp-2 mb-4">
            {article.excerpt}
          </p>
          <div className="flex items-center justify-between text-foreground-secondary text-xs">
            <span>{article.author}</span>
            <span>{article.publishedAt}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
