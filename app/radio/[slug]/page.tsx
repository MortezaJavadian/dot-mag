import { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { AudioPlayer } from "@/components/feature/AudioPlayer";
import { PersonProfileBlock } from "@/components/feature/PersonProfileBlock";
import { RadioCard } from "@/components/feature/RadioCard";
import { fetchInternalArray } from "@/lib/internalApi";
import { getUploadOriginalFileName, getUploadUrl } from "@/lib/uploads";
import { toPlainText, toSafeArticleHtml } from "@/lib/articleContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

type PlayerAudioQuality = "low" | "medium" | "high";

type RadioSegmentItem = {
  id: string;
  number: number;
  title: string;
  summary?: string | null;
  audioUrl: string;
  durationSec: number | null;
};

type RadioSummaryItem = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  intro: string;
  publishedAt: string;
  cover: string | null;
  durationSec: number | null;
  person?: {
    id: string;
    name: string;
    image: string;
    bio: string;
    isDotTeamMember: boolean;
  } | null;
};

type RadioDetailItem = {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  intro: string;
  person?: {
    id: string;
    name: string;
    image: string;
    bio: string;
    isDotTeamMember: boolean;
  } | null;
  publishedAt: string;
  sortDate: string;
  cover: string | null;
  audioUrl: string | null;
  audioUrlLow?: string | null;
  audioUrlMedium?: string | null;
  audioUrlHigh?: string | null;
  playerAudioQuality?: string | null;
  durationSec: number | null;
  segments: RadioSegmentItem[];
};

function decodeSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizeSlug(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\u200c\u200f\u202a\u202b\u202c]/g, "")
    .toLowerCase();
}

function normalizePlayerAudioQuality(
  value?: string | null,
): PlayerAudioQuality {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "low" ||
    normalized === "medium" ||
    normalized === "high"
  ) {
    return normalized;
  }

  return "high";
}

function formatDurationMinutes(seconds?: number | null): string {
  if (!seconds || seconds <= 0) {
    return "مدت نامشخص";
  }

  return `${Math.ceil(seconds / 60)} دقیقه`;
}

function resolveFullEpisodeAudio(radio: RadioDetailItem): string | null {
  const selectedQuality = normalizePlayerAudioQuality(radio.playerAudioQuality);

  const selectedSource =
    selectedQuality === "low"
      ? radio.audioUrlLow
      : selectedQuality === "medium"
        ? radio.audioUrlMedium
        : radio.audioUrlHigh;

  return (
    selectedSource ||
    radio.audioUrlHigh ||
    radio.audioUrlMedium ||
    radio.audioUrlLow ||
    radio.audioUrl ||
    null
  );
}

function buildFullEpisodeDownloadOptions(radio: RadioDetailItem) {
  const hasUrl = (item: {
    label: string;
    url: string | null;
    fileName?: string;
  }): item is { label: string; url: string; fileName?: string } =>
    Boolean(item.url);

  const base = [
    {
      label: "کیفیت پایین",
      url: getUploadUrl(radio.audioUrlLow),
    },
    {
      label: "کیفیت متوسط",
      url: getUploadUrl(radio.audioUrlMedium),
    },
    {
      label: "کیفیت بالا",
      url: getUploadUrl(radio.audioUrlHigh),
    },
  ]
    .filter(hasUrl)
    .map((item) => ({
      ...item,
      fileName: getUploadOriginalFileName(item.url) || undefined,
    }));

  const fallbackUrl = getUploadUrl(radio.audioUrl);
  if (fallbackUrl && !base.some((item) => item.url === fallbackUrl)) {
    base.push({
      label: "کیفیت پیش‌فرض",
      url: fallbackUrl,
      fileName: getUploadOriginalFileName(fallbackUrl) || undefined,
    });
  }

  if (base.length > 0) {
    return base;
  }

  return fallbackUrl
    ? [
        {
          label: "دانلود فایل",
          url: fallbackUrl,
          fileName: getUploadOriginalFileName(fallbackUrl) || undefined,
        },
      ]
    : [];
}

const getRadiosSummary = cache(async (): Promise<RadioSummaryItem[]> => {
  return fetchInternalArray<RadioSummaryItem>("/api/radios?mode=summary", {
    revalidate: 60,
    tags: ["radios"],
    timeoutMs: 5000,
  });
});

const getRadioDetailBySlug = cache(
  async (slug: string): Promise<RadioDetailItem | null> => {
    const radios = await fetchInternalArray<RadioDetailItem>(
      `/api/radios?slug=${encodeURIComponent(slug)}`,
      {
        revalidate: 60,
        tags: ["radios"],
        timeoutMs: 5000,
      },
    );

    return radios[0] || null;
  },
);

const getRadioPageData = cache(
  async (
    rawSlug: string,
  ): Promise<{
    radio: RadioDetailItem | null;
    related: RadioSummaryItem[];
  }> => {
    const slug = decodeSlug(rawSlug);
    const normalizedSlug = normalizeSlug(slug);
    const summary = await getRadiosSummary();

    const matchedSummary = summary.find(
      (item) => normalizeSlug(item.slug) === normalizedSlug,
    );

    if (!matchedSummary) {
      return { radio: null, related: [] };
    }

    const detail = await getRadioDetailBySlug(matchedSummary.slug);

    const related = summary
      .filter((item) => item.id !== matchedSummary.id)
      .slice(0, 3);

    return {
      radio: detail,
      related,
    };
  },
);

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const { radio } = await getRadioPageData(rawSlug);

  if (!radio) {
    return {
      title: "رادیو یافت نشد",
    };
  }

  const description =
    toPlainText(radio.summary || radio.intro || "") || radio.title;

  return {
    title: radio.title,
    description,
    openGraph: {
      title: radio.title,
      description,
      type: "article",
      publishedTime: new Date(radio.sortDate).toISOString(),
    },
  };
}

export default async function RadioDetailPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const { radio, related } = await getRadioPageData(rawSlug);

  if (!radio) {
    notFound();
  }

  const sortedSegments = [...(radio.segments || [])].sort(
    (a, b) => a.number - b.number,
  );

  const coverUrl = getUploadUrl(radio.cover);
  const summaryText = toPlainText(radio.summary || "");
  const introHtml = toSafeArticleHtml(radio.intro || "");
  const fullAudioUrl = getUploadUrl(resolveFullEpisodeAudio(radio));
  const fullDownloadOptions = buildFullEpisodeDownloadOptions(radio);
  const selectedQualityLabel = {
    low: "کیفیت پایین",
    medium: "کیفیت متوسط",
    high: "کیفیت بالا",
  }[normalizePlayerAudioQuality(radio.playerAudioQuality)];

  return (
    <>
      <article>
        <header className="pt-8 pb-12 md:pt-12 md:pb-16">
          <div className="container article-page-container max-w-6xl">
            <div className="md:flex md:items-start md:gap-8 lg:gap-10">
              {coverUrl ? (
                <div className="mb-8 md:mb-0 md:w-[44%] lg:w-[40%] md:shrink-0 md:order-2">
                  <div className="image-frame-shell">
                    <div className="image-frame-inner">
                      <img
                        src={coverUrl}
                        alt={radio.title}
                        className="image-frame-media"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="md:flex-1 md:order-1">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight mb-4">
                  {radio.title}
                </h1>

                <p className="text-xl md:text-2xl font-semibold text-foreground mb-5 min-h-[2.2rem]">
                  {summaryText || "\u00a0"}
                </p>

                {radio.person ? (
                  <PersonProfileBlock
                    name={radio.person.name}
                    image={radio.person.image}
                    bio={radio.person.bio}
                    className="mb-5"
                  />
                ) : null}

                <div className="flex flex-wrap items-center gap-2 text-foreground-secondary text-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{radio.publishedAt}</span>
                  <span>•</span>
                  <span>{formatDurationMinutes(radio.durationSec)}</span>
                </div>

                <div className="hidden md:block mt-8">
                  <div
                    className="prose article-content-prose dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: introHtml }}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="py-8 border-t border-b md:hidden">
          <div className="container article-page-container max-w-4xl">
            <div
              className="prose article-content-prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: introHtml }}
            />
          </div>
        </div>

        <section className="py-8 border-b border-card-border">
          <div className="container article-page-container max-w-4xl space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl md:text-3xl font-bold">اپیزود کامل</h2>
              <span className="text-xs md:text-sm text-foreground-secondary">
                پلیر داخلی: {selectedQualityLabel}
              </span>
            </div>

            {fullAudioUrl ? (
              <AudioPlayer
                src={fullAudioUrl}
                title={radio.title}
                downloadOptions={fullDownloadOptions}
              />
            ) : (
              <p className="text-foreground-secondary">
                فایل صوتی اصلی هنوز اضافه نشده است.
              </p>
            )}
          </div>
        </section>

        <section className="py-10 md:py-12">
          <div className="container article-page-container max-w-4xl space-y-5">
            <h2 className="text-2xl md:text-3xl font-bold">بخش‌های برگزیده</h2>

            {sortedSegments.length > 0 ? (
              <div className="space-y-4">
                {sortedSegments.map((segment) => {
                  const segmentAudioUrl = getUploadUrl(segment.audioUrl);
                  const segmentSummaryText = toPlainText(segment.summary || "");

                  return (
                    <div
                      key={segment.id}
                      className="rounded-2xl border border-card-border bg-card-bg p-4 md:p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg md:text-xl font-bold">
                          {segment.title}
                        </h3>
                        <span className="text-xs text-foreground-secondary">
                          بخش {segment.number}
                        </span>
                      </div>

                      <p className="text-sm md:text-base text-foreground-secondary min-h-[1.5rem]">
                        {segmentSummaryText || "\u00a0"}
                      </p>

                      {segmentAudioUrl ? (
                        <AudioPlayer
                          src={segmentAudioUrl}
                          title={segment.title}
                          compact
                        />
                      ) : (
                        <p className="text-sm text-foreground-secondary">
                          فایل صوتی این بخش موجود نیست.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-foreground-secondary">
                برای این اپیزود هنوز بخش برگزیده‌ای ثبت نشده است.
              </p>
            )}
          </div>
        </section>
      </article>

      {related.length > 0 && (
        <section className="py-12 md:py-16 bg-background-secondary">
          <div className="container article-page-container">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              رادیودات‌های بیشتر
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((item, index) => (
                <div
                  key={item.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${Math.min(index * 60, 420)}ms` }}
                >
                  <RadioCard radio={item} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
