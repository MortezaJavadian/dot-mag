import Link from "next/link";
import { getUploadUrl } from "@/lib/uploads";
import { toPlainText } from "@/lib/articleContent";

interface Radio {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  intro: string;
  cover: string | null;
  publishedAt: string;
  durationSec?: number | null;
}

interface RadioCardProps {
  radio: Radio;
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return "نامشخص";
  const mins = Math.ceil(seconds / 60);
  return `${mins} دقیقه`;
}

export function RadioCard({ radio }: RadioCardProps) {
  const coverSrc = getUploadUrl(radio.cover);
  const summaryText = toPlainText(radio.summary || radio.intro || "");
  const hasSummary = summaryText.length > 0;

  return (
    <Link href={`/radio/${radio.slug}`} scroll={true} className="group block">
      <article className="card-hover bg-card-bg rounded-2xl overflow-hidden border border-card-border">
        <div className="relative aspect-square bg-gradient-to-br from-cream to-khaki/20 overflow-hidden">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={radio.title}
              className="w-full h-full object-contain bg-background-secondary"
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
        </div>

        <div className="p-5 md:p-6">
          <h3 className="text-lg md:text-xl font-bold group-hover:text-primary transition-colors line-clamp-2">
            {radio.title}
          </h3>

          <p className="text-foreground-secondary text-sm leading-5 line-clamp-1 min-h-[1.25rem] mb-4">
            {hasSummary ? summaryText : "\u00a0"}
          </p>

          <div className="flex items-center justify-between text-xs text-foreground-secondary">
            <span>{radio.publishedAt}</span>
            <span>{formatDuration(radio.durationSec)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
