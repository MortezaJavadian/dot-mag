"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ScrollToTargetFloatingButtonProps {
  targetId: string;
  buttonLabel: string;
  scrollAlignment?: "center" | "top";
  scrollDistanceScale?: number;
  viewportTopOffset?: number;
  fullyVisibleThreshold?: number;
}

const INTERSECTION_THRESHOLDS = [0, 0.25, 0.5, 0.75, 0.95, 1];
const SCROLL_PIXELS_PER_FRAME = 38;
const FRAME_MS = 1000 / 60;

export function ScrollToTargetFloatingButton({
  targetId,
  buttonLabel,
  scrollAlignment = "center",
  scrollDistanceScale = 1,
  viewportTopOffset = 84,
  fullyVisibleThreshold = 0.98,
}: ScrollToTargetFloatingButtonProps) {
  const [shouldShow, setShouldShow] = useState(false);
  const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const scrollAnimationFrameRef = useRef<number | null>(null);

  const stopAnimatedScroll = useCallback(() => {
    if (scrollAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
  }, []);

  const evaluateVisibility = useCallback(
    (rect: DOMRectReadOnly, ratio: number) => {
      const targetIsBelowHeader = rect.top > viewportTopOffset;
      const targetFullyVisible = ratio >= fullyVisibleThreshold;
      setShouldShow(targetIsBelowHeader && !targetFullyVisible);
    },
    [fullyVisibleThreshold, viewportTopOffset],
  );

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) {
      setShouldShow(false);
      return;
    }

    const getIntersectionRatio = (): number => {
      const rect = target.getBoundingClientRect();
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth;

      const overlapHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0),
      );
      const overlapWidth = Math.max(
        0,
        Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0),
      );

      const targetArea = Math.max(rect.width * rect.height, 1);
      const overlapArea = overlapHeight * overlapWidth;
      return overlapArea / targetArea;
    };

    evaluateVisibility(target.getBoundingClientRect(), getIntersectionRatio());

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        evaluateVisibility(entry.boundingClientRect, entry.intersectionRatio);
      },
      {
        threshold: INTERSECTION_THRESHOLDS,
      },
    );

    observer.observe(target);

    const handleResize = () => {
      evaluateVisibility(
        target.getBoundingClientRect(),
        getIntersectionRatio(),
      );
    };

    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [evaluateVisibility, targetId]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }

      stopAnimatedScroll();
    };
  }, [stopAnimatedScroll]);

  const animateWindowScrollTo = useCallback(
    (nextTop: number): number => {
      stopAnimatedScroll();

      const initialDistance = nextTop - window.scrollY;

      if (Math.abs(initialDistance) < 1) {
        window.scrollTo(0, nextTop);
        return 0;
      }

      const estimatedDurationMs = Math.round(
        Math.ceil(Math.abs(initialDistance) / SCROLL_PIXELS_PER_FRAME) *
          FRAME_MS,
      );

      const step = () => {
        const currentTop = window.scrollY;
        const remaining = nextTop - currentTop;

        if (Math.abs(remaining) <= SCROLL_PIXELS_PER_FRAME) {
          window.scrollTo(0, nextTop);
          scrollAnimationFrameRef.current = null;
          return;
        }

        window.scrollTo(
          0,
          currentTop + Math.sign(remaining) * SCROLL_PIXELS_PER_FRAME,
        );
        scrollAnimationFrameRef.current = window.requestAnimationFrame(step);
      };

      scrollAnimationFrameRef.current = window.requestAnimationFrame(step);
      return estimatedDurationMs;
    },
    [stopAnimatedScroll],
  );

  const handleScrollToTarget = () => {
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    const rect = target.getBoundingClientRect();
    const startTop = window.scrollY;
    const targetTop = startTop + rect.top;
    const destinationTop =
      scrollAlignment === "top"
        ? Math.max(0, targetTop - viewportTopOffset)
        : Math.max(0, targetTop + rect.height / 2 - window.innerHeight / 2);
    const normalizedScale = Math.min(Math.max(scrollDistanceScale, 0), 1);
    const nextTop = Math.max(
      0,
      startTop + (destinationTop - startTop) * normalizedScale,
    );

    setIsProgrammaticScroll(true);
    const animationDurationMs = animateWindowScrollTo(nextTop);

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(
      () => {
        setIsProgrammaticScroll(false);
      },
      Math.max(animationDurationMs + 120, 360),
    );
  };

  const isVisible = shouldShow && !isProgrammaticScroll;

  return (
    <div
      className={`fixed left-1/2 bottom-5 z-40 w-[min(calc(100%-1.25rem),25.5rem)] -translate-x-1/2 transition-all duration-300 md:bottom-7 ${
        isVisible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <button
        type="button"
        onClick={handleScrollToTarget}
        aria-controls={targetId}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-card-border bg-card-bg/95 px-4 py-3 text-sm font-bold text-foreground shadow-[0_18px_48px_rgba(0,0,0,0.24)] backdrop-blur-sm transition-colors hover:bg-card-bg md:text-base"
      >
        <span>{buttonLabel}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-200 group-hover:translate-y-0.5"
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="m19 12-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
