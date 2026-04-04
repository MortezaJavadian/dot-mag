import { toPlainText } from "@/lib/articleContent";
import { getUploadUrl } from "@/lib/uploads";

type PersonProfileBlockProps = {
  name: string;
  image: string;
  bio: string;
  className?: string;
};

export function PersonProfileBlock({
  name,
  image,
  bio,
  className,
}: PersonProfileBlockProps) {
  const avatarUrl = getUploadUrl(image);
  const cleanBio = toPlainText(bio);
  const initial = name.trim().charAt(0) || "?";

  if (!name.trim()) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-card-border bg-card-bg px-4 py-3 md:px-5 md:py-4 shadow-[0_10px_28px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_32px_rgba(0,0,0,0.35)] ${className || ""}`}
    >
      <div className="flex items-center gap-3 md:gap-4">
        <div className="h-16 w-16 md:h-20 md:w-20 shrink-0 rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent p-1 shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
          <div className="h-full w-full rounded-full overflow-hidden border border-card-border bg-background-secondary flex items-center justify-center text-lg font-bold text-foreground-secondary">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-base md:text-lg font-bold text-foreground truncate">
            {name}
          </p>
          <p className="mt-1 text-sm md:text-base text-foreground-secondary line-clamp-2 md:line-clamp-3">
            {cleanBio || "\u00a0"}
          </p>
        </div>
      </div>
    </div>
  );
}
