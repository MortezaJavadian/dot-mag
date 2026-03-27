import { Metadata } from "next";
import Link from "next/link";
import { MagazineCard } from "@/components/feature/MagazineCard";

export const metadata: Metadata = {
  title: "آرشیو مجله",
  description: "تمام شماره‌های مجله دات را به صورت آنلاین مطالعه کنید",
};

async function getMagazines() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000"}/api/magazines`,
      {
        next: { revalidate: 3600 },
      },
    );
    return await res.json();
  } catch {
    return [];
  }
}

export default async function ArchivePage() {
  const magazines = await getMagazines();
  const sortedMagazines = [...magazines].reverse();

  return (
    <>
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-gradient-to-b from-forest/10 to-background">
        <div className="container">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
            آرشیو مجله
          </h1>
          <p className="text-foreground-secondary text-lg max-w-2xl">
            تمام شماره‌های مجله دات را مستقیماً در مرورگر مطالعه کنید. بدون نیاز
            به دانلود فایل.
          </p>
        </div>
      </section>

      <section className="py-6 bg-cream/30 border-y border-cream">
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-full bg-forest/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-forest"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <p className="text-foreground-secondary">
              روی جلد هر شماره کلیک کنید تا مجله‌خوان باز شود. می‌توانید با
              کشیدن به چپ و راست صفحات را ورق بزنید.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {sortedMagazines.map((magazine: any) => (
              <MagazineCard key={magazine.id} magazine={magazine} />
            ))}
          </div>

          {sortedMagazines.length === 0 && (
            <div className="text-center py-16">
              <p className="text-foreground-secondary text-lg">
                هنوز شماره‌ای منتشر نشده است.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
