"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LoadingScreen } from "@/components/shared/LoadingScreen";

interface AppWrapperProps {
  children: React.ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const pathname = usePathname();
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const hasReloadedForUpdateRef = useRef(false);

  const handleApplyUpdate = useCallback(() => {
    const waitingWorker = waitingWorkerRef.current;
    if (!waitingWorker) {
      return;
    }

    setIsApplyingUpdate(true);
    waitingWorker.postMessage({ type: "SKIP_WAITING" });

    window.setTimeout(() => {
      if (!hasReloadedForUpdateRef.current) {
        window.location.reload();
      }
    }, 4000);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    let isDisposed = false;

    const onControllerChange = () => {
      if (hasReloadedForUpdateRef.current) {
        return;
      }

      hasReloadedForUpdateRef.current = true;
      window.location.reload();
    };

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        const setWaitingWorker = (worker: ServiceWorker | null) => {
          if (isDisposed || !worker) {
            return;
          }

          waitingWorkerRef.current = worker;
          setIsUpdateAvailable(true);
        };

        setWaitingWorker(registration.waiting);

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) {
            return;
          }

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setWaitingWorker(registration.waiting ?? installingWorker);
            }
          });
        });

        await registration.update();
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );
    registerServiceWorker();

    return () => {
      isDisposed = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  return (
    <>
      {isLoading && (
        <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />
      )}
      <div
        className={`transition-opacity duration-300 ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
      >
        {children}
      </div>

      {isUpdateAvailable && (
        <div className="fixed inset-0 z-[140] p-4 sm:p-6 flex items-end justify-center sm:items-center">
          <div className="absolute inset-0 bg-deep-black/68 backdrop-blur-[2px]" />
          <div className="relative w-full max-w-lg rounded-3xl border border-white/20 bg-deep-black/94 p-5 sm:p-6 shadow-[0_28px_72px_rgba(0,0,0,0.78)] ring-1 ring-primary/45">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/18 border border-primary/45 flex items-center justify-center text-primary font-bold">
                !
              </div>
              <p className="text-base sm:text-lg font-bold text-white">
                New version available
              </p>
            </div>

            <p className="mt-3 text-sm text-white/82 leading-6">
              A new build is ready and recommended for the latest fixes. Tap the
              update button to refresh now.
            </p>

            <button
              type="button"
              onClick={handleApplyUpdate}
              disabled={isApplyingUpdate}
              className="mt-5 w-full rounded-2xl bg-white text-deep-black px-4 py-3 text-base font-semibold transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isApplyingUpdate ? "Updating..." : "Update now"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
