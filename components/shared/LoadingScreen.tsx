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
    }, 2000);

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#C41E3A" }}
    >
      {/* Logo from PWA icons */}
      <div className="mb-8">
        <Image
          src="/assets/icons/icon-512x512.png"
          alt="Dot Mag"
          width={160}
          height={160}
          priority
          className="w-32 h-32 md:w-40 md:h-40"
        />
      </div>

      {/* Brand Text */}
      <div
        className="text-xl md:text-2xl font-bold tracking-wide"
        style={{ color: "#1A1A1A" }}
      >
        [dot • mag]
      </div>
    </div>
  );
}
