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
      className={`w-fit max-w-full rounded-2xl border border-card-border bg-card-bg px-3 py-2.5 md:px-4 md:py-3 shadow-[0_10px_24px_rgba(0,0,0,0.11)] dark:shadow-[0_14px_28px_rgba(0,0,0,0.32)] ${className || ""}`}
    >
      <div className="flex items-center gap-2.5 md:gap-3">
        <div className="h-14 w-14 md:h-16 md:w-16 shrink-0 rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent p-1 shadow-[0_7px_16px_rgba(0,0,0,0.16)]">
          <div className="h-full w-full rounded-full overflow-hidden border border-card-border bg-background-secondary flex items-center justify-center text-base md:text-lg font-bold text-foreground-secondary">
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
          <p className="py-0.5 pe-1 text-lg md:text-xl font-black text-foreground truncate leading-tight">
            {name}
          </p>
          <p className="mt-0.5 text-sm md:text-base text-foreground-secondary line-clamp-2 md:line-clamp-3">
            {cleanBio || "\u00a0"}
          </p>
        </div>
      </div>
    </div>
  );
}
