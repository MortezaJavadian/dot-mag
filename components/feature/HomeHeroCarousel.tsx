"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { HomeHeroEffectPreset } from "@/lib/homeHero";

type HeroCta = {
  href: string;
  label: string;
};

export type HomeHeroCarouselSlide = {
  id: string;
  badgeText: string;
  safeHeroHtml: string;
  frameImage: string | null;
  backgroundMobileImage: string | null;
  backgroundDesktopImage: string | null;
  effectPreset: HomeHeroEffectPreset;
  cta: HeroCta | null;
};

type HomeHeroCarouselProps = {
  slides: HomeHeroCarouselSlide[];
  autoRotateSeconds: number;
};

function hasBackground(
  slide: HomeHeroCarouselSlide,
): slide is HomeHeroCarouselSlide & {
  backgroundMobileImage: string;
  backgroundDesktopImage: string;
} {
  return Boolean(slide.backgroundMobileImage && slide.backgroundDesktopImage);
}

function getEffectClassName(effectPreset: HomeHeroEffectPreset): string {
  if (effectPreset === "soft-darken") {
    return "hero-bg-effect-soft-darken";
  }

  if (effectPreset === "soft-lighten") {
    return "hero-bg-effect-soft-lighten";
  }

  if (effectPreset === "warm-film") {
    return "hero-bg-effect-warm-film";
  }

  if (effectPreset === "subtle-blur") {
    return "hero-bg-effect-subtle-blur";
  }

  return "hero-bg-effect-none";
}

function normalizeIndex(value: number, length: number): number {
  if (length <= 0) return 0;
  if (value < 0) return (value % length) + length;
  return value % length;
}

export default function HomeHeroCarousel({
  slides,
  autoRotateSeconds,
}: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [touchPaused, setTouchPaused] = useState(false);
  const [focusPaused, setFocusPaused] = useState(false);
  const [interactionTick, setInteractionTick] = useState(0);

  const safeActiveIndex = normalizeIndex(activeIndex, slides.length);

  const shouldAutoRotate =
    slides.length > 1 &&
    autoRotateSeconds > 0 &&
    !hoverPaused &&
    !touchPaused &&
    !focusPaused;

  useEffect(() => {
    if (!shouldAutoRotate) return;

    const delayMs = Math.max(1000, Math.floor(autoRotateSeconds * 1000));
    const timer = window.setTimeout(() => {
      setActiveIndex((prev) => normalizeIndex(prev + 1, slides.length));
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    safeActiveIndex,
    autoRotateSeconds,
    interactionTick,
    shouldAutoRotate,
    slides.length,
  ]);

  const slideStyle = useMemo(
    () => ({ transform: `translateX(-${safeActiveIndex * 100}%)` }),
    [safeActiveIndex],
  );

  const goToSlide = (index: number) => {
    setActiveIndex(normalizeIndex(index, slides.length));
    setInteractionTick((tick) => tick + 1);
  };

  const goNext = () => {
    goToSlide(safeActiveIndex + 1);
  };

  const goPrev = () => {
    goToSlide(safeActiveIndex - 1);
  };

  return (
    <section
      className="relative min-h-[90vh] flex items-center bg-gradient-to-bl from-cream/30 via-background to-background"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onTouchStart={() => setTouchPaused(true)}
      onTouchEnd={() => setTouchPaused(false)}
      onTouchCancel={() => setTouchPaused(false)}
      onFocusCapture={() => setFocusPaused(true)}
      onBlurCapture={(event) => {
        const relatedTarget = event.relatedTarget;
        if (!relatedTarget || !event.currentTarget.contains(relatedTarget)) {
          setFocusPaused(false);
        }
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-forest/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 py-8 lg:py-10">
        <div className="relative overflow-hidden rounded-2xl hero-carousel-shell">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={slideStyle}
          >
            {slides.map((slide, index) => {
              return (
                <div
                  key={slide.id}
                  className="relative w-full shrink-0 px-1 sm:px-2 py-2"
                  aria-hidden={index !== safeActiveIndex}
                >
                  {hasBackground(slide) && (
                    <div className="absolute inset-0 rounded-[1.25rem] overflow-hidden pointer-events-none">
                      <picture>
                        <source
                          media="(min-width: 1024px)"
                          srcSet={slide.backgroundDesktopImage}
                        />
                        <img
                          src={slide.backgroundMobileImage}
                          alt=""
                          aria-hidden="true"
                          className="hero-bg-media"
                        />
                      </picture>
                      <div
                        className={`hero-bg-effect ${getEffectClassName(
                          slide.effectPreset,
                        )}`}
                      />
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:gap-5 lg:[direction:ltr]">
                    <div className="order-1 lg:order-1 animate-fade-in">
                      <div className="mx-auto my-[0.375rem] lg:my-2 w-full max-w-sm sm:max-w-md lg:max-w-none lg:w-[80%]">
                        <div className="image-frame-shell">
                          <div className="image-frame-inner">
                            {slide.frameImage ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={slide.frameImage}
                                alt="تصویر هدر خانه"
                                className="image-frame-media object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="min-h-[280px] sm:min-h-[340px] lg:min-h-[460px] flex items-center justify-center bg-cream text-foreground-secondary px-6 text-center">
                                تصویر هدر از پنل ادمین قابل تنظیم است
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="order-2 lg:order-2 animate-slide-up text-right lg:justify-self-end lg:w-full lg:max-w-none lg:pr-[2.25rem]">
                      {slide.badgeText && (
                        <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6">
                          {slide.badgeText}
                        </span>
                      )}

                      <div
                        className="max-w-2xl lg:ml-auto [&_h1]:!text-right [&_h1]:text-4xl md:[&_h1]:text-5xl lg:[&_h1]:text-6xl [&_h1]:font-black [&_h1]:leading-tight [&_h1]:mb-6 [&_p]:!text-right [&_p]:[unicode-bidi:plaintext] [&_p]:text-lg md:[&_p]:text-xl [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_.hero-line-two-strong]:block [&_.hero-line-two-strong]:font-black [&_.hero-line-two-strong]:!text-right [&_.hero-line-two-normal]:block [&_.hero-line-two-normal]:text-lg md:[&_.hero-line-two-normal]:text-xl [&_.hero-line-two-normal]:font-normal [&_.hero-line-two-normal]:leading-relaxed [&_.hero-line-two-normal]:!text-right"
                        dangerouslySetInnerHTML={{ __html: slide.safeHeroHtml }}
                      />

                      {slide.cta && (
                        <div className="mt-8 mb-8 lg:mb-0">
                          <Link
                            href={slide.cta.href}
                            scroll={true}
                            className="inline-flex flex-row-reverse items-center gap-3 lg:flex-row px-8 py-4 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all hover:scale-105"
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
                              className="rotate-180 shrink-0"
                            >
                              <path d="m9 18 6-6-6-6" />
                            </svg>
                            <span>{slide.cta.label}</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="mt-5 flex items-center justify-center gap-3"
          role="group"
          aria-label="کنترل بنرهای خانه"
        >
          <button
            type="button"
            onClick={goPrev}
            className="hero-carousel-nav-btn"
            aria-label="بنر قبلی"
          >
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
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <div
            className="flex items-center gap-2"
            role="tablist"
            aria-label="انتخاب بنر خانه"
          >
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goToSlide(index)}
                className={`hero-carousel-dot ${
                  index === safeActiveIndex ? "hero-carousel-dot-active" : ""
                }`}
                aria-label={`بنر ${index + 1}`}
                aria-selected={index === safeActiveIndex}
                role="tab"
              />
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="hero-carousel-nav-btn"
            aria-label="بنر بعدی"
          >
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
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
