"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { usePwa } from "@/components/pwa-provider";

const DISMISS_KEY = "futsal-install-banner-dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function InstallBanner() {
  const { isInstallable, isInstalled, installApp } = usePwa();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed within 7 days
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      if (elapsed < DISMISS_DURATION_MS) {
        setDismissed(true);
        return;
      }
      // Expired — remove and show again
      localStorage.removeItem(DISMISS_KEY);
    }
    setDismissed(false);
  }, []);

  // Animate in after mount
  useEffect(() => {
    if (!dismissed && isInstallable && !isInstalled) {
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [dismissed, isInstallable, isInstalled]);

  // Don't render if installed (PWA), dismissed, or not installable
  if (isInstalled || dismissed || !isInstallable) return null;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      setDismissed(true);
    }, 300);
  };

  return (
    <div
      className={`
        mx-auto max-w-2xl px-4 transition-all duration-300 ease-out
        ${visible ? "opacity-100 translate-y-0 mb-3" : "opacity-0 -translate-y-2 mb-0 h-0 overflow-hidden"}
      `}
    >
      <div className="relative flex items-center gap-3 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/[0.08] to-indigo-500/[0.08] px-4 py-3 backdrop-blur-sm">
        {/* Icon */}
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
          <Download className="size-4 text-blue-400" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Install Futsal Manager</p>
          <p className="text-[11px] text-slate-400 truncate">Add to home screen for faster access & offline support</p>
        </div>

        {/* Install Button */}
        <button
          onClick={installApp}
          className="shrink-0 rounded-lg bg-blue-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-400 active:scale-95 cursor-pointer"
        >
          Install
        </button>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="Dismiss for 7 days"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
