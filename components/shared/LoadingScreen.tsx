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
    // Show loading screen with animation
    const timer = setTimeout(() => {
      setIsFading(true);
      setTimeout(() => {
        setIsVisible(false);
        onLoadingComplete?.();
      }, 1000);
    }, 2000);

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
      <div className="-mt-20 flex flex-col items-center">
        <Image
          src="/assets/images/loading-logo-1024x1024.png"
          alt="Dot Mag"
          width={200}
          height={200}
          priority
          className="w-40 h-40 md:w-40 md:h-40"
        />

        {/* Three-dot loader animation */}
        <div className="mt-8 flex gap-2">
          <span
            className="w-2 h-2 bg-black rounded-full"
            style={{
              animation: "bounce 1.2s infinite",
              animationDelay: "0s",
            }}
          />
          <span
            className="w-2 h-2 bg-black rounded-full"
            style={{
              animation: "bounce 1.2s infinite",
              animationDelay: "0.2s",
            }}
          />
          <span
            className="w-2 h-2 bg-black rounded-full"
            style={{
              animation: "bounce 1.2s infinite",
              animationDelay: "0.4s",
            }}
          />
        </div>
      </div>
    </div>
  );
}
