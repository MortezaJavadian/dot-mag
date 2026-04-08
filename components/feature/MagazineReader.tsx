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
const MOBILE_SWIPE_THRESHOLD = 84;
const HORIZONTAL_SWIPE_DOMINANCE_RATIO = 1.15;
const TAP_MOVEMENT_TOLERANCE = 24;
const TRACKPAD_SWIPE_THRESHOLD = 36;
const TRACKPAD_NAV_COOLDOWN_MS = 420;
const TOUCH_CLICK_SUPPRESS_WINDOW_MS = 700;
const SWIPE_TAP_SUPPRESS_MS = 250;
const MAGAZINE_PAGE_ASPECT_RATIO = 33 / 47;
const DESKTOP_READER_ZOOM_SCALE = 1.05;
const MOBILE_READER_ZOOM_SCALE = 0.7;

type PageMoveDirection = "next" | "prev" | "idle";
type ImageLoadState = "loading" | "loaded" | "error";

const MAGAZINE_PAGE_ASPECT_RATIO_CLASS = "aspect-[33/47]";
const MAGAZINE_PAGE_RADIUS_CLASS = "rounded-xl md:rounded-2xl";

function getReaderVerticalPaddingRem(
  isFullscreen: boolean,
  viewportWidth: number,
): number {
  if (isFullscreen) {
    if (viewportWidth >= 1024) return 3.5;
    if (viewportWidth >= 768) return 3;
    return 2.5;
  }

  if (viewportWidth >= 1024) return 7;
  if (viewportWidth >= 768) return 4;
  return 3.5;
}

function getFrameMaxWidthRem(
  variant: "single" | "spread",
  isFullscreen: boolean,
  viewportWidth: number,
): number {
  if (variant === "single") {
    if (isFullscreen) {
      return viewportWidth >= 1024 ? 56 : 48;
    }

    return 42;
  }

  if (isFullscreen) {
    return viewportWidth >= 1024 ? 38 : 33;
  }

  if (viewportWidth >= 1024) return 28;
  if (viewportWidth >= 768) return 32;
  return 30;
}

function getReaderZoomScale(viewportWidth: number): number {
  if (viewportWidth >= 1024) {
    return DESKTOP_READER_ZOOM_SCALE;
  }

  if (viewportWidth < 768) {
    return MOBILE_READER_ZOOM_SCALE;
  }

  return 1;
}

function getPageTransitionClass(direction: PageMoveDirection): string {
  if (direction === "next") return "reader-page-transition-next";
  if (direction === "prev") return "reader-page-transition-prev";
  return "reader-page-transition-idle";
}

export function MagazineReader({ magazine }: MagazineReaderProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [pageDirection, setPageDirection] = useState<PageMoveDirection>("idle");
  const [navigationTick, setNavigationTick] = useState(0);
  const [imageStatusByUrl, setImageStatusByUrl] = useState<
    Record<string, ImageLoadState>
  >({});
  const [touchStart, setTouchStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const readerRootRef = useRef<HTMLDivElement | null>(null);
  const controlsHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const suppressTapToggleRef = useRef(false);
  const suppressNextSurfaceClickRef = useRef(false);
  const suppressNextSurfaceClickTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const isMultiTouchGestureRef = useRef(false);
  const lastTrackpadNavAtRef = useRef(0);
  const isMountedRef = useRef(false);
  const imagePreloadPromisesRef = useRef<Map<string, Promise<void>>>(new Map());

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
  const spreadCount =
    maxPage === 0 ? 0 : 1 + Math.ceil(Math.max(0, maxPage - 1) / 2);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const setImageStatus = useCallback((url: string, status: ImageLoadState) => {
    if (!url || !isMountedRef.current) {
      return;
    }

    setImageStatusByUrl((prev) => {
      if (prev[url] === status) {
        return prev;
      }

      return {
        ...prev,
        [url]: status,
      };
    });
  }, []);

  const preloadImage = useCallback(
    (url: string | null | undefined): Promise<void> => {
      if (!url || typeof window === "undefined") {
        return Promise.resolve();
      }

      if (imageStatusByUrl[url] === "loaded") {
        return Promise.resolve();
      }

      const pendingPromise = imagePreloadPromisesRef.current.get(url);
      if (pendingPromise) {
        return pendingPromise;
      }

      if (!imageStatusByUrl[url]) {
        setImageStatus(url, "loading");
      }

      const preloadPromise = new Promise<void>((resolve, reject) => {
        const preloadTarget = new Image();

        const clearHandlers = () => {
          preloadTarget.onload = null;
          preloadTarget.onerror = null;
        };

        preloadTarget.onload = () => {
          clearHandlers();
          setImageStatus(url, "loaded");
          resolve();
        };

        preloadTarget.onerror = () => {
          clearHandlers();
          setImageStatus(url, "error");
          reject(new Error("Failed to preload magazine page image"));
        };

        preloadTarget.decoding = "async";
        preloadTarget.src = url;

        if (preloadTarget.complete && preloadTarget.naturalWidth > 0) {
          clearHandlers();
          setImageStatus(url, "loaded");
          resolve();
        }
      }).finally(() => {
        imagePreloadPromisesRef.current.delete(url);
      });

      imagePreloadPromisesRef.current.set(url, preloadPromise);
      return preloadPromise;
    },
    [imageStatusByUrl, setImageStatus],
  );

  const getPageUrlsForIndex = useCallback(
    (index: number): string[] => {
      if (index < 0) {
        return [];
      }

      if (isSpreadView) {
        if (index === 0) {
          const coverUrl = pages[0]?.imageUrl;
          return coverUrl ? [coverUrl] : [];
        }

        const rightUrl = pages[index * 2 - 1]?.imageUrl ?? null;
        const leftUrl = pages[index * 2]?.imageUrl ?? null;
        return [leftUrl, rightUrl].filter((url): url is string => Boolean(url));
      }

      const singleUrl = pages[index]?.imageUrl;
      return singleUrl ? [singleUrl] : [];
    },
    [isSpreadView, pages],
  );

  useEffect(() => {
    if (maxPage === 0) {
      return;
    }

    const maxIndex = isSpreadView ? spreadCount - 1 : maxPage - 1;
    if (maxIndex < 0) {
      return;
    }

    const preloadTargets = new Set<string>();
    const collectTargets = (index: number) => {
      if (index < 0 || index > maxIndex) {
        return;
      }

      getPageUrlsForIndex(index).forEach((url) => preloadTargets.add(url));
    };

    collectTargets(currentPage);
    collectTargets(currentPage + 1);
    collectTargets(currentPage - 1);

    preloadTargets.forEach((url) => {
      void preloadImage(url);
    });
  }, [
    currentPage,
    getPageUrlsForIndex,
    isSpreadView,
    maxPage,
    preloadImage,
    spreadCount,
  ]);

  useEffect(() => {
    const maxIndex = isSpreadView ? spreadCount - 1 : maxPage - 1;
    if (maxIndex < 0) {
      if (currentPage !== 0) {
        setCurrentPage(0);
      }
      return;
    }

    if (currentPage > maxIndex) {
      setCurrentPage(maxIndex);
    }
  }, [currentPage, isSpreadView, maxPage, spreadCount]);

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

  const clearSyntheticClickSuppression = useCallback(() => {
    if (suppressNextSurfaceClickTimeoutRef.current) {
      clearTimeout(suppressNextSurfaceClickTimeoutRef.current);
      suppressNextSurfaceClickTimeoutRef.current = null;
    }
  }, []);

  const armSyntheticClickSuppression = useCallback(() => {
    suppressNextSurfaceClickRef.current = true;
    clearSyntheticClickSuppression();
    suppressNextSurfaceClickTimeoutRef.current = setTimeout(() => {
      suppressNextSurfaceClickRef.current = false;
      suppressNextSurfaceClickTimeoutRef.current = null;
    }, TOUCH_CLICK_SUPPRESS_WINDOW_MS);
  }, [clearSyntheticClickSuppression]);

  const handleBack = useCallback(async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore fullscreen exit errors and continue navigation.
      }
    }

    router.push(`/archive/${magazine.slug}`, { scroll: true });
  }, [magazine.slug, router]);

  useEffect(() => {
    const updateViewportSize = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
    };

    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    return () => window.removeEventListener("resize", updateViewportSize);
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
      clearSyntheticClickSuppression();
    };
  }, [
    armControlsAutoHide,
    clearControlsHideTimeout,
    clearSyntheticClickSuppression,
  ]);

  const navigateToPage = useCallback(
    (targetIndex: number, direction: Exclude<PageMoveDirection, "idle">) => {
      const maxIndex = isSpreadView ? spreadCount - 1 : maxPage - 1;

      if (maxIndex < 0) {
        return;
      }

      const boundedTarget = Math.min(Math.max(targetIndex, 0), maxIndex);
      if (boundedTarget === currentPage) {
        return;
      }

      setCurrentPage(boundedTarget);
      setPageDirection(direction);
      setNavigationTick((prev) => prev + 1);
      setShowControls(true);
      armControlsAutoHide();
    },
    [armControlsAutoHide, currentPage, isSpreadView, maxPage, spreadCount],
  );

  const nextPage = useCallback(() => {
    navigateToPage(currentPage + 1, "next");
  }, [currentPage, navigateToPage]);

  const prevPage = useCallback(() => {
    navigateToPage(currentPage - 1, "prev");
  }, [currentPage, navigateToPage]);

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
    if (
      !root ||
      viewportWidth < 1024 ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
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
      if (suppressNextSurfaceClickRef.current) {
        suppressNextSurfaceClickRef.current = false;
        return;
      }

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
    if (e.touches.length !== 1) {
      isMultiTouchGestureRef.current = true;
      setTouchStart(null);
      return;
    }

    const firstTouch = e.touches[0];
    setTouchStart({ x: firstTouch.clientX, y: firstTouch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 1) {
      isMultiTouchGestureRef.current = true;
      setTouchStart(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    armSyntheticClickSuppression();

    if (isMultiTouchGestureRef.current) {
      if (e.touches.length === 0) {
        isMultiTouchGestureRef.current = false;
      }
      setTouchStart(null);
      return;
    }

    if (touchStart === null) return;

    const changedTouch = e.changedTouches[0];
    const diffX = touchStart.x - changedTouch.clientX;
    const diffY = touchStart.y - changedTouch.clientY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);
    const swipeThreshold =
      viewportWidth < 1024 ? MOBILE_SWIPE_THRESHOLD : SWIPE_THRESHOLD;
    const isHorizontalSwipe =
      absDiffX > swipeThreshold &&
      absDiffX > absDiffY * HORIZONTAL_SWIPE_DOMINANCE_RATIO;
    const isTapLikeMovement =
      absDiffX <= TAP_MOVEMENT_TOLERANCE && absDiffY <= TAP_MOVEMENT_TOLERANCE;
    const target = e.target as HTMLElement | null;
    const touchedInteractiveElement = Boolean(
      target?.closest("button, a, input, textarea, select, label"),
    );

    if (isHorizontalSwipe) {
      suppressTapToggleRef.current = true;
      window.setTimeout(() => {
        suppressTapToggleRef.current = false;
      }, SWIPE_TAP_SUPPRESS_MS);

      if (diffX > 0) {
        prevPage();
      } else {
        nextPage();
      }

      setShowControls(true);
      armControlsAutoHide();
    } else if (!touchedInteractiveElement && isTapLikeMovement) {
      toggleControlsVisibility();
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
  const spreadRightIndex = isSpreadView
    ? currentPage === 0
      ? 0
      : currentPage * 2 - 1
    : -1;
  const spreadLeftIndex =
    isSpreadView && currentPage > 0 ? spreadRightIndex + 1 : -1;
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
  const pageTransitionClass = getPageTransitionClass(pageDirection);

  const renderPageFrame = useCallback(
    (
      page: (typeof pages)[number] | null,
      variant: "single" | "spread",
    ): React.ReactNode => {
      if (!page?.imageUrl) {
        return null;
      }

      const imageUrl = page.imageUrl;
      const imageStatus = imageStatusByUrl[imageUrl] ?? "loading";

      const frameMaxWidthRem = getFrameMaxWidthRem(
        variant,
        isFullscreen,
        viewportWidth,
      );
      const frameMaxWidthPx = frameMaxWidthRem * 16;
      const verticalPaddingRem = getReaderVerticalPaddingRem(
        isFullscreen,
        viewportWidth,
      );
      const availableHeightPx = Math.max(
        0,
        viewportHeight - verticalPaddingRem * 16,
      );
      const widthFromHeightPx = availableHeightPx * MAGAZINE_PAGE_ASPECT_RATIO;
      const zoomScale = getReaderZoomScale(viewportWidth);
      const frameWidthPx =
        viewportHeight > 0
          ? Math.min(frameMaxWidthPx, widthFromHeightPx) * zoomScale
          : frameMaxWidthPx * zoomScale;

      const frameShapeClassName = `${MAGAZINE_PAGE_ASPECT_RATIO_CLASS} ${MAGAZINE_PAGE_RADIUS_CLASS}`;
      const frameStyle = {
        width: `${Math.max(0, frameWidthPx)}px`,
        maxWidth: "100%",
      };
      const frameKey = `${variant}-${page.id ?? page.number}-${navigationTick}`;

      if (imageStatus === "loaded") {
        return (
          <div
            key={`${frameKey}-image`}
            className={`${pageTransitionClass} ${frameShapeClassName} overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_24px_56px_rgba(0,0,0,0.72),0_10px_24px_rgba(255,255,255,0.08)]`}
            style={frameStyle}
          >
            <img
              src={imageUrl}
              alt={`Page ${page.number}`}
              draggable={false}
              onLoad={() => setImageStatus(imageUrl, "loaded")}
              onError={() => setImageStatus(imageUrl, "error")}
              className="reader-page-image h-full w-full object-contain"
            />
          </div>
        );
      }

      if (imageStatus === "error") {
        return (
          <div
            key={`${frameKey}-error`}
            className={`${pageTransitionClass} reader-page-fallback ${frameShapeClassName}`}
            style={frameStyle}
          >
            <div className="h-12 w-12 rounded-full border border-white/30 bg-white/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white/80"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
        );
      }

      return (
        <div
          key={`${frameKey}-skeleton`}
          className={`${pageTransitionClass} reader-page-skeleton ${frameShapeClassName}`}
          style={frameStyle}
        />
      );
    },
    [
      imageStatusByUrl,
      isFullscreen,
      navigationTick,
      pageTransitionClass,
      setImageStatus,
      viewportHeight,
      viewportWidth,
    ],
  );

  return (
    <div
      ref={readerRootRef}
      className="fixed inset-0 z-[70] overflow-hidden bg-deep-black select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleSurfaceTap}
      onDoubleClick={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <header
        className={`absolute inset-x-0 top-0 z-20 transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gradient-to-b from-deep-black/95 via-deep-black/75 to-transparent">
          <div className="container relative py-3 md:py-4 flex items-center justify-between gap-3">
            <div className="shrink-0 flex items-center justify-start z-[1]">
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
            </div>

            <div
              className="pointer-events-none absolute left-1/2 top-1/2"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <div
                className="flex flex-col items-center text-center w-[min(62vw,34rem)] sm:w-[min(58vw,34rem)] md:w-[min(52vw,36rem)]"
                style={{ direction: "rtl", textAlign: "center" }}
              >
                <h1 className="text-white font-bold text-sm md:text-base text-center leading-tight w-full">
                  {magazine.title}
                </h1>
                <div
                  className="text-white/78 text-xs md:text-sm leading-tight mt-0.5 w-full"
                  style={{ textAlign: "center" }}
                >
                  {magazine.subtitle}
                </div>
                <div
                  className="text-white/74 text-[11px] md:text-xs leading-tight mt-0.5 w-full"
                  style={{ textAlign: "center" }}
                >
                  {magazine.publishedAt}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 md:gap-2 justify-end z-[1]">
              {pdfDownloadUrl && (
                <>
                  <button
                    onClick={handlePdfDownload}
                    disabled={isDownloading}
                    className="md:hidden p-2 text-white/80 hover:text-white transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    title={isDownloading ? "در حال دانلود" : "دانلود PDF"}
                    aria-label={isDownloading ? "در حال دانلود" : "دانلود PDF"}
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
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                  </button>

                  <button
                    onClick={handlePdfDownload}
                    disabled={isDownloading}
                    className="hidden md:inline-flex px-3 py-2 rounded-full text-xs md:text-sm bg-white text-deep-black font-semibold hover:bg-white/90 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDownloading ? "در حال دانلود..." : "دانلود PDF"}
                  </button>
                </>
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

      <main
        className={`relative h-full w-full flex items-center justify-center px-2 md:px-4 ${
          isFullscreen
            ? "pt-5 md:pt-6 lg:pt-7 pb-5 md:pb-6 lg:pb-7"
            : "pt-7 md:pt-8 pb-7 md:pb-8 lg:pt-14 lg:pb-14"
        }`}
      >
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
              currentPage === 0 ? (
                <div
                  className={`w-full h-full max-h-full flex items-center justify-center ${
                    isFullscreen ? "max-w-[min(96vw,96rem)]" : "max-w-6xl"
                  }`}
                >
                  <div className="h-full min-h-0 w-1/2 px-[0.225rem] md:px-[0.3rem] flex items-center justify-center">
                    {renderPageFrame(spreadRightPage, "spread")}
                  </div>
                </div>
              ) : (
                <div
                  className={`grid grid-cols-2 gap-[0.45rem] md:gap-[0.6rem] w-full h-full max-h-full ${
                    isFullscreen ? "max-w-[min(96vw,96rem)]" : "max-w-6xl"
                  }`}
                  style={{ direction: "ltr" }}
                >
                  <div className="h-full min-h-0 flex items-center justify-end">
                    {renderPageFrame(spreadLeftPage, "spread")}
                  </div>
                  <div className="h-full min-h-0 flex items-center justify-start">
                    {renderPageFrame(spreadRightPage, "spread")}
                  </div>
                </div>
              )
            ) : (
              <div
                className={`w-full h-full max-h-full flex items-center justify-center ${
                  isFullscreen ? "max-w-[min(96vw,72rem)]" : "max-w-4xl"
                }`}
              >
                {renderPageFrame(singlePage, "single")}
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
