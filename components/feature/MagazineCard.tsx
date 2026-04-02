import Link from "next/link";
import { getUploadUrl } from "@/lib/uploads";

interface Magazine {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  cover: string | null;
  publishedAt: string;
  pageCount: number;
}

interface MagazineCardProps {
  magazine: Magazine;
}

export function MagazineCard({ magazine }: MagazineCardProps) {
  const coverSrc = getUploadUrl(magazine.cover);

  return (
    <Link
      href={`/archive/${magazine.slug}`}
      scroll={true}
      className="group block"
    >
      <article className="card-hover rounded-2xl border border-card-border bg-card-bg p-3 md:p-4 shadow-[0_10px_28px_rgba(0,0,0,0.08)]">
        {/* Cover */}
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-cream to-khaki/30 mb-4 border border-card-border/80 shadow-[0_10px_24px_rgba(0,0,0,0.14)]">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={magazine.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-primary text-2xl font-black">.</span>
              </div>
              <h4 className="text-lg font-bold text-deep-black mb-1">دات</h4>
              <p className="text-khaki text-sm font-medium mb-4">
                {magazine.subtitle}
              </p>
              <div className="mt-auto">
                <span className="text-3xl font-black text-deep-black/20">
                  {magazine.id.padStart(2, "0")}
                </span>
              </div>
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-all duration-300 flex items-center justify-center">
            <span className="px-5 py-2.5 bg-white text-deep-black font-bold rounded-full opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 text-sm">
              مشاهده جزئیات
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="px-1 text-right">
          <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">
            {magazine.title}
          </h3>
          <p className="text-foreground-secondary text-sm mb-3">
            {magazine.subtitle}
          </p>
          <div className="border-t border-card-border pt-3 text-xs text-foreground-secondary flex items-center justify-between">
            <span>{magazine.pageCount} صفحه</span>
            <span>{magazine.publishedAt}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
