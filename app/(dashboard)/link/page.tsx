"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  MapPin,
  FileText,
  Type,
  Loader2,
  Share2,
  ImagePlus,
  Trash2,
  Camera,
} from "lucide-react";
import { updateTenant, getGallery, updateGallery, type GalleryItem } from "@/lib/actions";

interface TenantInfo {
  slug: string;
  venueName: string;
  address: string;
  description?: string;
  logoUrl?: string;
  userName?: string;
  userImage?: string;
}

export default function LinkPage() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [fullLinkCopied, setFullLinkCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [venueName, setVenueName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  // Media state
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tenant/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.slug) {
          setTenant(d);
          setVenueName(d.venueName || "");
          setDescription(d.description || "");
          setAddress(d.address || "");
          setLogoUrl(d.logoUrl || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load gallery
    getGallery().then(setGallery).catch(() => {});
  }, []);

  const bookingUrl = tenant
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/book/${tenant.slug}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const copyFullLink = () => {
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setFullLinkCopied(true);
      setTimeout(() => setFullLinkCopied(false), 2000);
    });
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Book at ${tenant?.venueName}`,
          text: `Book your futsal slot at ${tenant?.venueName}`,
          url: bookingUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      copyLink();
    }
  };

  const handleSave = () => {
    setError(null);
    setSaveSuccess(false);

    const formData = new FormData();
    formData.set("venueName", venueName);
    formData.set("description", description);
    formData.set("address", address);

    startTransition(async () => {
      const result = await updateTenant(formData);
      if (result.success) {
        setSaveSuccess(true);
        // Update local tenant state
        setTenant((prev) => prev ? { ...prev, venueName, description, address } : prev);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(result.error || "Something went wrong.");
      }
    });
  };

  const hasChanges =
    tenant &&
    (venueName !== (tenant.venueName || "") ||
      description !== (tenant.description || "") ||
      address !== (tenant.address || ""));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e17] px-4">
        <div className="text-center">
          <p className="text-sm text-slate-400">No venue configured.</p>
          <p className="mt-1 text-xs text-slate-600">
            Complete onboarding first to get your booking link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e17] text-white pb-24">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Your Booking Link</h1>
          <p className="mt-1 text-sm text-slate-500">
            Share this link with players so they can book slots at your venue.
          </p>
        </div>

        {/* ── Booking Link Card ─────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-[#111827] to-blue-950/20 p-5 shadow-xl shadow-emerald-500/5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15">
              <Link2 className="size-4 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-emerald-300">
              Booking Link
            </span>
          </div>

          {/* Link Display */}
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3">
            <code className="flex-1 truncate text-sm font-medium text-white/90">
              {bookingUrl}
            </code>
            <button
              onClick={copyFullLink}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                fullLinkCopied
                  ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/40"
                  : "bg-white/[0.06] text-slate-300 border border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {fullLinkCopied ? (
                <>
                  <Check className="size-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={shareLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98] cursor-pointer"
            >
              <Share2 className="size-4" />
              Share Link
            </button>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-slate-300 transition-all hover:bg-white/[0.08] hover:text-white cursor-pointer"
            >
              <ExternalLink className="size-4" />
              Preview
            </a>
          </div>
        </div>

        {/* ── How It Works ──────────────────────────────────────────── */}
        <div className="mb-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            How it works
          </h3>
          <div className="flex flex-col gap-3">
            {[
              {
                step: "1",
                text: "Share the link with your players via WhatsApp, social media, etc.",
              },
              {
                step: "2",
                text: "Players visit the link and pick an available time slot.",
              },
              {
                step: "3",
                text: "Bookings appear instantly on your Schedule tab.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-[11px] font-bold text-blue-400 border border-blue-500/25">
                  {item.step}
                </span>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Media Upload ──────────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#111827]/80 p-5 shadow-lg">
          <h2 className="text-base font-bold text-white mb-1">Venue Media</h2>
          <p className="text-xs text-slate-500 mb-5">
            Upload a logo and photos/videos to show on your booking page.
          </p>

          {uploadError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {uploadError}
            </div>
          )}

          {/* Logo Upload */}
          <div className="mb-5">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <Camera className="size-3.5 text-slate-500" />
              Logo
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Venue logo"
                    className="size-16 rounded-xl object-cover border-2 border-white/10"
                  />
                  <button
                    onClick={() => {
                      setLogoUrl(null);
                      const fd = new FormData();
                      fd.set("venueName", venueName);
                      fd.set("description", description);
                      fd.set("address", address);
                      fd.set("logoUrl", "");
                      startTransition(async () => { await updateTenant(fd); });
                    }}
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-400 cursor-pointer"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploading}
                  className="flex size-16 items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] text-slate-500 hover:border-white/25 hover:text-slate-400 transition-all cursor-pointer"
                >
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                </button>
              )}
              <div className="text-xs text-slate-600">
                <p>Square image works best</p>
                <p>JPG, PNG, WebP • Max 10MB</p>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                setUploadError(null);
                const fd = new FormData();
                fd.set("file", file);
                fd.set("type", "logo");
                try {
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  const data = await res.json();
                  if (data.success) {
                    setLogoUrl(data.url);
                  } else {
                    setUploadError(data.error || "Upload failed");
                  }
                } catch {
                  setUploadError("Upload failed. Check your connection.");
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
          </div>

          {/* Gallery Upload */}
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
              <ImagePlus className="size-3.5 text-slate-500" />
              Gallery ({gallery.length}/6)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {gallery.map((item, i) => (
                <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                  {item.isVideo ? (
                    <video src={item.url} className="size-full object-cover" muted />
                  ) : (
                    <img src={item.url} alt="" className="size-full object-cover" />
                  )}
                  <button
                    onClick={() => {
                      const newGallery = gallery.filter((_, j) => j !== i);
                      setGallery(newGallery);
                      startTransition(async () => { await updateGallery(newGallery); });
                    }}
                    className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-red-500 cursor-pointer transition-colors"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              ))}
              {gallery.length < 6 && (
                <button
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-white/15 bg-white/[0.03] text-slate-500 hover:border-white/25 hover:text-slate-400 transition-all cursor-pointer"
                >
                  {uploading ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-600">Photos and videos of your venue, court, facilities.</p>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                setUploadError(null);
                const fd = new FormData();
                fd.set("file", file);
                fd.set("type", "gallery");
                try {
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  const data = await res.json();
                  if (data.success) {
                    const newGallery = [...gallery, { url: data.url, isVideo: data.isVideo }];
                    setGallery(newGallery);
                    await updateGallery(newGallery);
                  } else {
                    setUploadError(data.error || "Upload failed");
                  }
                } catch {
                  setUploadError("Upload failed. Check your connection.");
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
          </div>
        </div>

        {/* ── Venue Details ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#111827]/80 p-5 shadow-lg">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Venue Details</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                This info is shown to players when they visit your booking link.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {saveSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              <Check className="size-4" />
              Venue details saved successfully!
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Venue Name */}
            <div>
              <label
                htmlFor="venueName"
                className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300"
              >
                <Type className="size-3.5 text-slate-500" />
                Venue Name <span className="text-red-400">*</span>
              </label>
              <input
                id="venueName"
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300"
              >
                <MapPin className="size-3.5 text-slate-500" />
                Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Mawlai Umshing-Umjapung Bye-pass road"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-300"
              >
                <FileText className="size-3.5 text-slate-500" />
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Professional indoor futsal court with floodlights, available 6 AM - 11 PM daily."
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
              />
              <p className="mt-1 text-[11px] text-slate-600">
                Players will see this when they visit your booking page.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isPending || !hasChanges || !venueName.trim()}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-500 hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  Save Changes
                </>
              )}
            </button>
            {hasChanges && (
              <span className="text-xs text-amber-400/70">Unsaved changes</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
