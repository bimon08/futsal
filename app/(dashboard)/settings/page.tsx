"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  LogOut,
  User,
  Building2,
  Loader2,
  ChevronRight,
  Shield,
  Smartphone,
} from "lucide-react";

interface TenantInfo {
  slug: string;
  venueName: string;
  address: string;
  userName?: string;
  userImage?: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tenant/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.slug) setTenant(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0e17]">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e17] text-white pb-24">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your account and preferences.
          </p>
        </div>

        {/* ── Profile Card ──────────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111827] to-[#0d1220] p-5 shadow-lg">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "Profile"}
                  referrerPolicy="no-referrer"
                  className="size-14 rounded-2xl border-2 border-white/10 object-cover shadow-lg"
                />
              ) : (
                <div className="flex size-14 items-center justify-center rounded-2xl border-2 border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 shadow-lg">
                  <User className="size-6 text-slate-400" />
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-[#111827] bg-emerald-500">
                <span className="size-1.5 rounded-full bg-white" />
              </span>
            </div>

            {/* User Info */}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-bold text-white">
                {session?.user?.name || "User"}
              </h2>
              <p className="truncate text-sm text-slate-500">
                {session?.user?.email || ""}
              </p>
            </div>
          </div>
        </div>

        {/* ── Venue Info ───────────────────────────────────────────── */}
        {tenant && (
          <div className="mb-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Venue
            </h3>
            <div className="rounded-2xl border border-white/[0.08] bg-[#111827]/60 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04]">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Building2 className="size-4 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {tenant.venueName}
                  </p>
                  {tenant.address && (
                    <p className="text-xs text-slate-500 truncate">
                      {tenant.address}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-3.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10">
                  <Smartphone className="size-4 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-300">Booking URL</p>
                  <p className="text-xs text-slate-500 truncate font-mono">
                    /book/{tenant.slug}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Account Actions ──────────────────────────────────────── */}
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Account
          </h3>
          <div className="rounded-2xl border border-white/[0.08] bg-[#111827]/60 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04]">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10">
                <Shield className="size-4 text-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-300">Signed in with Google</p>
                <p className="text-xs text-slate-500 truncate">
                  {session?.user?.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-red-500/5 cursor-pointer group"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                <LogOut className="size-4 text-red-400" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-red-400 group-hover:text-red-300 transition-colors">
                  Sign Out
                </p>
                <p className="text-xs text-slate-600">
                  You&apos;ll need to sign in again to access your dashboard.
                </p>
              </div>
              <ChevronRight className="size-4 text-slate-600 group-hover:text-red-400/50 transition-colors" />
            </button>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <div className="mt-8 text-center">
          <p className="text-[11px] text-slate-700">
            Futsal Manager • Your data is stored securely in the cloud
          </p>
        </div>
      </div>
    </div>
  );
}
