import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "درباره ما",
  description:
    "معرفی دات و مسیری که برای روایت صداها و همراهی در مسیر درست برگزیده‌ایم",
};

export default function AboutPage() {
  return (
    <>
      <section className="pt-12 pb-8 md:pt-16 md:pb-12 bg-background-secondary">
        <div className="container">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black">
            درباره ما
          </h1>
        </div>
      </section>

      <section className="section-spacing-sm">
        <div className="container grid gap-10 lg:gap-14 lg:grid-cols-[minmax(340px,520px)_1fr] items-start">
          <div className="order-2 lg:order-1 space-y-6 rounded-2xl border border-card-border bg-card-bg p-5 md:p-7 text-base md:text-lg leading-relaxed text-foreground-secondary">
            <div className="space-y-4">
              <p className="text-foreground font-semibold">
                به نام الله؛
                <br />
                هم‌او که نامش میان پرچم‌هامان نقش بسته...
              </p>
              <p className="font-bold">▫️ «دات»</p>
              <p>
                نقطۀ آغاز کلمات ما...
                <br />
                نقطۀ آغاز صدای ما...
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span
                  className="block h-1.5 w-full rounded-full bg-gradient-to-l from-primary/60 via-primary/30 to-transparent"
                  aria-hidden="true"
                />
                <h2 className="text-xl md:text-2xl font-extrabold text-foreground">
                  حالا ما کی باشیم؟
                </h2>
              </div>
              <p>
                یه گروه از دانشجوهای دانشگاه علم و صنعت ایران.
                <br />
                دانشجوهایی که میخوان باصدای بلند بگن:
                <br />
                «آی ملت! بیاید یک ربع، نیم‌ساعت، یک ساعت یا هر چقدر که لازمه
                بشینیم با هم دو کلام حرف حساب بزنیم!»
              </p>
              <p>دانشجوهایی که از بی‌صدایی‌ها و کم‌صدایی‌ها خسته شدن.</p>
              <p>
                دانشجوهایی که اومدن تا بعضی صداها رو تنظیم کنن. صداهایی که دعوت
                به اتحاد و همدلی نمی‌کنن و بعضا ندای مخالف این اتحاد رو هم سر
                می‌دن...
              </p>
              <p>
                دانشجوهایی که توی این جنگ مقدس، می‌خوان به یه نحوی توی مبارزه
                برای حفظ ایرانِ‌مون شرکت کنن.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span
                  className="block h-1.5 w-full rounded-full bg-gradient-to-l from-primary/60 via-primary/30 to-transparent"
                  aria-hidden="true"
                />
                <h2 className="text-xl md:text-2xl font-extrabold text-foreground">
                  خودمونیم و خدای خودمون
                </h2>
              </div>
              <p>
                محدودیت و وابستگی و عضو گروه و حزب ویژه‌ای بودن نداریم.
                <br />
                البته به جز یک گروه خاص...
                <br />
                گروه عالی و متعالیِ «الله»...
                <br />
                سمت درست تاریخ تو این زمانه.
                <br />
                سمتی که خیلیا با عقیده‌های مختلف داخلش هستن.
                <br />
                سمتی که اصلاً نمی‌خواد در جنگ بین حق و باطل آروم بشینه که بی‌طرف
                شناخته بشه...
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span
                  className="block h-1.5 w-full rounded-full bg-gradient-to-l from-primary/60 via-primary/30 to-transparent"
                  aria-hidden="true"
                />
                <h2 className="text-xl md:text-2xl font-extrabold text-foreground">
                  ب بسم‌الله
                </h2>
              </div>
              <p>
                الآن که الآنه، یعنی روزهای اول سال ۱۴۰۵ یه عده‌ای از این دانشگاه
                هستیم که عزم‌مون رو برای راه‌انداختن «دات» جزم کردیم.
                <br />
                ولی با تعریف‌مون از کارمون و سمت‌وسوی خودمون، کار برای انجام
                زیاده و ما هم بغل‌مون برای رفقای هم‌دل و هم‌راه بازه تا در این
                قیام کنار هم فکر کنیم...
              </p>
            </div>
          </div>

          <div className="order-1 lg:order-2 w-full">
            <div className="w-full max-w-[520px] mx-auto lg:mx-0 lg:max-w-none">
              <div className="rounded-2xl overflow-hidden border border-card-border bg-background-secondary p-2.5 md:p-3 lg:sticky lg:top-28">
                <div className="relative aspect-square">
                  <Image
                    src="/assets/images/about_us.png"
                    alt="پوستر نور، صدا، حرکت"
                    fill
                    className="object-contain"
                    sizes="(min-width:1280px) 520px, (min-width:1024px) 460px, 100vw"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-16 md:py-20 border-t border-border text-foreground">
        <div className="container max-w-4xl mx-auto space-y-9">
          <div className="space-y-3 text-center">
            <p className="text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm">
              کیوسکِ دات
            </p>
            <p className="text-lg md:text-xl font-semibold text-foreground">
              پذیرای نقد و نظرات شما هستیم...
            </p>
          </div>

          <div className="rounded-2xl border border-card-border bg-card-bg p-5 md:p-7 text-base md:text-lg leading-relaxed text-foreground-secondary">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
              <div className="space-y-1 text-center sm:text-right">
                <p className="text-lg font-bold text-foreground">
                  در بستر «بله» پیام بگذارید
                </p>
              </div>
              <a
                href="https://ble.ir/dotmag_kiosk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-lg font-semibold text-white shadow-[0_12px_30px_rgba(215,59,58,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(215,59,58,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
              >
                <Image
                  src="/assets/images/bale-logo.png"
                  alt="بله"
                  width={22}
                  height={22}
                  className="object-contain brightness-0 invert"
                  priority={false}
                />
                <span>کیوسکِ دات</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
