import { Metadata } from "next";
import { MagazineCard } from "@/components/feature/MagazineCard";
import { getPublicMagazines } from "@/lib/magazines";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "آرشیو مجله",
  description: "تمام شماره‌های مجله دات را به صورت آنلاین مطالعه کنید",
};

export default async function ArchivePage() {
  const magazines = await getPublicMagazines();

  return (
    <>
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-background-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black">
            آرشیو مجله
          </h1>
        </div>
      </section>

      <section className="section-spacing-sm bg-background">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {magazines.map((magazine, index) => (
              <div
                key={magazine.id}
                className="animate-slide-up"
                style={{ animationDelay: `${Math.min(index * 60, 420)}ms` }}
              >
                <MagazineCard magazine={magazine} />
              </div>
            ))}
          </div>

          {magazines.length === 0 && (
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
