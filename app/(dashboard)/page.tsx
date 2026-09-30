"use client";

import { useState, useRef, useEffect, useCallback, useTransition } from "react";
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
  Phone,
  ChevronDown,
  Eye,
  EyeOff,
  IndianRupee,
  Pencil,
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
import { InstallBanner } from "@/components/install-banner";
// All settings are now stored in the database (no localStorage)
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
import {
  getSchedule,
  managerBookSlot,
  updateBooking,
  togglePaymentStatus,
  cancelBooking as cancelBookingAction,
  migrateLocalData,
  getSectionPrices,
  updateSectionPrices,
  updateBoundaries,
  updateHiddenSlots,
  getBoundaries,
  getHiddenSlots,
  type SectionPrices,
} from "@/lib/actions";

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
  const [daySlots, setDaySlots] = useState<TimeSlot[]>(createEmptySlots());
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [sectionBoundaries, setSectionBoundaries] = useState<SectionBoundaries>(
    DEFAULT_SECTION_BOUNDARIES
  );
  const [draggingBoundary, setDraggingBoundary] = useState<
    "morningStart" | "afternoonStart" | "eveningStart" | null
  >(null);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [playerInput, setPlayerInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [hiddenSlots, setHiddenSlots] = useState<string[]>([]);
  const [dateHiddenSlots, setDateHiddenSlots] = useState<Record<string, string[]>>({});
  const [hideScope, setHideScope] = useState<"all" | "date">("all");
  const [hiddenSectionOpen, setHiddenSectionOpen] = useState(true);
  const [highlightHiddenBtn, setHighlightHiddenBtn] = useState(false);
  const highlightTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hiddenSectionRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // ── Section Prices ─────────────────────────────────────────────
  const [sectionPrices, setSectionPrices] = useState<SectionPrices>({
    morning: "", afternoon: "", evening: "", night: "", currency: "₹",
  });
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const priceInputRef = useRef<HTMLInputElement>(null);

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
    updateBoundaries(DEFAULT_SECTION_BOUNDARIES);
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
  };

  const dateKey = toDateKey(selectedDate);

  // ── Load all settings from database on mount ───────────────────
  useEffect(() => {
    getSectionPrices().then(setSectionPrices).catch(() => {});
    getBoundaries().then(setSectionBoundaries).catch(() => {});
    getHiddenSlots().then(setHiddenSlots).catch(() => {});
  }, []);

  // Focus price input when editing
  useEffect(() => {
    if (editingPrice && priceInputRef.current) {
      const timer = setTimeout(() => priceInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editingPrice]);

  const savePrice = (sectionId: string) => {
    const newPrices = { ...sectionPrices, [sectionId]: priceInput.trim() };
    setSectionPrices(newPrices);
    setEditingPrice(null);
    startTransition(async () => {
      await updateSectionPrices(newPrices);
    });
  };

  // ── Fetch schedule from database ───────────────────────────────────
  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const slots = await getSchedule(dateKey);
      setDaySlots(slots);
    } catch {
      setDaySlots(createEmptySlots());
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // ── One-time migration from localStorage to database ─────────────
  // Migrates ALL local data: bookings, section boundaries, hidden slots
  useEffect(() => {
    const migrationKey = "futsal-data-migrated-v2"; // v2 to re-run for boundaries/hidden
    if (typeof window === "undefined") return;
    if (localStorage.getItem(migrationKey)) return;

    const migrate = async () => {
      try {
        // 1. Migrate bookings
        const rawSchedule = localStorage.getItem("futsal-schedule");
        if (rawSchedule) {
          const localSchedule: DaySchedule = JSON.parse(rawSchedule);
          const hasBookings = Object.values(localSchedule).some(
            (slots) => slots.some((s) => s.status === "booked")
          );
          if (hasBookings) {
            const result = await migrateLocalData(localSchedule);
            console.log(`[Migration] Migrated ${result.migrated} bookings, skipped ${result.skipped}`);
          }
        }

        // 2. Migrate section boundaries
        const rawBoundaries = localStorage.getItem("futsal-section-boundaries");
        if (rawBoundaries) {
          try {
            const localBoundaries = JSON.parse(rawBoundaries);
            if (localBoundaries && typeof localBoundaries === "object") {
              await updateBoundaries({
                morningStart: localBoundaries.morningStart ?? DEFAULT_SECTION_BOUNDARIES.morningStart,
                afternoonStart: localBoundaries.afternoonStart ?? DEFAULT_SECTION_BOUNDARIES.afternoonStart,
                eveningStart: localBoundaries.eveningStart ?? DEFAULT_SECTION_BOUNDARIES.eveningStart,
              });
              setSectionBoundaries(localBoundaries);
              console.log("[Migration] Migrated section boundaries");
            }
          } catch { /* ignore parse errors */ }
        }

        // 3. Migrate hidden slots ("all days")
        const rawHidden = localStorage.getItem("futsal-hidden-slots");
        if (rawHidden) {
          try {
            const localHidden = JSON.parse(rawHidden);
            if (Array.isArray(localHidden) && localHidden.length > 0) {
              await updateHiddenSlots(localHidden);
              setHiddenSlots(localHidden);
              console.log(`[Migration] Migrated ${localHidden.length} hidden slots`);
            }
          } catch { /* ignore parse errors */ }
        }

        // 4. Migrate date-specific hidden slots (kept in state only — per-date)
        const rawDateHidden = localStorage.getItem("futsal-date-hidden-slots");
        if (rawDateHidden) {
          try {
            const localDateHidden = JSON.parse(rawDateHidden);
            if (localDateHidden && typeof localDateHidden === "object") {
              setDateHiddenSlots(localDateHidden);
              console.log("[Migration] Migrated date-specific hidden slots");
            }
          } catch { /* ignore parse errors */ }
        }

        // 5. Migrate hide scope preference
        const rawScope = localStorage.getItem("futsal-hide-scope");
        if (rawScope) {
          try {
            const localScope = JSON.parse(rawScope);
            if (localScope === "all" || localScope === "date") {
              setHideScope(localScope);
              console.log(`[Migration] Migrated hide scope: ${localScope}`);
            }
          } catch { /* ignore parse errors */ }
        }

        // Mark migration complete
        localStorage.setItem(migrationKey, "true");
        // Also mark old key so old migration doesn't re-run
        localStorage.setItem("futsal-data-migrated", "true");

        // Refresh schedule to show migrated data
        fetchSchedule();
      } catch (err) {
        console.error("[Migration] Error:", err);
        localStorage.setItem(migrationKey, "true");
      }
    };

    migrate();
  }, [fetchSchedule]);

  // Auto-focus name input when editing
  useEffect(() => {
    if (editingSlot && nameInputRef.current) {
      // Small delay to let the DOM render the expanded card
      const timer = setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [editingSlot]);

  // ── Slot Operations (via Server Actions) ───────────────────────────
  const handleBookSlot = (time: string) => {
    setEditingSlot(time);
    setPlayerInput("");
    setPhoneInput("");
  };

  const handleEditSlot = (slot: TimeSlot) => {
    setEditingSlot(slot.time);
    setPlayerInput(slot.playerName || "");
    setPhoneInput(slot.phoneNumber || "");
  };

  const confirmBooking = (time: string) => {
    const name = playerInput.trim();
    if (!name) return;

    const slot = daySlots.find((s) => s.time === time);
    const isUpdate = slot?.status === "booked";

    startTransition(async () => {
      let result: { success: boolean; error?: string };
      if (isUpdate) {
        result = await updateBooking(dateKey, time, name, phoneInput.trim());
      } else {
        result = await managerBookSlot(dateKey, time, name, phoneInput.trim());
      }

      if (!result.success) {
        alert(result.error || "Failed to save booking.");
      }

      setEditingSlot(null);
      setPlayerInput("");
      setPhoneInput("");
      await fetchSchedule();
    });
  };

  const togglePayment = (time: string) => {
    startTransition(async () => {
      await togglePaymentStatus(dateKey, time);
      await fetchSchedule();
    });
  };

  const cancelBooking = (time: string) => {
    startTransition(async () => {
      await cancelBookingAction(dateKey, time);
      await fetchSchedule();
    });
  };

  // ── Hide / Unhide Operations ──────────────────────────────────────
  const isSlotHidden = useCallback(
    (time: string) => {
      const isGlobalHidden = (hiddenSlots || []).includes(time);
      const isDateHidden = (dateHiddenSlots?.[dateKey] || []).includes(time);
      return isGlobalHidden || isDateHidden;
    },
    [hiddenSlots, dateHiddenSlots, dateKey]
  );

  const getSlotHideType = useCallback(
    (time: string): "all" | "date" | null => {
      if ((hiddenSlots || []).includes(time)) return "all";
      if ((dateHiddenSlots?.[dateKey] || []).includes(time)) return "date";
      return null;
    },
    [hiddenSlots, dateHiddenSlots, dateKey]
  );

  const handleHideSlot = useCallback(
    (time: string) => {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
      if (hideScope === "all") {
        // "all days" — save to DB
        setHiddenSlots((prev) => {
          const next = prev.includes(time) ? prev : [...prev, time];
          updateHiddenSlots(next);
          return next;
        });
      } else {
        setDateHiddenSlots((prev = {}) => {
          const current = prev[dateKey] || [];
          if (current.includes(time)) return prev;
          return { ...prev, [dateKey]: [...current, time] };
        });
      }

      // Highlight the unhide button in top bar with animation
      setHighlightHiddenBtn(true);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightHiddenBtn(false);
      }, 5000);
    },
    [hideScope, dateKey]
  );

  const handleUnhideSlot = useCallback(
    (time: string) => {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
      setHiddenSlots((prev) => {
        const next = prev.filter((t) => t !== time);
        updateHiddenSlots(next);
        return next;
      });
      setDateHiddenSlots((prev) => {
        if (!prev[dateKey]) return prev;
        return {
          ...prev,
          [dateKey]: prev[dateKey].filter((t) => t !== time),
        };
      });
    },
    [dateKey]
  );

  const handleUnhideAll = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(15);
    const hiddenInToday = daySlots
      .map((s) => s.time)
      .filter((t) => isSlotHidden(t));

    setHiddenSlots((prev) => {
      const next = prev.filter((t) => !hiddenInToday.includes(t));
      updateHiddenSlots(next);
      return next;
    });
    setDateHiddenSlots((prev) => {
      if (!prev[dateKey]) return prev;
      return {
        ...prev,
        [dateKey]: [],
      };
    });
  }, [daySlots, isSlotHidden, dateKey]);

  const scrollToHiddenSection = () => {
    setHiddenSectionOpen(true);
    setTimeout(() => {
      hiddenSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
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
    // Save boundaries to DB after drag ends
    updateBoundaries(boundaries);
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
      const next = { ...current, [key]: newHour };
      updateBoundaries(next);
      return next;
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
  const hiddenSlotsForDay = daySlots.filter((s) => isSlotHidden(s.time));
  const hiddenCount = hiddenSlotsForDay.length;
  const visibleDaySlots = daySlots.filter((s) => !isSlotHidden(s.time));
  const bookedSlots = visibleDaySlots.filter((s) => s.status === "booked");
  const paidCount = bookedSlots.filter((s) => s.paymentStatus === "paid").length;
  const unpaidCount = bookedSlots.filter((s) => s.paymentStatus === "unpaid").length;

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0e17] text-white pb-20">
      {/* ── Install Banner ────────────────────────────────────────── */}
      <div className="pt-3">
        <InstallBanner />
      </div>

      {/* ── Sticky Date Navigation ───────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0d1220]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl flex-col gap-2.5 px-4 py-3">
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="size-9 rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/20 active:scale-90 transition-all shadow-sm cursor-pointer"
              aria-label="Previous day"
              title="Previous day"
            >
              <ArrowLeft className="size-4" />
            </Button>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-1.5 shadow-sm transition-all duration-200 hover:border-blue-500/40 hover:bg-white/[0.08] hover:shadow-md hover:shadow-blue-500/10 active:scale-95 cursor-pointer"
                title="Click to choose a date"
                aria-label="Choose date from calendar"
              >
                <div className="flex size-6 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 group-hover:bg-blue-500/25 group-hover:scale-105 transition-all">
                  <CalendarDays className="size-3.5" />
                </div>
                <span className="text-sm font-semibold tracking-tight text-white group-hover:text-blue-200 transition-colors">
                  {formatDisplayDate(selectedDate)}
                </span>
                {isToday(selectedDate) ? (
                  <span className="rounded-full bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Today
                  </span>
                ) : (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      goToday();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        goToday();
                      }
                    }}
                    className="rounded-full bg-white/[0.06] hover:bg-blue-500/25 hover:text-blue-300 px-2 py-0.5 text-[10px] font-medium text-slate-400 transition-colors border border-white/10 cursor-pointer"
                    title="Jump back to today"
                  >
                    Today
                  </span>
                )}
                <ChevronDown
                  className={`size-3.5 text-slate-400 group-hover:text-blue-400 transition-transform duration-200 ${
                    calendarOpen ? "rotate-180 text-blue-400" : ""
                  }`}
                />
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
              className="size-9 rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/20 active:scale-90 transition-all shadow-sm cursor-pointer"
              aria-label="Next day"
              title="Next day"
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* Quick Stats */}
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
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setHighlightHiddenBtn(false);
                    scrollToHiddenSection();
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-300 cursor-pointer border ${
                    highlightHiddenBtn
                      ? "bg-blue-600/30 border-blue-400 text-blue-200 ring-2 ring-blue-500/60 shadow-lg shadow-blue-500/50 animate-pulse"
                      : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/50 hover:border-slate-600"
                  }`}
                  title="Click to view and unhide hidden time slots"
                >
                  <EyeOff
                    className={`size-3 transition-colors ${
                      highlightHiddenBtn ? "text-blue-300" : "text-slate-400"
                    }`}
                  />
                  <span className="font-semibold">
                    {hiddenCount} hidden
                  </span>
                </button>
              )}
            </div>
            {isCustomBoundaries && (
              <button
                onClick={resetBoundaries}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.08] transition-all cursor-pointer"
                title="Reset section times to default (6 AM, 12 PM, 6 PM)"
              >
                <RotateCcw className="size-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
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
                return h >= section.from && h <= section.to && !isSlotHidden(s.time);
              });
              if (sectionSlots.length === 0) return null;

              const isDraggingThis = draggingBoundary === section.dragKey;

              return (
                <div key={section.id} className="flex flex-col gap-2">
                  {/* Section Header */}
                  <div className="flex flex-col gap-1.5 pt-4 pb-1 select-none">
                    {/* Row 1: Badge + line + stats */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1.5 rounded-full ${section.bg} px-2.5 py-1 ${section.color} border ${section.border}`}
                      >
                        {section.icon}
                        <span className="text-[11px] font-bold uppercase tracking-wider">
                          {section.label}
                        </span>
                      </div>

                      {/* Price Pill (inline with badge) */}
                      {editingPrice === section.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-400">{sectionPrices.currency}</span>
                          <input
                            ref={priceInputRef}
                            type="text"
                            inputMode="numeric"
                            value={priceInput}
                            onChange={(e) => setPriceInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") savePrice(section.id);
                              if (e.key === "Escape") setEditingPrice(null);
                            }}
                            onBlur={() => savePrice(section.id)}
                            placeholder="0"
                            className="w-16 rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold text-white outline-none focus:ring-1 focus:ring-blue-500/40"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPrice(section.id);
                            setPriceInput(sectionPrices[section.id as keyof SectionPrices] || "");
                          }}
                          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all cursor-pointer border ${
                            sectionPrices[section.id as keyof SectionPrices]
                              ? `${section.bg} ${section.color} ${section.border}`
                              : "bg-white/[0.03] text-slate-600 border-dashed border-white/10 hover:border-white/20 hover:text-slate-400"
                          }`}
                          title={`Set price for ${section.label}`}
                        >
                          {sectionPrices[section.id as keyof SectionPrices] ? (
                            <span>{sectionPrices.currency}{sectionPrices[section.id as keyof SectionPrices]}</span>
                          ) : (
                            <>
                              <IndianRupee className="size-2.5" />
                              <span>Set price</span>
                            </>
                          )}
                        </button>
                      )}

                      <div className={`h-px flex-1 ${section.line}`} />
                      <span className="text-[10px] text-slate-600 tabular-nums">
                        {sectionSlots.filter((s) => s.status === "booked").length}/{sectionSlots.length}
                      </span>
                    </div>

                    {/* Row 2: Drag controls (only for adjustable sections) */}
                    {section.dragKey && (
                      <div className="flex items-center gap-1 pl-1">
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

                        <span className="text-[10px] text-slate-500 ml-1">
                          Starts at {formatHour(section.from)}
                        </span>
                      </div>
                    )}
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
                    type="button"
                    onClick={() => handleBookSlot(slot.time)}
                    className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-3.5 transition-all hover:border-blue-500/30 hover:bg-blue-500/[0.04] active:scale-[0.99] cursor-pointer"
                    id={`slot-${slot.time}`}
                  >
                    <div className="flex items-center gap-2 text-slate-600 group-hover:text-slate-500 transition-colors">
                      <Timer className="size-3.5" />
                      <span className="text-xs font-medium">
                        {formatTime(slot.time)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-600 group-hover:text-blue-400/70 transition-colors">
                      Tap to book
                    </span>
                  </button>
                )}

                {/* Booking / Edit Form */}
                {isEditing && (
                  <Card className="relative overflow-visible border-blue-500/40 bg-[#111827] ring-1 ring-blue-500/20">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Timer className="size-3.5" />
                        <span className="text-xs font-semibold">
                          {formatTime(slot.time)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          • {isBooked ? "Edit Booking" : "New Booking"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Eye icon to hide this row */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSlot(null);
                            handleHideSlot(slot.time);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] hover:bg-white/10 hover:border-blue-500/40 px-2.5 py-1 text-xs font-medium text-slate-200 hover:text-white active:scale-95 transition-all cursor-pointer shadow-sm"
                          title={`Hide ${formatTime(slot.time)} time slot`}
                        >
                          <Eye className="size-3.5 text-blue-400" />
                          <span>Hide</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSlot(null)}
                          className="rounded-md p-1 text-slate-500 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
                          aria-label="Cancel"
                          title="Close"
                        >
                          <XCircle className="size-4" />
                        </button>
                      </div>
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
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                            <Smartphone className="size-3" />
                            Phone Number
                            <span className="text-slate-600 normal-case tracking-normal">(optional)</span>
                          </label>
                          {phoneInput.trim() && (
                            <a
                              href={`tel:${phoneInput.trim()}`}
                              className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-2 py-0.5 text-[11px] font-medium text-blue-400 hover:bg-blue-500/30 transition-colors cursor-pointer"
                              title={`Call ${phoneInput.trim()}`}
                            >
                              <Phone className="size-2.5" />
                              <span>Call</span>
                            </a>
                          )}
                        </div>
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
                          {isBooked ? "Update Booking" : "Save Booking"}
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
                {isBooked && !isEditing && config && (
                  <div
                    onClick={() => handleEditSlot(slot)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleEditSlot(slot);
                      }
                    }}
                    className={`group relative flex items-center gap-3 rounded-xl border ${config.slotBorder} ${config.slotBg} px-4 py-3.5 transition-all cursor-pointer hover:border-blue-500/50 hover:bg-white/[0.05] active:scale-[0.99]`}
                    title="Tap to update booking details"
                  >
                    {/* Time + Player */}
                    <div className="flex flex-1 items-center gap-3 overflow-hidden">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-medium text-slate-500">
                          {formatTime(slot.time)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {slot.playerName}
                          </p>
                        </div>
                        {slot.phoneNumber && (
                          <div className="mt-1 flex items-center gap-2">
                            <a
                              href={`tel:${slot.phoneNumber}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-xs font-medium text-blue-400 hover:bg-blue-500/30 hover:border-blue-400 hover:text-blue-200 transition-all cursor-pointer shadow-sm active:scale-95"
                              title={`Call ${slot.phoneNumber}`}
                              aria-label={`Call ${slot.playerName} at ${slot.phoneNumber}`}
                            >
                              <Phone className="size-3 text-blue-400" />
                              <span>{slot.phoneNumber}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Payment Toggle & Delete */}
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Payment Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePayment(slot.time);
                        }}
                        className={`flex items-center gap-1.5 rounded-lg ${config.btnBg} px-3 py-1.5 transition-all active:scale-95 cursor-pointer`}
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
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelBooking(slot.time);
                        }}
                        className="flex items-center justify-center rounded-lg p-1.5 bg-red-500/10 text-red-400/70 transition-all hover:bg-red-500/20 hover:text-red-400 active:scale-95 cursor-pointer"
                        aria-label={`Cancel booking for ${slot.playerName}`}
                        title="Cancel booking"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
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

        {/* ── Hidden Slots Section ───────────────────────────────────── */}
        {hiddenCount > 0 && (
          <div
            ref={hiddenSectionRef}
            id="hidden-slots-section"
            className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0d1220]/70 p-4 backdrop-blur-sm transition-all"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3 select-none">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-full bg-slate-800/90 px-2.5 py-1 text-slate-300 border border-slate-700/60 shadow-sm">
                  <EyeOff className="size-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Hidden Slots
                  </span>
                  <span className="ml-0.5 rounded-full bg-slate-700/80 px-1.5 py-0.2 text-[10px] font-semibold text-slate-200">
                    {hiddenCount}
                  </span>
                </div>

                {/* Scope Pill Toggle */}
                <div className="flex items-center rounded-lg bg-white/[0.04] p-0.5 border border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setHideScope("all")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                      hideScope === "all"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="When hiding a slot, hide it across all days"
                  >
                    All Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setHideScope("date")}
                    className={`rounded-md px-2.5 py-1 font-medium transition-all ${
                      hideScope === "date"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="When hiding a slot, hide it only for the selected date"
                  >
                    This Day Only
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Unhide All Button */}
                <button
                  type="button"
                  onClick={handleUnhideAll}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white active:scale-95 transition-all cursor-pointer"
                  title="Restore all hidden slots"
                >
                  <RotateCcw className="size-3 text-slate-400" />
                  <span>Unhide All</span>
                </button>

                {/* Collapse / Expand Toggle */}
                <button
                  type="button"
                  onClick={() => setHiddenSectionOpen(!hiddenSectionOpen)}
                  className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                  aria-label={hiddenSectionOpen ? "Collapse hidden slots" : "Expand hidden slots"}
                >
                  <ChevronDown
                    className={`size-4 transition-transform duration-200 ${
                      hiddenSectionOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Hidden Slots List */}
            {hiddenSectionOpen && (
              <div className="flex flex-col gap-2 pt-1">
                {hiddenSlotsForDay.map((slot) => {
                  const isBooked = slot.status === "booked";
                  const hideType = getSlotHideType(slot.time);

                  return (
                    <div
                      key={`hidden-${slot.time}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-all hover:border-white/10 hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Timer className="size-3.5 text-slate-500" />
                          <span className="text-xs font-semibold text-slate-200">
                            {formatTime(slot.time)}
                          </span>
                        </div>

                        {isBooked ? (
                          <span className="rounded bg-blue-500/15 border border-blue-500/25 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                            Booked: {slot.playerName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">
                            Available
                          </span>
                        )}

                        <span className="hidden sm:inline-block rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-slate-500 uppercase tracking-wider">
                          {hideType === "all" ? "All days" : "This day"}
                        </span>
                      </div>

                      {/* Unhide Button */}
                      <button
                        type="button"
                        onClick={() => handleUnhideSlot(slot.time)}
                        className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-400 hover:bg-blue-500/25 hover:border-blue-500/50 hover:text-blue-300 active:scale-95 transition-all cursor-pointer"
                        title={`Unhide ${formatTime(slot.time)} and show it back in the schedule`}
                      >
                        <Eye className="size-3.5" />
                        <span>Unhide</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {visibleDaySlots.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-white/[0.04]">
              <EyeOff className="size-5 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">All time slots are hidden</p>
            <p className="text-xs text-slate-600">
              You can restore time slots using the Hidden Slots section below
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnhideAll}
              className="mt-2 border-white/10 text-xs text-slate-300 hover:text-white"
            >
              Unhide All Slots
            </Button>
          </div>
        ) : bookedSlots.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-white/[0.04]">
              <CalendarDays className="size-5 text-slate-600" />
            </div>
            <p className="text-sm text-slate-500">No bookings yet</p>
            <p className="text-xs text-slate-600">
              Tap any time slot above to start booking
            </p>
          </div>
        ) : null}
      </main>

    </div>
  );
}
