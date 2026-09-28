"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  installApp: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  installApp: async () => {},
});

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Service Worker registration
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => {
            console.warn("Service Worker registration failed:", err);
          });
      });
    }

    // 2. Check if already installed / standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    // 3. Listen for installability prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
      }
    } catch (err) {
      console.warn("Error during app installation:", err);
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return (
    <PwaContext.Provider
      value={{
        isInstallable: isInstallable && !isInstalled,
        isInstalled,
        installApp,
      }}
    >
      {children}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  return useContext(PwaContext);
}

export function InstallButton({ className = "" }: { className?: string }) {
  const { isInstallable, installApp } = usePwa();

  if (!isInstallable) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={installApp}
      className={`inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/25 hover:border-blue-400 hover:text-blue-300 transition-all duration-200 cursor-pointer shadow-sm animate-in fade-in zoom-in-95 ${className}`}
      title="Install Futsal Manager as an app"
      aria-label="Install Futsal Manager as an app"
    >
      <Download className="size-3" />
      <span>Install App</span>
    </button>
  );
}
