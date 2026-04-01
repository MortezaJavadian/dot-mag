import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { prisma } from "@/lib/prisma";

const socialLinks = [
  {
    name: "Bale",
    href: "https://ble.ir/dotmag",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M4 8.5C4 6.6 5.6 5 7.5 5h9c1.9 0 3.5 1.6 3.5 3.5v4c0 1.9-1.6 3.5-3.5 3.5h-4.7l-3.3 3v-3H7.5C5.6 16 4 14.4 4 12.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m8.5 11.8 2.5 2.5 4.7-5.3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "Eitaa",
    href: "https://eitaa.ir/dotmag",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M6.2 10.2C7 7 10.5 5.1 13.9 6c2.4.6 4 2.4 4.3 4.8h-7.9c-1.2 0-2.1.8-2.1 1.9s.9 1.9 2.1 1.9h6.8c-.8 2.7-3.4 4.4-6.4 4.4-3.9 0-6.8-3-6.8-6.8 0-.7.1-1.4.3-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "Virasty",
    href: "https://virasty.com/dotmag",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M16.2 7.2c-3.4-1.5-7.6.5-7.6 3.9 0 1.6 1.2 2.8 3.1 3.2l2.5.5c1.1.2 1.8.8 1.8 1.7 0 1.4-1.5 2.3-3.4 2.3-1.7 0-3.2-.6-4.8-1.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.1 16.5c1.5 1.2 3.5 1.9 5.6 1.9 3.6 0 5.9-2.1 5.9-5.1 0-2.2-1.4-3.7-4.1-4.3l-2.4-.5c-1.3-.3-2-.9-2-1.8C12.1 5.9 13.4 5 15 5c1.2 0 2.4.4 3.6 1.1"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    name: "Telegram",
    href: "https://t.me/dotmag_ir",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="m19.5 5.5-14 5.4c-.9.3-.9 1.5.1 1.8l5 1.5 1.6 5c.3.9 1.5 1 1.8.1l5.5-14c.3-.9-.6-1.7-1.4-1.3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m9.9 12.9 2.2 2.2 4.4-9.5-9.5 4.4 2.9.9Z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
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
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-primary transition-colors text-white"
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
