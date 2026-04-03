"use client";

import { useState, useEffect, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useThemeContext } from "@/components/shared/ThemeProvider";

const navLinks = [
  { href: "/", label: "خانه" },
  { href: "/posts", label: "نوشته‌ها" },
  { href: "/radio", label: "رادیودات" },
  { href: "/archive", label: "آرشیو مجله" },
  { href: "/about", label: "درباره ما" },
];

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { theme, toggleTheme } = useThemeContext();

  const isLinkActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const closeMobileMenu = () => {
    setIsMenuOpen(false);
  };

  const handleMobileMenuOutsideClick = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    closeMobileMenu();
  };

  const handleMobileMenuPanelClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    const originalTouchAction = document.body.style.touchAction;

    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "contain";
      document.body.style.touchAction = "none";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isMenuOpen]);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 bg-background/95 backdrop-blur-md border-b border-card-border/70 ${
        isScrolled || isMenuOpen
          ? "shadow-[0_14px_34px_rgba(0,0,0,0.18)]"
          : "shadow-[0_10px_26px_rgba(0,0,0,0.14)]"
      }`}
    >
      <div className="container">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Logo />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-all duration-200 ${
                  isLinkActive(link.href)
                    ? "text-primary font-black text-[1.03rem] px-3 py-1.5 rounded-full bg-primary/12 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
                    : "text-foreground/80 hover:text-primary font-medium"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-foreground/5 transition-colors"
              aria-label={theme === "light" ? "حالت تاریک" : "حالت روشن"}
            >
              {theme === "light" ? (
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
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              ) : (
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
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen((previous) => !previous)}
              className="p-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 transition-colors md:hidden"
              aria-label="منو"
            >
              {isMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-x-0 bottom-0 top-16 z-[60] transition-opacity duration-300 md:hidden ${
          isMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={handleMobileMenuOutsideClick}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[5] bg-deep-black/70"
        />
        <nav className="container relative z-10 py-6">
          <div
            className="rounded-[1.35rem] border p-5 shadow-[0_28px_64px_rgba(0,0,0,0.38)]"
            style={{
              backgroundColor: "var(--mobile-menu-surface)",
              borderColor: "var(--mobile-menu-surface-border)",
            }}
            onClick={handleMobileMenuPanelClick}
          >
            <ul className="space-y-5">
              {navLinks.map((link, index) => (
                <li
                  key={link.href}
                  className={`animate-slide-in-right`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <Link
                    href={link.href}
                    onClick={closeMobileMenu}
                    className={`block py-2 transition-all ${
                      isLinkActive(link.href)
                        ? "text-primary text-[2.05rem] font-black"
                        : "text-foreground hover:text-primary text-2xl font-bold"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </header>
  );
}
