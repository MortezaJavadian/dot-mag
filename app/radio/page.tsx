import { RadioCard } from "@/components/feature/RadioCard";

type RadioListItem = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  cover: string | null;
  publishedAt: string;
  durationSec: number | null;
  segments: { id: string }[];
};

async function getRadios(): Promise<RadioListItem[]> {
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

export default async function RadioPage() {
  const radios = await getRadios();

  return (
    <>
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-background-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4">
            رادیودات
          </h1>
        </div>
      </section>

      <section className="section-spacing-sm">
        <div className="container">
          {radios.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {radios.map((radio, index) => (
                <div
                  key={radio.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <RadioCard radio={radio} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-foreground/5 flex items-center justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-foreground-secondary"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path d="M10 9v6l5-3-5-3z" fill="currentColor" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3">رادیویی منتشر نشده</h3>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
