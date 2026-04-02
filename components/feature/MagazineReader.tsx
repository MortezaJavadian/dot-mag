"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUploadOriginalFileName, getUploadUrl } from "@/lib/uploads";

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

const CONTROLS_HIDE_DELAY_MS = 1_800;
const SWIPE_THRESHOLD = 50;
const TRACKPAD_SWIPE_THRESHOLD = 36;
const TRACKPAD_NAV_COOLDOWN_MS = 420;

export function MagazineReader({ magazine }: MagazineReaderProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const readerRootRef = useRef<HTMLDivElement | null>(null);
  const controlsHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const suppressTapToggleRef = useRef(false);
  const lastTrackpadNavAtRef = useRef(0);

  const pages = useMemo(() => {
    return [...(magazine.pages || [])]
      .sort((a, b) => a.number - b.number)
      .map((page) => ({
        ...page,
        imageUrl: getUploadUrl(page.image),
      }));
  }, [magazine.pages]);

  const pdfDownloadUrl = getUploadUrl(magazine.pdfUrl);
  const downloadFileName = useMemo(() => {
    const originalName = getUploadOriginalFileName(pdfDownloadUrl);
    if (originalName) {
      return originalName;
    }

    const base = (magazine.slug || magazine.title || "magazine")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0600-\u06FF-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    return `${base || "magazine"}.pdf`;
  }, [magazine.slug, magazine.title, pdfDownloadUrl]);
  const isSpreadView = viewportWidth >= 1024;
  const maxPage = pages.length;
  const spreadCount = Math.ceil(maxPage / 2);

  const clearControlsHideTimeout = useCallback(() => {
    if (controlsHideTimeoutRef.current) {
      clearTimeout(controlsHideTimeoutRef.current);
      controlsHideTimeoutRef.current = null;
    }
  }, []);

  const armControlsAutoHide = useCallback(() => {
    clearControlsHideTimeout();
    controlsHideTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, CONTROLS_HIDE_DELAY_MS);
  }, [clearControlsHideTimeout]);

  const handleBack = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore fullscreen exit errors and continue navigation.
      }
    }

    router.push(`/archive/${magazine.slug}`);
  }, [magazine.slug, router]);

  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      armControlsAutoHide();
    };

    window.addEventListener("mousemove", handleMouseMove);
    armControlsAutoHide();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearControlsHideTimeout();
    };
  }, [armControlsAutoHide, clearControlsHideTimeout]);

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

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        nextPage();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        prevPage();
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          void exitFullscreen();
        } else {
          void handleBack();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitFullscreen, handleBack, isFullscreen, nextPage, prevPage]);

  const hasHorizontalPanRoom = useCallback(
    (target: EventTarget | null, deltaX: number): boolean => {
      if (!(target instanceof Element)) {
        return false;
      }

      let node: Element | null = target;
      while (node) {
        if (node instanceof HTMLElement) {
          const maxScrollLeft = node.scrollWidth - node.clientWidth;
          if (maxScrollLeft > 1) {
            if (deltaX > 0 && node.scrollLeft < maxScrollLeft - 1) {
              return true;
            }
            if (deltaX < 0 && node.scrollLeft > 1) {
              return true;
            }
          }
        }
        node = node.parentElement;
      }

      const doc = document.documentElement;
      const maxWindowScrollX = doc.scrollWidth - window.innerWidth;
      if (maxWindowScrollX > 1) {
        if (deltaX > 0 && window.scrollX < maxWindowScrollX - 1) {
          return true;
        }
        if (deltaX < 0 && window.scrollX > 1) {
          return true;
        }
      }

      return false;
    },
    [],
  );

  useEffect(() => {
    const root = readerRootRef.current;
    if (!root || viewportWidth < 1024) {
      return;
    }

    const handleTrackpadSwipe = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        return;
      }

      const horizontalDelta = Math.abs(event.deltaX);
      const verticalDelta = Math.abs(event.deltaY);

      if (
        horizontalDelta < TRACKPAD_SWIPE_THRESHOLD ||
        horizontalDelta <= verticalDelta
      ) {
        return;
      }

      if (hasHorizontalPanRoom(event.target, event.deltaX)) {
        return;
      }

      const now = Date.now();
      if (now - lastTrackpadNavAtRef.current < TRACKPAD_NAV_COOLDOWN_MS) {
        return;
      }

      if (event.deltaX > 0) {
        if (currentPage <= 0) {
          return;
        }

        event.preventDefault();
        prevPage();
      } else {
        const hasNextPage = isSpreadView
          ? currentPage < spreadCount - 1
          : currentPage < maxPage - 1;

        if (!hasNextPage) {
          return;
        }

        event.preventDefault();
        nextPage();
      }

      lastTrackpadNavAtRef.current = now;
      setShowControls(true);
      armControlsAutoHide();
    };

    root.addEventListener("wheel", handleTrackpadSwipe, { passive: false });

    return () => {
      root.removeEventListener("wheel", handleTrackpadSwipe);
    };
  }, [
    armControlsAutoHide,
    currentPage,
    hasHorizontalPanRoom,
    isSpreadView,
    maxPage,
    nextPage,
    prevPage,
    spreadCount,
    viewportWidth,
  ]);

  const toggleControlsVisibility = useCallback(() => {
    setShowControls((prev) => {
      const next = !prev;
      if (next) {
        armControlsAutoHide();
      } else {
        clearControlsHideTimeout();
      }

      return next;
    });
  }, [armControlsAutoHide, clearControlsHideTimeout]);

  const handleSurfaceTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (suppressTapToggleRef.current) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, label")) {
        return;
      }

      toggleControlsVisibility();
    },
    [toggleControlsVisibility],
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;

    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      suppressTapToggleRef.current = true;
      window.setTimeout(() => {
        suppressTapToggleRef.current = false;
      }, 250);

      if (diff > 0) {
        prevPage();
      } else {
        nextPage();
      }

      setShowControls(true);
      armControlsAutoHide();
    }

    setTouchStart(null);
  };

  const handlePdfDownload = useCallback(async () => {
    if (!pdfDownloadUrl || isDownloading) {
      return;
    }

    setIsDownloading(true);
    setDownloadError("");

    try {
      const response = await fetch(pdfDownloadUrl, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("PDF download request failed");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.open(objectUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      console.error("PDF download failed:", error);
      setDownloadError("دانلود فایل انجام نشد");
    } finally {
      setIsDownloading(false);
    }
  }, [downloadFileName, isDownloading, pdfDownloadUrl]);

  const singlePage = pages[currentPage] ?? null;
  const spreadRightIndex = isSpreadView ? currentPage * 2 : -1;
  const spreadLeftIndex = isSpreadView ? spreadRightIndex + 1 : -1;
  const spreadRightPage =
    spreadRightIndex >= 0 ? pages[spreadRightIndex] : null;
  const spreadLeftPage =
    spreadLeftIndex >= 0 && spreadLeftIndex < maxPage
      ? pages[spreadLeftIndex]
      : null;

  const displayPageNum = Math.min(
    maxPage,
    Math.max(
      0,
      isSpreadView
        ? (spreadLeftPage?.number ?? spreadRightPage?.number ?? 0)
        : (singlePage?.number ?? currentPage + 1),
    ),
  );
  const progressPercent =
    maxPage === 0 ? 0 : Math.min(100, (displayPageNum / maxPage) * 100);
  const canGoPrev = currentPage > 0;
  const canGoNext = isSpreadView
    ? currentPage < spreadCount - 1
    : currentPage < maxPage - 1;

  return (
    <div
      ref={readerRootRef}
      className="fixed inset-0 z-[70] overflow-hidden bg-deep-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleSurfaceTap}
    >
      <header
        className={`absolute inset-x-0 top-0 z-20 transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-b from-deep-black/95 via-deep-black/75 to-transparent">
          <div className="container py-3 md:py-4 flex items-center justify-between gap-3">
            <Link
              href={`/archive/${magazine.slug}`}
              onClick={(e) => {
                e.preventDefault();
                void handleBack();
              }}
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
                <path d="m9 18 6-6-6-6" />
              </svg>
              <span className="hidden md:inline">بازگشت</span>
            </Link>

            <div className="text-center min-w-0">
              <h1 className="text-white font-bold text-sm md:text-base truncate">
                {magazine.title}
              </h1>
              <p className="text-white/78 text-xs md:text-sm truncate">
                {magazine.subtitle}
              </p>
              <p className="text-white/74 text-[11px] md:text-xs">
                {magazine.publishedAt}
              </p>
            </div>

            <div className="flex items-center gap-1 md:gap-2">
              {pdfDownloadUrl && (
                <button
                  onClick={handlePdfDownload}
                  disabled={isDownloading}
                  className="px-3 py-2 rounded-full text-xs md:text-sm bg-white text-deep-black font-semibold hover:bg-white/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                >
                  {isDownloading ? "در حال دانلود..." : "دانلود PDF"}
                </button>
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

          {downloadError && (
            <div className="container pb-2">
              <p className="text-xs text-red-300 text-left">{downloadError}</p>
            </div>
          )}
        </div>
      </header>

      <main className="relative h-full w-full flex items-center justify-center px-2 md:px-4 pt-14 md:pt-16 pb-14 md:pb-16">
        {maxPage > 0 && (
          <>
            <button
              onClick={prevPage}
              disabled={!canGoPrev}
              className={`absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full transition-all flex items-center justify-center ${
                showControls ? "pointer-events-auto" : "pointer-events-none"
              } ${canGoPrev ? "bg-white/10 hover:bg-white/20" : "bg-white/10 cursor-not-allowed"}`}
              style={{ opacity: showControls ? (canGoPrev ? 1 : 0.3) : 0 }}
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

            <button
              onClick={nextPage}
              disabled={!canGoNext}
              className={`absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full transition-all flex items-center justify-center ${
                showControls ? "pointer-events-auto" : "pointer-events-none"
              } ${canGoNext ? "bg-white/10 hover:bg-white/20" : "bg-white/10 cursor-not-allowed"}`}
              style={{ opacity: showControls ? (canGoNext ? 1 : 0.3) : 0 }}
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
          </>
        )}

        {maxPage > 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            {isSpreadView ? (
              <div
                className="grid grid-cols-2 gap-[0.45rem] md:gap-[0.6rem] w-full max-w-6xl h-full max-h-full"
                style={{ direction: "ltr" }}
              >
                <div className="h-full min-h-0 flex items-center justify-end">
                  {spreadLeftPage?.imageUrl ? (
                    <img
                      src={spreadLeftPage.imageUrl}
                      alt={`Page ${spreadLeftPage.number}`}
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl md:rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_24px_56px_rgba(0,0,0,0.72),0_10px_24px_rgba(255,255,255,0.08)]"
                    />
                  ) : null}
                </div>
                <div className="h-full min-h-0 flex items-center justify-start">
                  {spreadRightPage?.imageUrl ? (
                    <img
                      src={spreadRightPage.imageUrl}
                      alt={`Page ${spreadRightPage.number}`}
                      className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl md:rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_24px_56px_rgba(0,0,0,0.72),0_10px_24px_rgba(255,255,255,0.08)]"
                    />
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-4xl h-full max-h-full flex items-center justify-center">
                {singlePage?.imageUrl ? (
                  <img
                    src={singlePage.imageUrl}
                    alt={`Page ${singlePage.number}`}
                    className="max-w-full max-h-full w-auto h-auto object-contain rounded-xl md:rounded-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_24px_56px_rgba(0,0,0,0.72),0_10px_24px_rgba(255,255,255,0.08)]"
                  />
                ) : null}
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
        className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-t from-deep-black/95 via-deep-black/75 to-transparent">
          <div className="container py-3 md:py-4">
            <div className="mb-3 md:mb-4">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>

            <div className="text-center">
              <span className="text-white/60 text-xs md:text-sm">
                صفحه {displayPageNum} از {maxPage}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
