"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Timer,
  UserRound,
  Phone,
  MapPin,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Clock,
  MoonStar,
  CloudSun,
  SunMedium,
  SunDim,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  type TimeSlot,
  type SectionBoundaries,
  DEFAULT_SECTION_BOUNDARIES,
  formatTime,
  formatHour,
} from "@/lib/futsal-types";
import { getPublicSchedule, bookSlot } from "@/lib/actions";
import type { SectionPrices, GalleryItem } from "@/lib/actions";

// ─── Date Helpers ────────────────────────────────────────────────────
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isToday(date: Date): boolean {
  const now = new Date();
  return toDateKey(date) === toDateKey(now);
}

function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(date);
  check.setHours(0, 0, 0, 0);
  return check < today;
}

// ─── Section helpers ─────────────────────────────────────────────────
function getSectionIcon(section: string) {
  switch (section) {
    case "Night": return <MoonStar className="size-3.5" />;
    case "Morning": return <SunDim className="size-3.5" />;
    case "Afternoon": return <SunMedium className="size-3.5" />;
    case "Evening": return <CloudSun className="size-3.5" />;
    default: return null;
  }
}

function getSection(hour: number, boundaries: SectionBoundaries) {
  if (hour >= boundaries.eveningStart) return "Evening";
  if (hour >= boundaries.afternoonStart) return "Afternoon";
  if (hour >= boundaries.morningStart) return "Morning";
  return "Night";
}

interface BookingClientProps {
  tenantId: string;
  venueName: string;
  address: string;
  description: string;
  slotDuration: string;
  logoUrl: string | null;
  sectionPrices: SectionPrices;
  sectionBoundaries: SectionBoundaries;
  hiddenSlots: string[];
  gallery: GalleryItem[];
}

export function BookingClient({
  tenantId,
  venueName,
  address,
  description,
  slotDuration,
  logoUrl,
  sectionPrices,
  sectionBoundaries,
  hiddenSlots,
  gallery,
}: BookingClientProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daySlots, setDaySlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const boundaries: SectionBoundaries = sectionBoundaries;
  const dateKey = toDateKey(selectedDate);

  // ── Fetch schedule ────────────────────────────────────────────────
  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const slots = await getPublicSchedule(tenantId, dateKey);
      setDaySlots(slots);
    } catch {
      setDaySlots([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateKey]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Auto-focus name when slot is selected
  useEffect(() => {
    if (selectedSlot && nameInputRef.current) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedSlot]);

  // ── Booking ───────────────────────────────────────────────────────
  const handleSelectSlot = (time: string) => {
    setSelectedSlot(time);
    setPlayerInput("");
    setPhoneInput("");
    setBookingError(null);
    setBookingSuccess(null);
  };

  const confirmBooking = () => {
    if (!selectedSlot) return;
    const name = playerInput.trim();
    const phone = phoneInput.trim();
    if (!name) return;
    if (!phone) {
      setBookingError("Phone number is required.");
      return;
    }

    startTransition(async () => {
      const result = await bookSlot(tenantId, dateKey, selectedSlot, name, phone);
      if (result.success) {
        setBookingSuccess(selectedSlot);
        setSelectedSlot(null);
        setPlayerInput("");
        setPhoneInput("");
        setTimeout(() => setBookingSuccess(null), 5000);
        await fetchSchedule();
      } else {
        setBookingError(result.error || "Booking failed.");
      }
    });
  };

  // ── Date Navigation ───────────────────────────────────────────────
  const goToday = () => setSelectedDate(new Date());
  const goPrev = () =>
    setSelectedDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() - 1);
      return n;
    });
  const goNext = () =>
    setSelectedDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + 1);
      return n;
    });

  // ── Group slots by section ────────────────────────────────────────
  const visibleSlots = daySlots.filter((s) => !hiddenSlots.includes(s.time));

  const groupedSlots: Record<string, TimeSlot[]> = {};
  for (const slot of visibleSlots) {
    const hour = parseInt(slot.time.split(":")[0], 10);
    const section = getSection(hour, boundaries);
    if (!groupedSlots[section]) groupedSlots[section] = [];
    groupedSlots[section].push(slot);
  }

  const availableCount = visibleSlots.filter((s) => s.status === "available").length;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e17] text-white">
      {/* ── Venue Header ─────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] bg-[#0d1220]">
        <div className="mx-auto max-w-lg px-4 py-8 text-center">
          {/* Logo */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={venueName}
              className="mx-auto mb-4 size-14 rounded-2xl object-cover shadow-lg ring-2 ring-white/10"
            />
          ) : (
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 shadow-lg shadow-emerald-500/20 ring-2 ring-white/10">
              <svg className="size-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l2.5-3L14 12l-3.5 3z" fill="currentColor" />
              </svg>
            </div>
          )}

          {/* Venue Name */}
          <h1 className="text-2xl font-bold tracking-tight">{venueName}</h1>
          <p className="mt-1 text-sm text-slate-400">Online Booking</p>

          {/* Meta Info */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-emerald-400" />
              {slotDuration}
            </span>
            {address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-blue-400" />
                {address}
              </span>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* ── Gallery Carousel ─────────────────────────────────────── */}
      {gallery.length > 0 && (
        <div className="border-b border-white/[0.06] bg-[#0d1220]/50">
          <div className="mx-auto max-w-lg py-4">
            <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
              {gallery.map((item, i) => (
                <div
                  key={i}
                  className="shrink-0 snap-start overflow-hidden rounded-xl border border-white/10"
                  style={{ width: gallery.length === 1 ? '100%' : '75%' }}
                >
                  {item.isVideo ? (
                    <video
                      src={item.url}
                      className="aspect-video w-full object-cover"
                      controls
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={`${venueName} photo ${i + 1}`}
                      className="aspect-video w-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {/* Date Picker */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Select a Day</h2>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              disabled={isPastDate(new Date(selectedDate.getTime() - 86400000))}
              className="size-9 rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer disabled:opacity-30"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 transition-all hover:border-emerald-500/40 hover:bg-white/[0.08] active:scale-95 cursor-pointer"
              >
                <CalendarDays className="size-4 text-emerald-400" />
                <span className="text-sm font-semibold">{formatDisplayDate(selectedDate)}</span>
                {isToday(selectedDate) && (
                  <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Today
                  </span>
                )}
                <ChevronDown className={`size-3.5 text-slate-400 transition-transform ${calendarOpen ? "rotate-180" : ""}`} />
              </PopoverTrigger>
              <PopoverContent align="center" className="w-auto p-0 bg-[#111827] border-white/10">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setCalendarOpen(false);
                    }
                  }}
                  defaultMonth={selectedDate}
                  disabled={(date) => isPastDate(date)}
                  className="rounded-lg"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="size-9 rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] active:scale-90 transition-all cursor-pointer"
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* Stats bar */}
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
            <span>{availableCount} slots available</span>
            {isPastDate(selectedDate) && (
              <span className="text-amber-500">Past date — view only</span>
            )}
          </div>
        </div>

        {/* Success Banner */}
        {bookingSuccess && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 animate-in fade-in duration-300">
            <CheckCircle2 className="size-4" />
            <span>Booked <strong>{formatTime(bookingSuccess)}</strong> successfully! See you on the court 🎉</span>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <>
            {/* Slot Sections */}
            {Object.entries(groupedSlots).map(([section, slots]) => (
              <div key={section} className="mb-6">
                {/* Section Header */}
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-400">
                  {getSectionIcon(section)}
                  <span>{section}</span>
                  {(() => {
                    const key = section.toLowerCase() as keyof SectionPrices;
                    const price = sectionPrices[key];
                    if (price) {
                      return (
                        <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                          {sectionPrices.currency}{price}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Slot Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => {
                    const isAvailable = slot.status === "available";
                    const isSelected = selectedSlot === slot.time;
                    const isBooked = slot.status === "booked";
                    const justBooked = bookingSuccess === slot.time;
                    const past = isPastDate(selectedDate);

                    return (
                      <button
                        key={slot.time}
                        onClick={() => isAvailable && !past && handleSelectSlot(slot.time)}
                        disabled={!isAvailable || past}
                        className={`
                          relative rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 cursor-pointer
                          ${isSelected
                            ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50 scale-[1.02] shadow-lg shadow-emerald-500/10"
                            : isBooked || justBooked
                              ? "border-white/[0.06] bg-white/[0.02] text-slate-600 cursor-not-allowed"
                              : "border-white/10 bg-white/[0.04] text-white hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-300 active:scale-95"
                          }
                          ${(!isAvailable || past) ? "opacity-50 cursor-not-allowed" : ""}
                        `}
                      >
                        <span className="font-mono text-xs">{formatTime(slot.time)}</span>
                        {isBooked && (
                          <span className="mt-0.5 block text-[10px] text-slate-600 font-normal">Booked</span>
                        )}
                        {isAvailable && !past && (
                          <span className="mt-0.5 block text-[10px] text-emerald-500/60 font-normal">Available</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Booking Form */}
            {selectedSlot && (
              <div
                ref={formRef}
                className="mt-4 rounded-2xl border border-emerald-500/20 bg-[#111827]/80 p-5 backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-300"
              >
                <h3 className="mb-4 text-base font-semibold text-white flex items-center gap-2">
                  <Timer className="size-4 text-emerald-400" />
                  Book {formatTime(selectedSlot)}
                </h3>

                {bookingError && (
                  <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {bookingError}
                  </div>
                )}

                {/* Name Input */}
                <div className="mb-3">
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <UserRound className="size-3" />
                    Your Name <span className="text-red-400">*</span>
                  </label>
                  <Input
                    ref={nameInputRef}
                    value={playerInput}
                    onChange={(e) => setPlayerInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmBooking()}
                    placeholder="Enter your name"
                    className="h-10 rounded-lg border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                  />
                </div>

                {/* Phone Input */}
                <div className="mb-4">
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Phone className="size-3" />
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <Input
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmBooking()}
                    placeholder="Enter your phone number"
                    type="tel"
                    className="h-10 rounded-lg border-white/10 bg-white/[0.04] text-white placeholder:text-slate-500 focus:border-emerald-500/50"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedSlot(null);
                      setBookingError(null);
                    }}
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] py-2.5 text-sm text-slate-400 hover:bg-white/[0.08] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmBooking}
                    disabled={isPending || !playerInput.trim() || !phoneInput.trim()}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    {isPending ? "Booking..." : "Confirm Booking"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-4 text-center text-[11px] text-slate-600">
        Powered by Futsal Manager
      </footer>
    </div>
  );
}
