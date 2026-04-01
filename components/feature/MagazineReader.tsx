"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUploadUrl } from "@/lib/uploads";

interface Magazine {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover: string | null;
  pdfUrl: string | null | undefined;
  publishedAt: string;
  pageCount: number;
  pages: Array<{
    id?: string;
    number: number;
    type?: string;
    image: string;
    title?: string;
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
  const [viewportWidth, setViewportWidth] = useState(0);

  const pages = useMemo(() => {
    return [...(magazine.pages || [])]
      .sort((a, b) => a.number - b.number)
      .map((page) => ({
        ...page,
        imageUrl: getUploadUrl(page.image),
      }));
  }, [magazine.pages]);

  const pdfDownloadUrl = getUploadUrl(magazine.pdfUrl);
  const isSpreadView = viewportWidth >= 1024;
  const maxPage = pages.length;

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

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
  }, [currentPage, isFullscreen, router, maxPage, isSpreadView]);

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
    if (isSpreadView) {
      if (currentPage < Math.ceil(maxPage / 2) - 1) {
        setCurrentPage((prev) => prev + 1);
      }
      return;
    }

    if (currentPage < maxPage - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [currentPage, maxPage, isSpreadView]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        prevPage();
      } else {
        nextPage();
      }
    }

    setTouchStart(null);
  };

  const leftIndex = isSpreadView ? currentPage * 2 : currentPage;
  const rightIndex = isSpreadView ? leftIndex + 1 : -1;
  const leftPage = pages[leftIndex];
  const rightPage = rightIndex >= 0 ? pages[rightIndex] : null;

  let displayPageNum = currentPage + 1;
  if (isSpreadView) {
    displayPageNum = leftPage?.number ?? currentPage * 2 + 1;
  }

  return (
    <div
      className={`fixed inset-0 z-50 bg-deep-black flex flex-col ${
        isFullscreen ? "" : "pt-16 md:pt-20"
      }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header
        className={`absolute top-0 right-0 left-0 z-10 transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        } ${isFullscreen ? "" : "top-16 md:top-20"}`}
      >
        <div className="bg-gradient-to-b from-deep-black/90 to-transparent">
          <div className="container py-4 flex items-center justify-between">
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

            <div className="text-center">
              <h1 className="text-white font-bold">{magazine.title}</h1>
              <p className="text-white/60 text-sm">{magazine.subtitle}</p>
              <p className="text-white/60 text-xs">{magazine.publishedAt}</p>
            </div>

            <div className="flex items-center gap-2">
              {pdfDownloadUrl && (
                <a
                  href={pdfDownloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-full text-xs md:text-sm bg-white text-deep-black font-semibold hover:bg-white/90 transition-colors"
                >
                  دانلود PDF
                </a>
              )}
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

      <main className="flex-1 flex items-center justify-center relative">
        {maxPage > 0 && (
          <>
            <button
              onClick={nextPage}
              disabled={
                isSpreadView
                  ? currentPage >= Math.ceil(maxPage / 2) - 1
                  : currentPage >= maxPage - 1
              }
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
          </>
        )}

        {maxPage > 0 ? (
          <div className="w-full h-full flex items-center justify-center p-2 md:p-4">
            {isSpreadView ? (
              <div className="flex gap-2 md:gap-4 w-full max-w-6xl">
                <div className="flex-1 flex items-center justify-center bg-white rounded-lg overflow-hidden min-h-[60vh]">
                  {leftPage?.imageUrl ? (
                    <img
                      src={leftPage.imageUrl}
                      alt={`Page ${leftPage.number}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-slate-500">Image not available</div>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center bg-white rounded-lg overflow-hidden min-h-[60vh]">
                  {rightPage?.imageUrl ? (
                    <img
                      src={rightPage.imageUrl}
                      alt={`Page ${rightPage.number}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-slate-400">&nbsp;</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-4xl aspect-[3/4] bg-white rounded-lg shadow-2xl overflow-hidden flex items-center justify-center">
                {leftPage?.imageUrl ? (
                  <img
                    src={leftPage.imageUrl}
                    alt={`Page ${leftPage.number}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-slate-500">Image not available</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-white text-center">
            <p>مجله‌ای برای نمایش وجود ندارد</p>
          </div>
        )}
      </main>

      <footer
        className={`transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-t from-deep-black/90 to-transparent">
          <div className="container py-4">
            <div className="mb-4">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${
                      maxPage === 0
                        ? 0
                        : isSpreadView
                          ? ((currentPage + 1) / Math.ceil(maxPage / 2)) * 100
                          : ((currentPage + 1) / maxPage) * 100
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="text-center">
              <span className="text-white/60 text-sm">
                صفحه {displayPageNum} از {maxPage}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
