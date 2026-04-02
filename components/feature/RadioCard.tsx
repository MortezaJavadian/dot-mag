import Link from "next/link";
import { getUploadUrl } from "@/lib/uploads";

interface Radio {
  id: string;
  slug: string;
  title: string;
  intro: string;
  cover: string | null;
  publishedAt: string;
  durationSec?: number | null;
  segments?: { id: string }[];
}

interface RadioCardProps {
  radio: Radio;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "نامشخص";
  const mins = Math.floor(seconds / 60);
  return `${mins} دقیقه`;
}

export function RadioCard({ radio }: RadioCardProps) {
  const coverSrc = getUploadUrl(radio.cover);

  return (
    <Link href={`/radio/${radio.slug}`} scroll={true} className="group block">
      <article className="card-hover bg-card-bg rounded-2xl overflow-hidden border border-card-border">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-cream to-khaki/20 overflow-hidden">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={radio.title}
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
                <circle cx="12" cy="12" r="10" />
                <path d="M10 8v8l6-4-6-4z" fill="currentColor" stroke="none" />
              </svg>
            </div>
          )}

          <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/20 transition-colors duration-300" />
        </div>

        <div className="p-5 md:p-6 space-y-3">
          <h3 className="text-lg md:text-xl font-bold group-hover:text-primary transition-colors line-clamp-2">
            {radio.title}
          </h3>

          <p className="text-foreground-secondary text-sm line-clamp-2">
            {radio.intro}
          </p>

          <div className="flex items-center justify-between text-xs text-foreground-secondary">
            <span>{radio.publishedAt}</span>
            <span>{formatDuration(radio.durationSec)}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-primary font-medium">
              {radio.segments?.length || 0} بخش برگزیده
            </span>
            <span className="font-semibold group-hover:text-primary transition-colors">
              شنیدن رادیو ←
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
