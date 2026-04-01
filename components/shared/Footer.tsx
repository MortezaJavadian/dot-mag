import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { prisma } from "@/lib/prisma";

const socialLinks = [
  {
    name: "Bale",
    href: "https://ble.ir/dotmag",
    src: "/assets/images/bale-logo.png",
  },
  {
    name: "Eitaa",
    href: "https://eitaa.ir/dotmag",
    src: "/assets/images/eitaa-logo.png",
  },
  {
    name: "Virasty",
    href: "https://virasty.com/dotmag",
    src: "/assets/images/virasty-logo.png",
  },
  {
    name: "Telegram",
    href: "https://t.me/dotmag_ir",
    src: "/assets/images/telegram-logo.png",
  },
];

function MaskIcon({ src, label }: { src: string; label: string }) {
  return (
    <span
      aria-hidden
      className="h-6 w-6"
      style={{
        backgroundColor: "white",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        display: "inline-block",
      }}
      title={label}
    />
  );
}

const pageLinks = [
  { label: "خانه", href: "/" },
  { label: "نوشته‌ها", href: "/posts" },
  { label: "رادیو دات", href: "/radio" },
  { label: "آرشیو مجله", href: "/archive" },
  { label: "درباره ما", href: "/about" },
];

type FooterTag = {
  id: string;
  name: string;
  slug: string;
};

async function getFooterTags(): Promise<FooterTag[]> {
  try {
    return await prisma.tag.findMany({
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Failed to fetch footer tags:", error);
    return [];
  }
}

export async function Footer() {
  const tags = await getFooterTags();

  // Convert Gregorian year to Persian (Shamsi) year
  // Persian new year starts around March 20-21
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11 (0=Jan, 2=Mar)
  const day = now.getDate();

  // If before March 21, still in previous Persian year
  const persianYear =
    month < 2 || (month === 2 && day < 21) ? year - 622 : year - 621;

  return (
    <footer className="bg-deep-black text-white">
      <div className="container py-12 md:py-16">
        {/* Main Footer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Logo variant="white" className="mb-4" />
            <p className="text-white/70 max-w-md leading-relaxed mb-6">
              مجله دات را در شبکه‌های اجتماعی دنبال کنید و از تازه‌ترین مطالب و
              رویدادها باخبر شوید!
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-primary transition-colors"
                  aria-label={social.name}
                >
                  <MaskIcon src={social.src} label={social.name} />
                </a>
              ))}
            </div>
          </div>

          {/* Pages */}
          <div>
            <h4 className="font-bold text-lg mb-4">صفحات</h4>
            <ul className="space-y-3">
              {pageLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tags */}
          <div>
            <h4 className="font-bold text-lg mb-4">برچسب‌ها</h4>
            <ul className="space-y-3">
              {tags.length > 0 ? (
                tags.map((tag) => (
                  <li key={tag.id}>
                    <Link
                      href={`/posts?tag=${encodeURIComponent(tag.slug)}`}
                      className="text-white/70 hover:text-primary transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-white/50">هنوز برچسبی ثبت نشده</li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/50 text-sm">
              © {persianYear} مجله دات. تمام حقوق محفوظ است.
            </p>
            <p className="text-white/50 text-sm">
              ساخته‌شده با ❤️ در دانشگاه علم‌وصنعت‌ایران
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
