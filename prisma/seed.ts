import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      password: hashedPassword,
    },
  });

  console.log(`Admin user "${user.username}" created/verified`);

  // Seed articles
  const articles = [
    {
      slug: "future-of-digital-art",
      title: "آینده هنر دیجیتال در عصر هوش مصنوعی",
      excerpt:
        "هوش مصنوعی چگونه در حال تغییر چشم‌انداز هنر دیجیتال است و هنرمندان چگونه می‌توانند از این فناوری بهره ببرند.",
      content:
        "هوش مصنوعی در سال‌های اخیر تحولات شگرفی در عرصه هنر دیجیتال ایجاد کرده است. از تولید تصاویر با DALL-E و Midjourney گرفته تا ساخت موسیقی و ویدیو، این فناوری مرزهای خلاقیت را جابجا کرده است.\n\nهنرمندان امروزی با چالش جدیدی روبرو هستند: چگونه می‌توان از این ابزارها به عنوان همکار خلاق استفاده کرد بدون آنکه اصالت اثر هنری زیر سوال برود؟\n\nبسیاری از هنرمندان معتقدند که هوش مصنوعی ابزاری است مانند قلم‌مو یا دوربین - ابزاری که در دست هنرمند معنا پیدا می‌کند. دیگران نگران جایگزینی انسان با ماشین هستند.\n\nآنچه مسلم است، هنر دیجیتال دیگر هرگز مثل قبل نخواهد بود. ما در آستانه یک انقلاب خلاقانه ایستاده‌ایم که نتیجه آن را نسل‌های آینده قضاوت خواهند کرد.",
      author: "سارا احمدی",
      category: "تکنولوژی",
      tags: ["هوش مصنوعی", "هنر دیجیتال", "خلاقیت"],
      image: "/assets/images/articles/digital-art.jpg",
      readingTime: 8,
      publishedAt: "2026-03-15",
      featured: true,
    },
    {
      slug: "minimalist-design-trends",
      title: "ترندهای طراحی مینیمال در سال ۲۰۲۶",
      excerpt:
        "نگاهی به جدیدترین ترندهای طراحی مینیمالیستی که صنعت طراحی را متحول کرده‌اند.",
      content:
        "مینیمالیسم در طراحی فقط یک سبک نیست، بلکه یک فلسفه است. فلسفه‌ای که می‌گوید کمتر، بیشتر است.\n\nدر سال ۲۰۲۶، شاهد بازگشت قدرتمند مینیمالیسم با رویکردی جدید هستیم. این بار، مینیمالیسم با گرمای رنگ‌های طبیعی و بافت‌های organIc ترکیب شده است.\n\nبرخی از ترندهای کلیدی عبارتند از:\n- استفاده از فضای سفید به عنوان عنصر طراحی\n- تایپوگرافی ساده اما تأثیرگذار\n- پالت رنگی محدود با تأکید بر کنتراست\n- حذف هر عنصر غیرضروری",
      author: "امیر رضایی",
      category: "طراحی",
      tags: ["مینیمالیسم", "طراحی", "ترند"],
      image: "/assets/images/articles/minimalist.jpg",
      readingTime: 6,
      publishedAt: "2026-03-12",
      featured: true,
    },
    {
      slug: "sustainable-fashion",
      title: "مد پایدار: آینده صنعت پوشاک",
      excerpt:
        "چرا برندهای بزرگ به سمت مد پایدار حرکت می‌کنند و این تغییر چه معنایی برای مصرف‌کنندگان دارد.",
      content:
        "صنعت مد یکی از آلاینده‌ترین صنایع جهان است. اما تغییرات در حال وقوع است.\n\nبرندهای بزرگ متوجه شده‌اند که مصرف‌کنندگان نسل جدید به محیط زیست اهمیت می‌دهند. آن‌ها حاضرند برای محصولات پایدار بیشتر هزینه کنند.\n\nمد پایدار فقط درباره مواد اولیه نیست. این یک رویکرد جامع است که شامل:\n- تولید اخلاقی\n- کاهش ضایعات\n- طراحی ماندگار\n- قابلیت بازیافت",
      author: "نیلوفر کریمی",
      category: "مد و لباس",
      tags: ["مد پایدار", "محیط زیست", "لباس"],
      image: "/assets/images/articles/fashion.jpg",
      readingTime: 7,
      publishedAt: "2026-03-10",
      featured: false,
    },
    {
      slug: "architecture-and-nature",
      title: "معماری و طبیعت: هارمونی در طراحی",
      excerpt: "چگونه معماران مدرن طبیعت را در طراحی‌های خود ادغام می‌کنند.",
      content:
        "معماری مدرن دیگر در تقابل با طبیعت نیست. بلکه در هماهنگی با آن طراحی می‌شود.\n\nساختمان‌های سبز، دیوارهای زنده، و سقف‌های باغی نمونه‌هایی از این رویکرد جدید هستند. معماران امروزی می‌دانند که ساختمان‌ها باید نفس بکشند.\n\nمزایای این رویکرد:\n- کاهش مصرف انرژی\n- بهبود سلامت روان ساکنین\n- افزایش تنوع زیستی شهری\n- زیبایی بی‌نظیر",
      author: "کیان محمدی",
      category: "معماری",
      tags: ["معماری", "طبیعت", "طراحی سبز"],
      image: "/assets/images/articles/architecture.jpg",
      readingTime: 9,
      publishedAt: "2026-03-08",
      featured: false,
    },
    {
      slug: "photography-mobile-era",
      title: "عکاسی در عصر موبایل",
      excerpt:
        "آیا دوربین‌های موبایل جایگزین دوربین‌های حرفه‌ای شده‌اند؟ بررسی تحولات عکاسی.",
      content:
        "ده سال پیش، هیچ عکاس حرفه‌ای فکر نمی‌کرد روزی گوشی موبایل رقیب جدی دوربینش شود. اما امروز واقعیت متفاوت است.\n\nدوربین‌های موبایل با پیشرفت‌های خیره‌کننده در نرم‌افزار و سخت‌افزار، کیفیتی ارائه می‌دهند که برای بسیاری از کاربردها کافی است.\n\nاما آیا این به معنای پایان عکاسی حرفه‌ای است؟ قطعاً نه. هنوز جایی که کنترل کامل، لنزهای تخصصی، و کیفیت بی‌نظیر مورد نیاز است، دوربین‌های حرفه‌ای حرف اول را می‌زنند.",
      author: "مریم حسینی",
      category: "عکاسی",
      tags: ["عکاسی", "موبایل", "تکنولوژی"],
      image: "/assets/images/articles/photography.jpg",
      readingTime: 5,
      publishedAt: "2026-03-05",
      featured: false,
    },
    {
      slug: "coffee-culture-iran",
      title: "فرهنگ قهوه در ایران مدرن",
      excerpt:
        "چگونه قهوه از یک نوشیدنی به یک فرهنگ تبدیل شد و کافه‌ها چه نقشی در زندگی شهری ایفا می‌کنند.",
      content:
        "ایران سرزمین چای بود. اما در دو دهه اخیر، قهوه جای خود را در فرهنگ ایرانی باز کرده است.\n\nکافه‌ها دیگر فقط مکانی برای نوشیدن قهوه نیستند. آن‌ها فضاهای اجتماعی، محل کار فریلنسرها، و نقطه تلاقی هنر و زندگی روزمره هستند.\n\nموج سوم قهوه به ایران رسیده و با آن، توجه به منشأ دانه‌ها، روش‌های دم‌آوری، و تجربه نوشیدن قهوه به اوج خود رسیده است.",
      author: "علی نوروزی",
      category: "سبک زندگی",
      tags: ["قهوه", "کافه", "سبک زندگی"],
      image: "/assets/images/articles/coffee.jpg",
      readingTime: 6,
      publishedAt: "2026-03-01",
      featured: false,
    },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: article,
      create: {
        id: undefined,
        ...article,
      },
    });
  }

  console.log(`${articles.length} articles seeded`);

  // Seed magazines
  const magazines = [
    {
      slug: "issue-1",
      title: "شماره اول",
      subtitle: "آغاز یک داستان جدید",
      description:
        "اولین شماره مجله دات با موضوع آینده طراحی و تکنولوژی. در این شماره به بررسی ترندهای سال ۲۰۲۶ می‌پردازیم.",
      cover: "/assets/images/magazines/issue-1-cover.jpg",
      publishedAt: "2026-01-01",
      pageCount: 48,
      pages: [
        {
          number: 1,
          type: "cover",
          image: "/assets/images/magazines/issue-1/page-1.jpg",
          title: "جلد",
        },
        {
          number: 2,
          type: "toc",
          image: "/assets/images/magazines/issue-1/page-2.jpg",
          title: "فهرست مطالب",
        },
        {
          number: 3,
          type: "editorial",
          image: "/assets/images/magazines/issue-1/page-3.jpg",
          title: "سرمقاله",
        },
        {
          number: 4,
          type: "article",
          image: "/assets/images/magazines/issue-1/page-4.jpg",
          title: "آینده هنر دیجیتال",
        },
        {
          number: 5,
          type: "article",
          image: "/assets/images/magazines/issue-1/page-5.jpg",
          title: "آینده هنر دیجیتال - ادامه",
        },
      ],
    },
    {
      slug: "issue-2",
      title: "شماره دوم",
      subtitle: "جهان مینیمال",
      description:
        "در این شماره به دنیای مینیمالیسم سفر می‌کنیم. از معماری تا طراحی گرافیک و سبک زندگی.",
      cover: "/assets/images/magazines/issue-2-cover.jpg",
      publishedAt: "2026-02-01",
      pageCount: 52,
      pages: [
        {
          number: 1,
          type: "cover",
          image: "/assets/images/magazines/issue-2/page-1.jpg",
          title: "جلد",
        },
        {
          number: 2,
          type: "toc",
          image: "/assets/images/magazines/issue-2/page-2.jpg",
          title: "فهرست مطالب",
        },
        {
          number: 3,
          type: "editorial",
          image: "/assets/images/magazines/issue-2/page-3.jpg",
          title: "سرمقاله",
        },
      ],
    },
    {
      slug: "issue-3",
      title: "شماره سوم",
      subtitle: "طبیعت و شهر",
      description: "این شماره به رابطه انسان، طبیعت و معماری شهری اختصاص دارد.",
      cover: "/assets/images/magazines/issue-3-cover.jpg",
      publishedAt: "2026-03-01",
      pageCount: 56,
      pages: [
        {
          number: 1,
          type: "cover",
          image: "/assets/images/magazines/issue-3/page-1.jpg",
          title: "جلد",
        },
        {
          number: 2,
          type: "toc",
          image: "/assets/images/magazines/issue-3/page-2.jpg",
          title: "فهرست مطالب",
        },
      ],
    },
  ];

  for (const magazine of magazines) {
    const { pages, ...magazineData } = magazine;

    await prisma.magazine.upsert({
      where: { slug: magazine.slug },
      update: {
        ...magazineData,
      },
      create: {
        id: undefined,
        ...magazineData,
      },
    });

    // Delete old pages and create new ones
    await prisma.magazinePage.deleteMany({
      where: {
        magazine: {
          slug: magazine.slug,
        },
      },
    });

    // Get the created/updated magazine to get its ID
    const mag = await prisma.magazine.findUnique({
      where: { slug: magazine.slug },
    });

    if (mag) {
      for (const page of pages) {
        await prisma.magazinePage.create({
          data: {
            magazineId: mag.id,
            ...page,
          },
        });
      }
    }
  }

  console.log(`${magazines.length} magazines seeded`);

  console.log("Database seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
