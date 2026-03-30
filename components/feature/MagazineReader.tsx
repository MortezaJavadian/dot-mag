"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUploadUrl } from "@/lib/uploads";

let pdfWorkerConfigured = false;
const PDF_LOAD_TIMEOUT_MS = 20000;

function resolveWorkerSrc(workerModule: unknown): string | null {
  if (typeof workerModule === "string") {
    return workerModule;
  }

  if (!workerModule || typeof workerModule !== "object") {
    return null;
  }

  const maybeModule = workerModule as {
    default?: unknown;
    workerSrc?: unknown;
  };

  if (typeof maybeModule.default === "string") {
    return maybeModule.default;
  }

  if (
    maybeModule.default &&
    typeof maybeModule.default === "object" &&
    "default" in maybeModule.default
  ) {
    const nestedDefault = (maybeModule.default as { default?: unknown })
      .default;
    if (typeof nestedDefault === "string") {
      return nestedDefault;
    }
  }

  if (typeof maybeModule.workerSrc === "string") {
    return maybeModule.workerSrc;
  }

  return null;
}

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
  const [pdfPages, setPdfPages] = useState<any[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const pdfSrc = getUploadUrl(magazine.pdfUrl);
  const [isLoading, setIsLoading] = useState(!!pdfSrc);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const canvasRefsLeft = useRef<(HTMLCanvasElement | null)[]>([]);
  const canvasRefsRight = useRef<(HTMLCanvasElement | null)[]>([]);
  const [viewportWidth, setViewportWidth] = useState(0);

  // Detect viewport width for responsive layout
  useEffect(() => {
    const updateWidth = () => setViewportWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Load PDF if pdfUrl exists (client-only)
  useEffect(() => {
    const pdfUrl = pdfSrc;
    if (!pdfUrl) {
      setIsLoading(false);
      setPdfError(null);
      setPdfPages([]);
      setTotalPages(0);
      return;
    }

    let isActive = true;
    let loadingTask: any;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setPdfError(null);
        setPdfPages([]);
        setTotalPages(0);

        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const { getDocument, GlobalWorkerOptions, version } = pdfjs as any;
        let disableWorker = !pdfWorkerConfigured;

        if (!getDocument) {
          throw new Error("pdfjs getDocument unavailable");
        }

        if (!pdfWorkerConfigured && GlobalWorkerOptions) {
          try {
            const workerModule =
              await import("pdfjs-dist/build/pdf.worker.min.mjs");
            const workerSrc = resolveWorkerSrc(workerModule);

            if (workerSrc) {
              GlobalWorkerOptions.workerSrc = workerSrc;
              pdfWorkerConfigured = true;
              disableWorker = false;
              console.log("[MagazineReader] worker configured", {
                workerSrc,
                version,
              });
            } else {
              disableWorker = true;
              console.warn(
                "[MagazineReader] worker src unresolved, using disableWorker fallback",
              );
            }
          } catch (workerError) {
            disableWorker = true;
            console.warn(
              "[MagazineReader] worker import failed, using disableWorker fallback",
              workerError,
            );
          }
        } else if (pdfWorkerConfigured) {
          disableWorker = false;
        }

        console.log("[MagazineReader] loading PDF", { pdfUrl, disableWorker });
        loadingTask = getDocument(
          disableWorker
            ? { url: pdfUrl, disableWorker: true }
            : { url: pdfUrl },
        );

        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              new Error(
                "بارگذاری PDF بیش از حد طولانی شد. لطفاً دوباره تلاش کنید یا فایل را دانلود کنید.",
              ),
            );
          }, PDF_LOAD_TIMEOUT_MS);
        });

        const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);

        if (!isActive) {
          await loadingTask.destroy?.();
          return;
        }

        setTotalPages(pdf.numPages);

        console.log("[MagazineReader] pdf loaded", {
          pages: pdf.numPages,
          url: pdfUrl,
        });

        const pages = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 200); i++) {
          pages.push({ pageNum: i, pdf });
        }
        setPdfPages(pages);
      } catch (error: any) {
        console.error("[MagazineReader] PDF loading error", error);
        const message =
          error?.message ||
          "خطا در بارگذاری PDF. لطفاً دوباره تلاش کنید یا فایل را دانلود کنید.";
        setPdfError(message);
        setTotalPages(magazine.pageCount || 0);
        await loadingTask?.destroy?.();
      } finally {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isActive = false;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      loadingTask?.destroy?.();
    };
  }, [pdfSrc, magazine.pageCount]);

  // Render PDF pages on canvas
  useEffect(() => {
    if (!pdfSrc || pdfPages.length === 0) return;

    const isSpreadView = viewportWidth >= 1024;
    const pagesToRender = isSpreadView
      ? [currentPage * 2, currentPage * 2 + 1]
      : [currentPage];

    pdfPages.forEach(({ pageNum, pdf }) => {
      if (!pagesToRender.includes(pageNum - 1)) return;

      const renderPage = async () => {
        try {
          console.log("[MagazineReader] rendering page", {
            pageNum,
            currentPage,
            isSpreadView,
            viewportWidth,
          });
          const page = await pdf.getPage(pageNum);
          let canvas;

          if (isSpreadView) {
            const isLeftPage = (pageNum - 1) % 2 === 0;
            canvas = isLeftPage
              ? canvasRefsLeft.current[0]
              : canvasRefsRight.current[0];
          } else {
            canvas = canvasRefsLeft.current[0];
          }

          if (!canvas) return;

          const scale = viewportWidth < 768 ? 1 : 1.5;
          const viewport = page.getViewport({ scale });

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const context = canvas.getContext("2d");
          if (context) {
            await page.render({
              canvasContext: context,
              viewport,
            }).promise;
          } else {
            console.warn("[MagazineReader] missing canvas context", {
              pageNum,
            });
          }
        } catch (err: any) {
          console.error("[MagazineReader] Page render error", err);
          const message =
            err?.message ||
            "خطا در رندر صفحه PDF. لطفاً دوباره تلاش کنید یا فایل را دانلود کنید.";
          setPdfError((prev) => prev ?? message);
        }
      };

      renderPage();
    });
  }, [currentPage, pdfPages, viewportWidth, pdfSrc]);

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
  }, [currentPage, isFullscreen, router, totalPages, pdfSrc]);

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

  const getMaxPage = () => {
    if (pdfSrc) return totalPages;
    return magazine.pages.length;
  };

  const isSpreadView = viewportWidth >= 1024;
  const maxPage = getMaxPage();

  const nextPage = useCallback(() => {
    if (isSpreadView) {
      if (currentPage < Math.ceil(maxPage / 2) - 1) {
        setCurrentPage((prev) => prev + 1);
      }
    } else {
      if (currentPage < maxPage - 1) {
        setCurrentPage((prev) => prev + 1);
      }
    }
  }, [currentPage, maxPage, isSpreadView]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [currentPage]);

  const goToPage = (page: number) => {
    if (isSpreadView) {
      setCurrentPage(Math.max(0, Math.min(page, Math.ceil(maxPage / 2) - 1)));
    } else {
      setCurrentPage(Math.max(0, Math.min(page, maxPage - 1)));
    }
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
        prevPage();
      } else {
        nextPage();
      }
    }

    setTouchStart(null);
  };

  // Determine current page display
  let displayPageNum = currentPage + 1;
  let displayTotalPages = maxPage;

  if (pdfSrc && isSpreadView) {
    displayPageNum = currentPage * 2 + 1;
    displayTotalPages = totalPages;
  }

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
            </div>

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
        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-center justify-center">
            <div className="text-white text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p>در حال بارگذاری PDF...</p>
            </div>
          </div>
        )}

        {!isLoading && pdfError && (
          <div className="text-white text-center space-y-4">
            <p>{pdfError}</p>
            {pdfSrc && (
              <a
                href={pdfSrc}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-deep-black font-semibold hover:bg-white/90 transition-colors"
              >
                دانلود PDF
              </a>
            )}
          </div>
        )}

        {/* Navigation Arrows */}
        {!isLoading && !pdfError && maxPage > 0 && (
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

        {/* Page Display */}
        {!isLoading && !pdfError && (
          <>
            {pdfSrc ? (
              // PDF Viewer
              <div className="w-full h-full flex items-center justify-center p-2 md:p-4">
                {isSpreadView ? (
                  // Spread view (2 pages)
                  <div className="flex gap-2 md:gap-4 w-full max-w-6xl">
                    <div className="flex-1 flex items-center justify-center bg-white rounded-lg overflow-hidden">
                      <canvas
                        ref={(el) => {
                          canvasRefsLeft.current[0] = el;
                        }}
                        className="max-w-full max-h-full"
                      />
                    </div>
                    <div className="flex-1 flex items-center justify-center bg-white rounded-lg overflow-hidden">
                      <canvas
                        ref={(el) => {
                          canvasRefsRight.current[0] = el;
                        }}
                        className="max-w-full max-h-full"
                      />
                    </div>
                  </div>
                ) : (
                  // Single page view
                  <div className="w-full max-w-4xl aspect-[3/4] bg-white rounded-lg shadow-2xl overflow-hidden flex items-center justify-center">
                    <canvas
                      ref={(el) => {
                        canvasRefsLeft.current[0] = el;
                      }}
                      className="max-w-full max-h-full"
                    />
                  </div>
                )}
              </div>
            ) : magazine.pages.length > 0 ? (
              // Fallback to image-based pages
              <div className="w-full h-full flex items-center justify-center p-4 md:p-8">
                <div className="relative w-full max-w-4xl aspect-[3/4] bg-cream rounded-lg shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-deep-black">
                    {magazine.pages[currentPage]?.type === "cover" && (
                      <>
                        {getUploadUrl(magazine.pages[currentPage].image) ? (
                          <img
                            src={
                              getUploadUrl(magazine.pages[currentPage].image) ||
                              ""
                            }
                            alt="جلد"
                            className="w-full h-full object-cover absolute inset-0"
                          />
                        ) : (
                          <>
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                              <span className="text-primary text-4xl font-black">
                                .
                              </span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-black mb-2">
                              دات
                            </h2>
                            <p className="text-khaki text-lg mb-4">
                              {magazine.subtitle}
                            </p>
                            <p className="text-deep-black/50 text-sm">
                              {magazine.title}
                            </p>
                          </>
                        )}
                      </>
                    )}

                    {magazine.pages[currentPage]?.type === "toc" && (
                      <>
                        {getUploadUrl(magazine.pages[currentPage].image) ? (
                          <img
                            src={
                              getUploadUrl(magazine.pages[currentPage].image) ||
                              ""
                            }
                            alt="فهرست مطالب"
                            className="w-full h-full object-cover absolute inset-0"
                          />
                        ) : (
                          <>
                            <h2 className="text-2xl font-bold mb-8">
                              فهرست مطالب
                            </h2>
                            <div className="w-full max-w-sm space-y-4">
                              {magazine.pages
                                .filter(
                                  (p) =>
                                    p.type === "article" ||
                                    p.type === "editorial",
                                )
                                .map((page) => (
                                  <div
                                    key={page.number}
                                    className="flex justify-between items-center border-b border-khaki/20 pb-2"
                                  >
                                    <span className="font-medium">
                                      {page.title}
                                    </span>
                                    <span className="text-khaki">
                                      {page.number}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {magazine.pages[currentPage]?.type === "editorial" && (
                      <>
                        {getUploadUrl(magazine.pages[currentPage].image) ? (
                          <img
                            src={
                              getUploadUrl(magazine.pages[currentPage].image) ||
                              ""
                            }
                            alt="سرمقاله"
                            className="w-full h-full object-cover absolute inset-0"
                          />
                        ) : (
                          <>
                            <h2 className="text-2xl font-bold mb-6">سرمقاله</h2>
                            <p className="text-center text-deep-black/70 leading-loose max-w-md">
                              به شماره جدید مجله دات خوش آمدید. در این شماره با
                              موضوعات جذابی از دنیای طراحی، تکنولوژی و سبک زندگی
                              آشنا خواهید شد.
                            </p>
                            <p className="mt-6 text-khaki font-medium">
                              — تیم مجله دات
                            </p>
                          </>
                        )}
                      </>
                    )}

                    {magazine.pages[currentPage]?.type === "article" && (
                      <>
                        <h2 className="text-xl md:text-2xl font-bold mb-4 text-center">
                          {magazine.pages[currentPage].title}
                        </h2>
                        <div className="w-full h-96 bg-khaki/10 rounded-lg mb-6 flex items-center justify-center overflow-hidden">
                          {getUploadUrl(magazine.pages[currentPage].image) ? (
                            <img
                              src={
                                getUploadUrl(
                                  magazine.pages[currentPage].image,
                                ) || ""
                              }
                              alt={magazine.pages[currentPage].title}
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
                              <rect
                                width="18"
                                height="18"
                                x="3"
                                y="3"
                                rx="2"
                                ry="2"
                              />
                              <circle cx="9" cy="9" r="2" />
                              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                            </svg>
                          )}
                        </div>
                        <p className="text-center text-deep-black/70 leading-loose">
                          {magazine.pages[currentPage].title}
                        </p>
                      </>
                    )}

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                      <span className="text-deep-black/40 text-sm">
                        {magazine.pages[currentPage]?.number}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-white text-center">
                <p>مجله‌ای برای نمایش وجود ندارد</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      {!isLoading && (
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
                        isSpreadView
                          ? ((currentPage + 1) / Math.ceil(maxPage / 2)) * 100
                          : ((currentPage + 1) / maxPage) * 100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="text-center">
                <span className="text-white/60 text-sm">
                  صفحه {displayPageNum} از {displayTotalPages}
                </span>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
