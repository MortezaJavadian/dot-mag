import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioPlayer } from "@/components/feature/AudioPlayer";
import { RadioCard } from "@/components/feature/RadioCard";
import { getUploadUrl } from "@/lib/uploads";

interface PageProps {
  params: Promise<{ slug: string }>;
}

type RadioSegmentItem = {
  id: string;
  number: number;
  title: string;
  audioUrl: string;
  durationSec: number | null;
};

type RadioDetailItem = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  publishedAt: string;
  cover: string | null;
  audioUrl: string | null;
  durationSec: number | null;
  segments: RadioSegmentItem[];
};

async function getRadios(): Promise<RadioDetailItem[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"}/api/radios`,
      {
        next: { revalidate: 60, tags: ["radios"] },
      },
    );

    return await res.json();
  } catch {
    return [];
  }
}

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

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const radios = await getRadios();
  const radio = radios.find(
    (item) => normalizeSlug(item.slug) === normalizeSlug(slug),
  );

  if (!radio) {
    return {
      title: "رادیو یافت نشد",
    };
  }

  return {
    title: radio.title,
    description: radio.intro,
    openGraph: {
      title: radio.title,
      description: radio.intro,
      type: "article",
      publishedTime: radio.publishedAt,
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function RadioDetailPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);

  const radios = await getRadios();

  const radio = radios.find(
    (item) => normalizeSlug(item.slug) === normalizeSlug(slug),
  );

  if (!radio) {
    notFound();
  }

  const sortedSegments = [...(radio.segments || [])].sort(
    (a, b) => a.number - b.number,
  );

  const relatedRadios = radios
    .filter((item) => item.id !== radio.id)
    .slice(0, 3);

  const mainAudioUrl = getUploadUrl(radio.audioUrl);

  return (
    <>
      <article>
        <header className="pt-8 pb-12 md:pt-12 md:pb-16">
          <div className="container max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full">
                رادیو دات
              </span>
              <Link
                href="/radio"
                className="text-sm text-primary font-medium hover:underline"
              >
                بازگشت به رادیو
              </Link>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight">
              {radio.title}
            </h1>

            <p className="text-xl text-foreground-secondary leading-relaxed">
              {radio.intro}
            </p>

            <div className="flex items-center gap-4 text-sm text-foreground-secondary">
              <span>{radio.publishedAt}</span>
              <span>•</span>
              <span>{sortedSegments.length} بخش برگزیده</span>
            </div>
          </div>
        </header>

        <section className="py-6 md:py-8 border-y border-card-border">
          <div className="container max-w-4xl space-y-5">
            <h2 className="text-xl md:text-2xl font-bold">اپیزود کامل</h2>
            {mainAudioUrl ? (
              <AudioPlayer
                src={mainAudioUrl}
                title={radio.title}
                downloadFileName={`${radio.slug || "radio"}-full.mp3`}
              />
            ) : (
              <p className="text-foreground-secondary">
                فایل صوتی اصلی هنوز اضافه نشده است.
              </p>
            )}
          </div>
        </section>

        <section className="py-8 md:py-12">
          <div className="container max-w-4xl space-y-5">
            <h2 className="text-xl md:text-2xl font-bold">بخش‌های برگزیده</h2>

            {sortedSegments.length > 0 ? (
              <div className="space-y-4">
                {sortedSegments.map((segment) => {
                  const segmentAudioUrl = getUploadUrl(segment.audioUrl);

                  return (
                    <div
                      key={segment.id}
                      className="rounded-2xl border border-card-border bg-card-bg p-4 md:p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-semibold">{segment.title}</h3>
                        <span className="text-xs text-foreground-secondary">
                          بخش {segment.number}
                        </span>
                      </div>

                      {segmentAudioUrl ? (
                        <AudioPlayer
                          src={segmentAudioUrl}
                          title={segment.title}
                          downloadFileName={`${radio.slug || "radio"}-segment-${segment.number}.mp3`}
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

      {relatedRadios.length > 0 && (
        <section className="py-12 md:py-16 bg-background-secondary">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">
              رادیوهای دیگر
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedRadios.map((item) => (
                <RadioCard key={item.id} radio={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
