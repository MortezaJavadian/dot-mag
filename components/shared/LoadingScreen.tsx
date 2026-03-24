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
    // Detect if running in PWA standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    // Check if this is the first app launch in this session
    const hasLaunchedSession = sessionStorage.getItem("dot_pwa_launched");

    // If PWA first launch, skip React loading (system splash already shown)
    if (isStandalone && !hasLaunchedSession) {
      sessionStorage.setItem("dot_pwa_launched", "true");
      setIsVisible(false);
      onLoadingComplete?.();
      return;
    }

    // Web browser or PWA reload: show React loading with animation
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
      className={`fixed inset-0 z-[9999] flex items-center justify-center min-h-screen transition-opacity duration-500 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: "#D73B3A" }}
    >
      <Image
        src="/assets/images/loading-logo-1024x1024.png"
        alt="Dot Mag"
        width={200}
        height={200}
        priority
        className="w-40 h-40 md:w-50 md:h-50"
      />
    </div>
  );
}
