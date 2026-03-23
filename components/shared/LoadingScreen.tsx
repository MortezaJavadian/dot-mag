"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface LoadingScreenProps {
  onLoadingComplete?: () => void;
}

export function LoadingScreen({ onLoadingComplete }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => {
        setIsVisible(false);
        onLoadingComplete?.();
      }, 500);
    }, 1000);

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center min-h-screen transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#D73B3A" }}
    >
      {/* Logo from PWA icons */}
      <div className="mb-3">
        <Image
          src="/assets/icons/icon-512x512.png"
          alt="Dot Mag"
          width={200}
          height={200}
          priority
          className="w-40 h-40 md:w-50 md:h-50"
        />
      </div>

      {/* Brand Text */}
      <div
        className="text-2xl md:text-4xl font-bold tracking-wide"
        style={{ color: "#1A1A1A" }}
      >
        [dot ▪ mag]
      </div>
    </div>
  );
}
