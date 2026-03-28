"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Magazine {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover: string;
  publishedAt: string;
  pageCount: number;
  pages: Array<{
    number: number;
    type: string;
    image: string;
    title: string;
  }>;
}

interface MagazineReaderProps {
  magazine: Magazine;
}

export function MagazineReader({ magazine }: MagazineReaderProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const totalPages = magazine.pages.length;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        nextPage();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        prevPage();
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          exitFullscreen();
        } else {
          router.push("/archive");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, isFullscreen, router]);

  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swiped left - next page (RTL)
        prevPage();
      } else {
        // Swiped right - prev page (RTL)
        nextPage();
      }
    }

    setTouchStart(null);
  };

  const currentPageData = magazine.pages[currentPage];

  return (
    <div
      className={`fixed inset-0 z-50 bg-deep-black flex flex-col ${
        isFullscreen ? "" : "pt-16 md:pt-20"
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <header
        className={`absolute top-0 right-0 left-0 z-10 transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        } ${isFullscreen ? "" : "top-16 md:top-20"}`}
      >
        <div className="bg-gradient-to-b from-deep-black/90 to-transparent">
          <div className="container py-4 flex items-center justify-between">
            {/* Back */}
            <Link
              href="/archive"
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
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
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span className="hidden md:inline">بازگشت به آرشیو</span>
            </Link>

            {/* Title */}
            <div className="text-center">
              <h1 className="text-white font-bold">{magazine.title}</h1>
              <p className="text-white/60 text-sm">{currentPageData?.title}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white/80 hover:text-white transition-colors"
                title={isFullscreen ? "خروج از تمام‌صفحه" : "تمام‌صفحه"}
              >
                {isFullscreen ? (
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
                    <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                    <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                    <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                    <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
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
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                    <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                    <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                    <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center relative">
        {/* Navigation Arrows */}
        <button
          onClick={nextPage}
          disabled={currentPage >= totalPages - 1}
          className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <button
          onClick={prevPage}
          disabled={currentPage <= 0}
          className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>

        {/* Page Display */}
        <div className="w-full h-full flex items-center justify-center p-4 md:p-8">
          <div className="relative w-full max-w-4xl aspect-[3/4] bg-cream rounded-lg shadow-2xl overflow-hidden">
            {/* Page Content Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-deep-black">
              {currentPageData?.type === "cover" && (
                <>
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <span className="text-primary text-4xl font-black">.</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black mb-2">دات</h2>
                  <p className="text-khaki text-lg mb-4">{magazine.subtitle}</p>
                  <p className="text-deep-black/50 text-sm">{magazine.title}</p>
                </>
              )}

              {currentPageData?.type === "toc" && (
                <>
                  <h2 className="text-2xl font-bold mb-8">فهرست مطالب</h2>
                  <div className="w-full max-w-sm space-y-4">
                    {magazine.pages
                      .filter(
                        (p) => p.type === "article" || p.type === "editorial",
                      )
                      .map((page) => (
                        <div
                          key={page.number}
                          className="flex justify-between items-center border-b border-khaki/20 pb-2"
                        >
                          <span className="font-medium">{page.title}</span>
                          <span className="text-khaki">{page.number}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}

              {currentPageData?.type === "editorial" && (
                <>
                  <h2 className="text-2xl font-bold mb-6">سرمقاله</h2>
                  <p className="text-center text-deep-black/70 leading-loose max-w-md">
                    به شماره جدید مجله دات خوش آمدید. در این شماره با موضوعات
                    جذابی از دنیای طراحی، تکنولوژی و سبک زندگی آشنا خواهید شد.
                  </p>
                  <p className="mt-6 text-khaki font-medium">— تیم مجله دات</p>
                </>
              )}

              {currentPageData?.type === "article" && (
                <>
                  <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">
                    {currentPageData.title}
                  </h2>
                  <div className="w-full h-96 bg-khaki/10 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
                    {currentPageData.image ? (
                      <img
                        src={currentPageData.image}
                        alt={currentPageData.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className="text-khaki/50"
                      >
                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                      </svg>
                    )}
                  </div>
                  <p className="text-center text-deep-black/70 leading-loose">
                    {currentPageData.title}
                  </p>
                </>
              )}

              {/* Page Number */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                <span className="text-deep-black/40 text-sm">
                  {currentPageData?.number}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Page Indicator */}
      <footer
        className={`transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-t from-deep-black/90 to-transparent">
          <div className="container py-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${((currentPage + 1) / totalPages) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Page Thumbnails */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
              {magazine.pages.map((page, index) => (
                <button
                  key={page.number}
                  onClick={() => goToPage(index)}
                  className={`flex-shrink-0 w-10 h-14 md:w-12 md:h-16 rounded-md overflow-hidden border-2 transition-all ${
                    index === currentPage
                      ? "border-primary scale-110"
                      : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  <div className="w-full h-full bg-cream">
                    {page.image ? (
                      <img
                        src={page.image}
                        alt={`Page ${page.number}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-deep-black/50">
                          {page.number}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Page Counter */}
            <div className="text-center mt-2">
              <span className="text-white/60 text-sm">
                صفحه {currentPage + 1} از {totalPages}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
