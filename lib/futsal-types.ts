export type PaymentStatus = "unpaid" | "paid";

export interface TimeSlot {
  time: string; // "06:00", "07:00", etc.
  status: "available" | "booked";
  playerName: string;
  phoneNumber: string;
  paymentStatus: PaymentStatus;
}

export interface DaySchedule {
  [date: string]: TimeSlot[];
}

export interface SectionBoundaries {
  morningStart: number;
  afternoonStart: number;
  eveningStart: number;
}

export const DEFAULT_SECTION_BOUNDARIES: SectionBoundaries = {
  morningStart: 6,
  afternoonStart: 12,
  eveningStart: 18,
};

export const TIME_SLOTS = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

export function formatHour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour === 12) return "12:00 PM";
  if (hour < 12) return `${hour}:00 AM`;
  return `${hour - 12}:00 PM`;
}

export function formatTime(time: string): string {
  const [hours] = time.split(":");
  const h = parseInt(hours, 10);
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

export function createEmptySlots(): TimeSlot[] {
  return TIME_SLOTS.map((time) => ({
    time,
    status: "available" as const,
    playerName: "",
    phoneNumber: "",
    paymentStatus: "unpaid" as PaymentStatus,
  }));
}
