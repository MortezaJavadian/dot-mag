import Image from "next/image";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "درباره دات",
  description:
    "معرفی دات و مسیری که برای روایت صداها و همراهی در مسیر درست برگزیده‌ایم",
};

export default function AboutPage() {
  return (
    <>
      <section className="pt-10 pb-14 md:pt-14 md:pb-20">
        <div className="container grid gap-8 lg:gap-12 lg:grid-cols-[minmax(320px,460px)_1fr] items-start lg:items-center">
          <div className="order-2 lg:order-1 space-y-4 text-lg leading-relaxed text-foreground md:text-xl">
            <h1 className="text-3xl md:text-4xl font-black mb-4">درباره دات</h1>
            <p>
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
            <p className="font-bold">🔻 حالا ما کی باشیم؟</p>
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
              دانشجوهایی که اومدن تا بعضی صداها رو تنظیم کنن. صداهایی که دعوت به
              اتحاد و همدلی نمی‌کنن و بعضا ندای مخالف این اتحاد رو هم سر
              می‌دن...
            </p>
            <p>
              دانشجوهایی که توی این جنگ مقدس، می‌خوان به یه نحوی توی مبارزه برای
              حفظ ایرانِ‌مون شرکت کنن.
            </p>
            <p className="font-bold">🔻 خودمونیم و خدای خودمون</p>
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
            <p>
              🔻 الآن که الآنه، یعنی روزهای اول سال ۱۴۰۵ یه عده‌ای از این
              دانشگاه هستیم که عزم‌مون رو برای راه‌انداختن «دات» جزم کردیم.
              <br />
              ولی با تعریف‌مون از کارمون و سمت‌وسوی خودمون، کار برای انجام زیاده
              و ما هم بغل‌مون برای رفقای هم‌دل و هم‌راه بازه تا در این قیام کنار
              هم فکر کنیم...
            </p>
            <p className="font-bold">🇮🇷 گوش‌به‌زنگ باشید برای شمارۀ اول...</p>
          </div>

          <div className="order-1 lg:order-2 w-full">
            <div className="relative w-full overflow-hidden rounded-2xl bg-background-secondary p-5 shadow-sm aspect-[4/3] sm:aspect-[5/4] md:aspect-square">
              <Image
                src="/assets/images/about_us.jpeg"
                alt="پوستر نور، صدا، حرکت"
                fill
                className="object-contain"
                sizes="(min-width:1024px) 460px, 100vw"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-16 md:py-20 border-t border-border text-foreground">
        <div className="container max-w-3xl mx-auto text-center space-y-6">
          <div className="space-y-3">
            <p className="text-3xl md:text-4xl font-black">کیوسک دات</p>
            <p className="text-lg md:text-xl font-semibold">
              پذیرای نقد و نظرات شما هستیم...
            </p>
            <p className="text-sm md:text-base text-foreground-secondary">
              در بستر «بله» پیام بگذارید.
            </p>
          </div>

          <div className="flex justify-center">
            <a
              href="https://ble.ir/dotmag_kiosk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3 font-semibold border bg-primary text-white border-primary/60 shadow-lg transition-colors hover:bg-primary/90 hover:border-primary"
            >
              <Image
                src="/assets/images/bale-logo.png"
                alt="بله"
                width={20}
                height={20}
                className="object-contain brightness-0 invert"
                priority={false}
              />
              <span className="text-lg">بله</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
