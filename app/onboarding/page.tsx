"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Type, Link2, FileText, ArrowRight, Loader2 } from "lucide-react";
import { createTenant } from "@/lib/actions";

export default function OnboardingPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createTenant(formData);
      if (result.success) {
        router.push("/");
      } else {
        setError(result.error || "Something went wrong.");
      }
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e17] px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg shadow-emerald-500/20">
            <svg className="size-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l2.5-3L14 12l-3.5 3z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Set Up Your Venue</h1>
          <p className="mt-2 text-sm text-slate-400">
            Tell us about your futsal court so players can find and book it.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.08] bg-[#111827]/80 p-6 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Venue Name */}
          <div className="mb-5">
            <label htmlFor="venueName" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Type className="size-3.5 text-slate-500" />
              Venue Name <span className="text-red-400">*</span>
            </label>
            <input
              id="venueName"
              name="venueName"
              type="text"
              required
              placeholder="e.g. M5 Arena Futsal Ground"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
              onChange={(e) => {
                const auto = generateSlug(e.target.value);
                if (!slug || slug === generateSlug(e.target.value.slice(0, -1)) || slug === "") {
                  setSlug(auto);
                }
              }}
            />
          </div>

          {/* URL Slug */}
          <div className="mb-5">
            <label htmlFor="slug" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Link2 className="size-3.5 text-slate-500" />
              Booking URL <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/30 transition-all">
              <span className="px-3 text-sm text-slate-500 border-r border-white/10 py-3 bg-white/[0.02] whitespace-nowrap">
                /book/
              </span>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                placeholder="m5-arena"
                className="flex-1 bg-transparent px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">
              This is the link players will use to book. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          {/* Address */}
          <div className="mb-5">
            <label htmlFor="address" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
              <MapPin className="size-3.5 text-slate-500" />
              Address
            </label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="e.g. Mawlai Umshing-Umjapung Bye-pass road"
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300">
              <FileText className="size-3.5 text-slate-500" />
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="e.g. Professional indoor futsal court with floodlights, available 6 AM - 11 PM daily."
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Setting up...
              </>
            ) : (
              <>
                Continue to Dashboard
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
