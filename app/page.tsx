"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Trash2,
  Timer,
  Sparkles,
  XCircle,
  UserRound,
  Smartphone,
  BadgeCheck,
  MoonStar,
  CloudSun,
  SunMedium,
  SunDim,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { InstallButton } from "@/components/pwa-provider";
import { useLocalStorage } from "@/lib/use-local-storage";
import {
  type TimeSlot,
  type PaymentStatus,
  type DaySchedule,
  type SectionBoundaries,
  TIME_SLOTS,
  DEFAULT_SECTION_BOUNDARIES,
  formatTime,
  formatHour,
  createEmptySlots,
} from "@/lib/futsal-types";

// ─── Date Helpers ────────────────────────────────────────────────────────
function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isToday(date: Date): boolean {
  const now = new Date();
  return toDateKey(date) === toDateKey(now);
}

// ─── Payment Toggle ──────────────────────────────────────────────────────
function nextPaymentStatus(current: PaymentStatus): PaymentStatus {
  return current === "paid" ? "unpaid" : "paid";
}

// ─── Payment Config ──────────────────────────────────────────────────────
const paymentConfig: Record<
  PaymentStatus,
  {
    label: string;
    slotBg: string;
    slotBorder: string;
    btnBg: string;
    btnText: string;
    dotColor: string;
  }
> = {
  unpaid: {
    label: "Unpaid",
    slotBg: "bg-red-950/40",
    slotBorder: "border-red-500/60",
    btnBg: "bg-red-500/20 hover:bg-red-500/30",
    btnText: "text-red-400",
    dotColor: "text-red-400",
  },
  paid: {
    label: "Paid",
    slotBg: "bg-emerald-950/30",
    slotBorder: "border-emerald-500/50",
    btnBg: "bg-emerald-500/20 hover:bg-emerald-500/30",
    btnText: "text-emerald-400",
    dotColor: "text-emerald-400",
  },
};

// ─── Main Page ───────────────────────────────────────────────────────────
export default function FutsalDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useLocalStorage<DaySchedule>("futsal-schedule", {});
  const [sectionBoundaries, setSectionBoundaries] = useLocalStorage<SectionBoundaries>(
    "futsal-section-boundaries",
    DEFAULT_SECTION_BOUNDARIES
  );
  const [draggingBoundary, setDraggingBoundary] = useState<
    "morningStart" | "afternoonStart" | "eveningStart" | null
  >(null);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const boundaries: SectionBoundaries = {
    morningStart: sectionBoundaries?.morningStart ?? DEFAULT_SECTION_BOUNDARIES.morningStart,
    afternoonStart: sectionBoundaries?.afternoonStart ?? DEFAULT_SECTION_BOUNDARIES.afternoonStart,
    eveningStart: sectionBoundaries?.eveningStart ?? DEFAULT_SECTION_BOUNDARIES.eveningStart,
  };

  const isCustomBoundaries =
    boundaries.morningStart !== DEFAULT_SECTION_BOUNDARIES.morningStart ||
    boundaries.afternoonStart !== DEFAULT_SECTION_BOUNDARIES.afternoonStart ||
    boundaries.eveningStart !== DEFAULT_SECTION_BOUNDARIES.eveningStart;

  const resetBoundaries = () => {
    setSectionBoundaries(DEFAULT_SECTION_BOUNDARIES);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
  };

  const dateKey = toDateKey(selectedDate);

  // Get or create slots for current day
  const daySlots: TimeSlot[] = schedule[dateKey] || createEmptySlots();

  // Auto-focus name input when editing
  useEffect(() => {
    if (editingSlot && nameInputRef.current) {
      // Small delay to let the DOM render the expanded card
      const timer = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editingSlot]);

  // ── Slot Operations ──────────────────────────────────────────────
  const updateSlots = useCallback(
    (updater: (slots: TimeSlot[]) => TimeSlot[]) => {
      setSchedule((prev) => {
        const currentSlots = prev[dateKey] || createEmptySlots();
        return { ...prev, [dateKey]: updater(currentSlots) };
      });
    },
    [dateKey, setSchedule]
  );

  const handleBookSlot = (time: string) => {
    setEditingSlot(time);
    setPlayerInput("");
    setPhoneInput("");
  };

  const confirmBooking = (time: string) => {
    const name = playerInput.trim();
    if (!name) return; // Name is mandatory
    updateSlots((slots) =>
      slots.map((s) =>
        s.time === time
          ? {
              ...s,
              status: "booked",
              playerName: name,
              phoneNumber: phoneInput.trim(),
              paymentStatus: "paid",
            }
          : s
      )
    );
    setEditingSlot(null);
    setPlayerInput("");
    setPhoneInput("");
  };

  const togglePayment = (time: string) => {
    updateSlots((slots) =>
      slots.map((s) =>
        s.time === time
          ? { ...s, paymentStatus: nextPaymentStatus(s.paymentStatus) }
          : s
      )
    );
  };

  const cancelBooking = (time: string) => {
    updateSlots((slots) =>
      slots.map((s) =>
        s.time === time
          ? {
              ...s,
              status: "available",
              playerName: "",
              paymentStatus: "unpaid",
            }
          : s
      )
    );
  };

  // ── Drag & Boundary Adjustments ──────────────────────────────────
  const handlePointerDown = (
    key: "morningStart" | "afternoonStart" | "eveningStart",
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingBoundary(key);
  };

  const handlePointerMove = (
    key: "morningStart" | "afternoonStart" | "eveningStart",
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    if (draggingBoundary !== key) return;

    const slotElements = Array.from(document.querySelectorAll<HTMLElement>("[data-slot-hour]"));
    if (slotElements.length === 0) return;

    let closestHour = 0;
    let minDistance = Infinity;

    for (const el of slotElements) {
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const dist = Math.abs(e.clientY - midY);
      if (dist < minDistance) {
        minDistance = dist;
        const h = parseInt(el.getAttribute("data-slot-hour") || "", 10);
        if (!isNaN(h)) {
          closestHour = h;
        }
      }
    }

    setSectionBoundaries((prev) => {
      const current = {
        morningStart: prev?.morningStart ?? DEFAULT_SECTION_BOUNDARIES.morningStart,
        afternoonStart: prev?.afternoonStart ?? DEFAULT_SECTION_BOUNDARIES.afternoonStart,
        eveningStart: prev?.eveningStart ?? DEFAULT_SECTION_BOUNDARIES.eveningStart,
      };

      let newHour = closestHour;
      if (key === "morningStart") {
        newHour = Math.max(1, Math.min(newHour, current.afternoonStart - 1));
        if (newHour === current.morningStart) return prev;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
        return { ...current, morningStart: newHour };
      } else if (key === "afternoonStart") {
        newHour = Math.max(current.morningStart + 1, Math.min(newHour, current.eveningStart - 1));
        if (newHour === current.afternoonStart) return prev;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
        return { ...current, afternoonStart: newHour };
      } else if (key === "eveningStart") {
        newHour = Math.max(current.afternoonStart + 1, Math.min(newHour, 23));
        if (newHour === current.eveningStart) return prev;
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
        return { ...current, eveningStart: newHour };
      }
      return prev;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setDraggingBoundary(null);
  };

  const nudgeBoundary = (
    key: "morningStart" | "afternoonStart" | "eveningStart",
    delta: number
  ) => {
    setSectionBoundaries((prev) => {
      const current = {
        morningStart: prev?.morningStart ?? DEFAULT_SECTION_BOUNDARIES.morningStart,
        afternoonStart: prev?.afternoonStart ?? DEFAULT_SECTION_BOUNDARIES.afternoonStart,
        eveningStart: prev?.eveningStart ?? DEFAULT_SECTION_BOUNDARIES.eveningStart,
      };
      let newHour = current[key] + delta;
      if (key === "morningStart") {
        newHour = Math.max(1, Math.min(newHour, current.afternoonStart - 1));
      } else if (key === "afternoonStart") {
        newHour = Math.max(current.morningStart + 1, Math.min(newHour, current.eveningStart - 1));
      } else if (key === "eveningStart") {
        newHour = Math.max(current.afternoonStart + 1, Math.min(newHour, 23));
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
      return { ...current, [key]: newHour };
    });
  };

  // ── Date Navigation ──────────────────────────────────────────────
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

  // ── Stats ──────────────────────────────────────────────────────────
  const bookedSlots = daySlots.filter((s) => s.status === "booked");
  const paidCount = bookedSlots.filter((s) => s.paymentStatus === "paid").length;
  const unpaidCount = bookedSlots.filter((s) => s.paymentStatus === "unpaid").length;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e17] text-white">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0d1220]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-3">
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="Previous day"
            >
              <ArrowLeft className="size-5" />
            </Button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-white/[0.06] cursor-pointer"
              >
                <CalendarDays className="size-4 text-blue-400" />
                <span className="text-white">{formatDisplayDate(selectedDate)}</span>
                {isToday(selectedDate) && (
                  <span className="ml-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Today
                  </span>
                )}
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
                  className="rounded-lg"
                />
                <div className="border-t border-white/[0.06] px-3 py-2">
                  <button
                    onClick={() => {
                      setSelectedDate(new Date());
                      setCalendarOpen(false);
                    }}
                    className="w-full rounded-md bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
                  >
                    Go to Today
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="text-slate-400 hover:text-white hover:bg-white/10"
              aria-label="Next day"
            >
              <ArrowRight className="size-5" />
            </Button>
          </div>

          {/* Quick Stats, Install Action & Custom Boundaries Reset */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-3">
              {bookedSlots.length > 0 && (
                <span className="text-slate-500">
                  {bookedSlots.length} booked
                </span>
              )}
              {unpaidCount > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <Sparkles className="size-2.5" />
                  {unpaidCount} unpaid
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <InstallButton />
              {isCustomBoundaries && (
                <button
                  onClick={resetBoundaries}
                  className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
                  title="Reset section times to default (6 AM, 12 PM, 6 PM)"
                >
                  <RotateCcw className="size-2.5" />
                  <span>Reset hours</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Schedule Grid ───────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-3">
        <div className="flex flex-col gap-2">
          {(() => {
            // Define sections with their dynamic boundaries
            const sections = [
              {
                id: "night",
                label: "Night",
                icon: <MoonStar className="size-3.5" />,
                from: 0,
                to: boundaries.morningStart - 1,
                color: "text-indigo-400",
                bg: "bg-indigo-500/10",
                border: "border-indigo-500/20",
                line: "bg-indigo-500/30",
                dragKey: null as null,
              },
              {
                id: "morning",
                label: "Morning",
                icon: <CloudSun className="size-3.5" />,
                from: boundaries.morningStart,
                to: boundaries.afternoonStart - 1,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                border: "border-amber-500/20",
                line: "bg-amber-500/30",
                dragKey: "morningStart" as const,
              },
              {
                id: "afternoon",
                label: "Afternoon",
                icon: <SunMedium className="size-3.5" />,
                from: boundaries.afternoonStart,
                to: boundaries.eveningStart - 1,
                color: "text-sky-400",
                bg: "bg-sky-500/10",
                border: "border-sky-500/20",
                line: "bg-sky-500/30",
                dragKey: "afternoonStart" as const,
              },
              {
                id: "evening",
                label: "Evening",
                icon: <SunDim className="size-3.5" />,
                from: boundaries.eveningStart,
                to: 23,
                color: "text-purple-400",
                bg: "bg-purple-500/10",
                border: "border-purple-500/20",
                line: "bg-purple-500/30",
                dragKey: "eveningStart" as const,
              },
            ];

            return sections.map((section) => {
              const sectionSlots = daySlots.filter((s) => {
                const h = parseInt(s.time.split(":")[0], 10);
                return h >= section.from && h <= section.to;
              });
              if (sectionSlots.length === 0) return null;

              const isDraggingThis = draggingBoundary === section.dragKey;

              return (
                <div key={section.id} className="flex flex-col gap-2">
                  {/* Section Header with Drag Handle */}
                  <div className="flex items-center gap-2 pt-4 pb-1 select-none">
                    {/* Section Badge */}
                    <div
                      className={`flex items-center gap-1.5 rounded-full ${section.bg} px-2.5 py-1 ${section.color} border ${section.border}`}
                    >
                      {section.icon}
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        {section.label}
                      </span>
                    </div>

                    {/* Draggable Indicator Handle for adjustable sections */}
                    {section.dragKey && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeBoundary(section.dragKey!, -1);
                          }}
                          className="flex size-6 items-center justify-center rounded-md bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all text-xs"
                          title={`Move ${section.label} 1 hour earlier`}
                          aria-label={`Decrease ${section.label} start hour`}
                        >
                          −
                        </button>

                        <div
                          role="slider"
                          aria-label={`Drag to adjust ${section.label} start hour`}
                          aria-valuenow={section.from}
                          tabIndex={0}
                          onPointerDown={(e) => handlePointerDown(section.dragKey!, e)}
                          onPointerMove={(e) => handlePointerMove(section.dragKey!, e)}
                          onPointerUp={handlePointerUp}
                          onPointerCancel={handlePointerUp}
                          style={{ touchAction: "none" }}
                          className={`group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition-all cursor-grab active:cursor-grabbing border select-none ${
                            isDraggingThis
                              ? "bg-blue-600/30 border-blue-400 ring-2 ring-blue-500/40 scale-105 shadow-lg shadow-blue-500/20 text-white z-20"
                              : "bg-white/[0.05] border-white/10 hover:border-white/20 hover:bg-white/[0.08] text-slate-300"
                          }`}
                        >
                          <GripVertical
                            className={`size-3.5 transition-transform group-hover:scale-110 ${
                              isDraggingThis
                                ? "text-blue-400 animate-pulse"
                                : "text-slate-400 group-hover:text-white"
                            }`}
                          />
                          <span className="text-[11px] font-bold tracking-tight">
                            {formatHour(section.from)}
                          </span>
                          <span className="hidden sm:inline text-[9px] font-medium text-slate-500 group-hover:text-slate-400">
                            {isDraggingThis ? "Dragging..." : "drag"}
                          </span>

                          {/* Floating tooltip when dragging */}
                          {isDraggingThis && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xl shadow-blue-600/40 pointer-events-none">
                              {section.label} starts at {formatHour(section.from)}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            nudgeBoundary(section.dragKey!, 1);
                          }}
                          className="flex size-6 items-center justify-center rounded-md bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 transition-all text-xs"
                          title={`Move ${section.label} 1 hour later`}
                          aria-label={`Increase ${section.label} start hour`}
                        >
                          +
                        </button>
                      </div>
                    )}

                    <div className={`h-px flex-1 ${section.line}`} />
                    <span className="text-[10px] text-slate-600 tabular-nums">
                      {sectionSlots.filter((s) => s.status === "booked").length}/{sectionSlots.length}
                    </span>
                  </div>

                  {/* Slots in this section */}
                  {sectionSlots.map((slot) => {
                    const isEditing = editingSlot === slot.time;
                    const isBooked = slot.status === "booked";
                    const config = isBooked ? paymentConfig[slot.paymentStatus] : null;
                    const slotHour = parseInt(slot.time.split(":")[0], 10);

                    return (
                      <div
                        key={slot.time}
                        data-slot-hour={slotHour}
                      >
                {/* Available Slot */}
                {!isBooked && !isEditing && (
                  <button
                    onClick={() => handleBookSlot(slot.time)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-3.5 transition-all hover:border-blue-500/30 hover:bg-blue-500/[0.04] active:scale-[0.99]"
                    id={`slot-${slot.time}`}
                  >
                    <div className="flex items-center gap-2 text-slate-600">
                      <Timer className="size-3.5" />
                      <span className="text-xs font-medium">
                        {formatTime(slot.time)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600 group-hover:text-blue-400/60">
                      Tap to book
                    </span>
                  </button>
                )}

                {/* Booking Form */}
                {isEditing && (
                  <Card className="relative overflow-visible border-blue-500/40 bg-[#111827] ring-1 ring-blue-500/20">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Timer className="size-3.5" />
                        <span className="text-xs font-semibold">
                          {formatTime(slot.time)}
                        </span>
                        <span className="text-[10px] text-slate-500">• New Booking</span>
                      </div>
                      <button
                        onClick={() => setEditingSlot(null)}
                        className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Cancel"
                      >
                        <XCircle className="size-4" />
                      </button>
                    </div>

                    {/* Form Fields */}
                    <div className="flex flex-col gap-3 px-4 py-3">
                      {/* Player Name - Required */}
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          <UserRound className="size-3" />
                          Player Name
                          <span className="text-red-400">*</span>
                        </label>
                        <Input
                          ref={nameInputRef}
                          type="text"
                          placeholder="Enter player name"
                          value={playerInput}
                          onChange={(e) => setPlayerInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && playerInput.trim()) confirmBooking(slot.time);
                            if (e.key === "Escape") setEditingSlot(null);
                          }}
                          className="h-9 rounded-lg border-white/10 bg-white/[0.05] px-3 text-sm text-white placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20"
                          autoComplete="off"
                        />
                      </div>

                      {/* Phone Number - Optional */}
                      <div className="flex flex-col gap-1.5">
                        <label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          <Smartphone className="size-3" />
                          Phone Number
                          <span className="text-slate-600 normal-case tracking-normal">(optional)</span>
                        </label>
                        <Input
                          type="tel"
                          placeholder="Enter phone number"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && playerInput.trim()) confirmBooking(slot.time);
                            if (e.key === "Escape") setEditingSlot(null);
                          }}
                          className="h-9 rounded-lg border-white/10 bg-white/[0.05] px-3 text-sm text-white placeholder:text-slate-600 focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20"
                          autoComplete="off"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          onClick={() => confirmBooking(slot.time)}
                          disabled={!playerInput.trim()}
                          className="flex-1 h-9 gap-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          <BadgeCheck className="size-3.5" />
                          Save Booking
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setEditingSlot(null)}
                          className="h-9 rounded-lg text-slate-400 hover:bg-white/[0.06] hover:text-white"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Booked Slot */}
                {isBooked && config && (
                  <div
                    className={`relative flex items-center gap-3 rounded-xl border ${config.slotBorder} ${config.slotBg} px-4 py-3.5 transition-all`}
                  >
                    {/* Time + Player */}
                    <div className="flex flex-1 items-center gap-3 overflow-hidden">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-medium text-slate-500">
                          {formatTime(slot.time)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {slot.playerName}
                        </p>
                        <div className="flex items-center gap-2">
                          {slot.phoneNumber && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Smartphone className="size-2.5" />
                              {slot.phoneNumber}
                            </span>
                          )}

                        </div>
                      </div>
                    </div>

                    {/* Payment Toggle Button */}
                    <button
                      onClick={() => togglePayment(slot.time)}
                      className={`flex items-center gap-1.5 rounded-lg ${config.btnBg} px-3 py-1.5 transition-all active:scale-95`}
                      id={`payment-${slot.time}`}
                      aria-label={`Toggle payment: currently ${config.label}`}
                    >
                      <Sparkles className={`size-3 ${config.dotColor}`} />
                      <span
                        className={`text-xs font-semibold ${config.btnText}`}
                      >
                        {config.label}
                      </span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => cancelBooking(slot.time)}
                      className="flex items-center justify-center rounded-lg p-1.5 bg-red-500/10 text-red-400/70 transition-all hover:bg-red-500/20 hover:text-red-400 active:scale-95"
                      aria-label={`Cancel booking for ${slot.playerName}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
              </div>
            );
          });
        })()}
        </div>

        {/* Empty State */}
        {bookedSlots.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-white/[0.04]">
              <CalendarDays className="size-5 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">No bookings yet</p>
            <p className="text-xs text-slate-600">
              Tap any time slot above to start booking
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] bg-[#0d1220]/50 py-3 text-center text-[10px] text-slate-600">
        Futsal Manager • Data stored locally on this device
      </footer>
    </div>
  );
}
