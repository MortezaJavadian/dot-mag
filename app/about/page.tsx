import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "درباره مجله دات، تیم و ماموریت ما",
};

const teamMembers = [
  {
    name: "سارا احمدی",
    role: "سردبیر",
    bio: "نویسنده و سردبیر با بیش از ۱۰ سال تجربه در حوزه رسانه دیجیتال",
  },
  {
    name: "امیر رضایی",
    role: "مدیر هنری",
    bio: "طراح گرافیک و مدیر هنری با تمرکز بر طراحی نشریات",
  },
  {
    name: "نیلوفر کریمی",
    role: "نویسنده ارشد",
    bio: "نویسنده و پژوهشگر در حوزه سبک زندگی و پایداری",
  },
  {
    name: "کیان محمدی",
    role: "عکاس",
    bio: "عکاس حرفه‌ای با تخصص در عکاسی معماری و طبیعت",
  },
];

const values = [
  {
    title: "کیفیت",
    description: "ما به کیفیت محتوا و طراحی متعهدیم. هر مقاله و هر صفحه با دقت و وسواس ساخته می‌شود.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v4" />
        <path d="m16.2 7.8 2.9-2.9" />
        <path d="M18 12h4" />
        <path d="m16.2 16.2 2.9 2.9" />
        <path d="M12 18v4" />
        <path d="m4.9 19.1 2.9-2.9" />
        <path d="M2 12h4" />
        <path d="m4.9 4.9 2.9 2.9" />
      </svg>
    ),
  },
  {
    title: "خلاقیت",
    description: "به دنبال دیدگاه‌های تازه و ایده‌های نو هستیم. از چارچوب‌های سنتی فراتر می‌رویم.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v8" />
        <path d="m4.93 10.93 1.41 1.41" />
        <path d="M2 18h2" />
        <path d="M20 18h2" />
        <path d="m19.07 10.93-1.41 1.41" />
        <path d="M22 22H2" />
        <path d="m8 6 4-4 4 4" />
        <path d="M16 18a4 4 0 0 0-8 0" />
      </svg>
    ),
  },
  {
    title: "الهام‌بخشی",
    description: "می‌خواهیم خوانندگان ما از محتوای مجله الهام بگیرند و به عمل برسند.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    ),
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="pt-12 pb-16 md:pt-16 md:pb-24 bg-gradient-to-b from-cream/30 to-background">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-6">
              درباره <span className="text-primary">دات</span> مگ
            </h1>
            <p className="text-xl text-foreground-secondary leading-relaxed">
              مجله دات در سال ۲۰۲۶ با هدف ایجاد پلتفرمی برای روایت داستان‌های
              الهام‌بخش از دنیای طراحی، تکنولوژی و سبک زندگی مدرن تأسیس شد.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Image Placeholder */}
            <div className="relative aspect-[4/3] bg-cream rounded-2xl overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-foreground-secondary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="mx-auto mb-4 text-khaki"
                  >
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <p className="text-sm">تصویر تیم مجله</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div>
              <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6">
                ماموریت ما
              </span>
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                کشف زیبایی در جزئیات
              </h2>
              <p className="text-foreground-secondary leading-relaxed mb-6">
                در دنیایی که همه چیز با سرعت در حال تغییر است، ما به دنبال
                لحظه‌ای مکث هستیم. لحظه‌ای برای دیدن زیبایی در جزئیات، برای
                شنیدن داستان‌های الهام‌بخش، و برای کشف ایده‌های نو.
              </p>
              <p className="text-foreground-secondary leading-relaxed mb-8">
                مجله دات، دعوتی است به این سفر. سفری در دنیای طراحی، هنر،
                تکنولوژی و سبک زندگی. می‌خواهیم با شما داستان‌هایی را به اشتراک
                بگذاریم که الهام‌بخش باشند و به تفکر وادار کنند.
              </p>
              <Link
                href="/archive"
                className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
              >
                مشاهده شماره‌های مجله
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="rotate-180"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-background-secondary">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">ارزش‌های ما</h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              این ارزش‌ها راهنمای ما در تولید محتوا و تعامل با خوانندگان هستند.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value) => (
              <div
                key={value.title}
                className="bg-card-bg rounded-xl p-8 border border-card-border text-center"
              >
                <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-foreground-secondary">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">تیم ما</h2>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              با افرادی آشنا شوید که پشت مجله دات هستند.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member) => (
              <div key={member.name} className="text-center">
                {/* Avatar Placeholder */}
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-cream flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="text-khaki"
                  >
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 0 0-16 0" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-1">{member.name}</h3>
                <p className="text-primary text-sm font-medium mb-2">
                  {member.role}
                </p>
                <p className="text-foreground-secondary text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 md:py-24 bg-deep-black text-white">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              با ما در ارتباط باشید
            </h2>
            <p className="text-white/70 mb-8">
              سوالی دارید یا می‌خواهید با ما همکاری کنید؟ خوشحال می‌شویم از شما
              بشنویم.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="mailto:info@dotmag.ir"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-deep-black font-bold rounded-full hover:bg-cream transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                info@dotmag.ir
              </a>
              <a
                href="https://t.me/dotmag"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m22 2-7 20-4-9-9-4Z" />
                  <path d="M22 2 11 13" />
                </svg>
                تلگرام
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
