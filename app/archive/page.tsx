import { Metadata } from "next";
import Link from "next/link";
import { MagazineCard } from "@/components/feature/MagazineCard";
import magazines from "@/data/magazines.json";

export const metadata: Metadata = {
  title: "آرشیو مجله",
  description: "تمام شماره‌های مجله دات را به صورت آنلاین مطالعه کنید",
};

export default function ArchivePage() {
  const sortedMagazines = [...magazines].reverse();

  return (
    <>
      {/* Hero */}
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

      {/* Info Banner */}
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
              روی جلد هر شماره کلیک کنید تا مجله‌خوان باز شود. می‌توانید با کشیدن
              به چپ و راست صفحات را ورق بزنید.
            </p>
          </div>
        </div>
      </section>

      {/* Magazine Grid */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
            {sortedMagazines.map((magazine, index) => (
              <div
                key={magazine.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <MagazineCard magazine={magazine} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe CTA */}
      <section className="py-16 md:py-24 bg-background-secondary">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              از شماره‌های جدید باخبر شوید
            </h2>
            <p className="text-foreground-secondary mb-8">
              با عضویت در خبرنامه، اولین نفری باشید که از انتشار شماره جدید مجله
              مطلع می‌شوید.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="ایمیل شما"
                className="flex-1 px-5 py-4 bg-card-bg border border-card-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
              />
              <button className="px-8 py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-colors">
                عضویت
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
