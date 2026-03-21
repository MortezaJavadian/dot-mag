import Link from "next/link";

interface Magazine {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  cover: string;
  publishedAt: string;
  pageCount: number;
}

interface MagazineCardProps {
  magazine: Magazine;
}

export function MagazineCard({ magazine }: MagazineCardProps) {
  return (
    <Link href={`/archive/${magazine.slug}`} className="group block">
      <article className="card-hover">
        {/* Cover Placeholder */}
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gradient-to-br from-cream to-khaki/30 shadow-xl mb-4 border border-card-border">
          {/* Magazine Cover Design */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            {/* Logo/Brand Mark */}
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-primary text-2xl font-black">.</span>
            </div>

            {/* Title */}
            <h4 className="text-lg font-bold text-deep-black mb-1">دات مگ</h4>
            <p className="text-khaki text-sm font-medium mb-4">{magazine.subtitle}</p>

            {/* Issue Number */}
            <div className="mt-auto">
              <span className="text-3xl font-black text-deep-black/20">
                {magazine.id.padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-all duration-300 flex items-center justify-center">
            <span className="px-5 py-2.5 bg-white text-deep-black font-bold rounded-full opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 text-sm">
              مطالعه مجله
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="text-center">
          <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">
            {magazine.title}
          </h3>
          <p className="text-foreground-secondary text-sm mb-1">
            {magazine.subtitle}
          </p>
          <p className="text-xs text-foreground-secondary">
            {magazine.pageCount} صفحه
          </p>
        </div>
      </article>
    </Link>
  );
}
