import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { prisma } from "@/lib/prisma";

const socialLinks = [
  {
    name: "Instagram",
    href: "https://instagram.com/dotmag",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    ),
  },
  {
    name: "Telegram",
    href: "https://t.me/dotmag",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
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
    ),
  },
  {
    name: "LinkedIn",
    href: "https://linkedin.com/company/dotmag",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
  },
  {
    name: "Email",
    href: "mailto:info@dotmag.ir",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
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
    ),
  },
];

const pageLinks = [
  { label: "خانه", href: "/" },
  { label: "نوشتار", href: "/posts" },
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
              مجله دات، پلتفرمی برای روایت داستان‌های الهام‌بخش از دنیای طراحی،
              تکنولوژی و سبک زندگی مدرن. ما به دنبال کشف زیبایی در جزئیات هستیم.
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
                  {social.icon}
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
