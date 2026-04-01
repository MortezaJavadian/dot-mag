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
        width="24"
        height="24"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
      >
        <path
          fill="#1AC39A"
          d="M24 4C12.95 4 4 12.3 4 22.3c0 5.1 2.6 9.8 6.9 12.9v8.9l8.5-4.8c1.5.3 3 .5 4.6.5 11.05 0 20-8.3 20-18.4C44 12.3 35.05 4 24 4Z"
        />
        <path
          d="M16.5 24.5 22 30l10.5-12"
          stroke="#fff"
          strokeWidth="4"
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
        width="24"
        height="24"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
      >
        <rect x="3" y="3" width="42" height="42" rx="10" fill="#E88300" />
        <path
          fill="#0B0B0B"
          d="M33 16.2c-2.5-2-6.1-2.5-9.3-1.6-5 1.4-8 6.2-6.6 10.9 1.3 4.9 6.5 7.4 11.6 6 2.6-.7 4.6-2.4 5.6-4.6H24c-1.1 0-2.1-.7-2.4-1.7-.4-1.3.4-2.7 1.7-3.2.3-.1.7-.2 1-.2h10c.2-2.8-.8-5.3-1.9-5.6Z"
        />
        <path
          fill="#0B0B0B"
          d="M20.6 22.2c.8-1.8 2.9-2.6 4.9-2.1l3.3.8c1.2.3 1.9 1.5 1.6 2.6-.3 1-1.3 1.7-2.3 1.7h-4.9c-2.2 0-3.5-1.7-2.6-3Z"
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
        width="24"
        height="24"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
      >
        <path
          fill="#1DA2F2"
          d="M42 12c0-5-4-9-9-9H15C9 3 4 8 4 14v8c0 9.9 8.1 18 18 18 9.9 0 18-8.1 18-18V12Z"
        />
        <path
          fill="#0B0B0B"
          d="M28 12.5c-5.3-1.8-10.6.7-10.6 5.3 0 2.6 1.9 4.5 5 5.1l3.7.7c1.4.3 2.3 1 2.3 2 0 1.3-1.4 2.4-3.4 2.4-2 0-3.6-.7-5.4-2l-2.2 3.3c2 1.6 4.7 2.6 7.7 2.6 4.7 0 8.2-2.6 8.2-6.6 0-3-2-5-5.7-5.7l-3.2-.6c-1.2-.2-1.9-.8-1.9-1.6 0-1.1 1.3-1.9 3-1.9 1.5 0 3 .5 4.4 1.4l2.1-3.4c-1.4-.9-2.8-1.5-4.2-2Z"
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
        width="24"
        height="24"
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
      >
        <circle cx="24" cy="24" r="22" fill="#7D693A" />
        <path
          fill="#0B0B0B"
          d="m34.8 14.6-19.8 7.7c-1.4.5-1.3 2.5.2 2.9l7 2.1 2.3 7c.5 1.4 2.4 1.6 2.9.2l7.7-19.8c.5-1.3-.8-2.6-2.3-2.1Z"
        />
        <path
          fill="#D9CBB8"
          d="m21.8 28.1 3.2 3.2 6.4-13.8-13.8 6.4 4.2 1.2Z"
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
          مچله دات را در شبکه‌های اجتماعی دنبال کنید و از تازه‌ترین مطالب و رویدادها باخبر شوید!
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
