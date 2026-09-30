"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { TIME_SLOTS, createEmptySlots, DEFAULT_SECTION_BOUNDARIES, type TimeSlot, type SectionBoundaries } from "@/lib/futsal-types";

// ─── Date Helpers ────────────────────────────────────────────────────
function toDateOnly(dateStr: string): Date {
  // Parse "YYYY-MM-DD" into a Date at midnight UTC to avoid timezone issues
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// ─── Get current user's tenant ID ────────────────────────────────────
async function getMyTenantId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

// ─── Get Schedule for a Date (Manager View — full details) ───────────
export async function getSchedule(dateKey: string): Promise<TimeSlot[]> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return createEmptySlots();

  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      bookingDate: toDateOnly(dateKey),
    },
  });

  return TIME_SLOTS.map((time) => {
    const booking = bookings.find((b) => b.timeSlot === time);
    if (booking) {
      return {
        time,
        status: "booked" as const,
        playerName: booking.playerName,
        phoneNumber: booking.phoneNumber,
        paymentStatus: booking.paymentStatus as "paid" | "unpaid",
      };
    }
    return {
      time,
      status: "available" as const,
      playerName: "",
      phoneNumber: "",
      paymentStatus: "unpaid" as const,
    };
  });
}

// ─── Get Public Schedule by Tenant ID (no phone numbers) ─────────────
export async function getPublicSchedule(
  tenantId: string,
  dateKey: string
): Promise<TimeSlot[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      tenantId,
      bookingDate: toDateOnly(dateKey),
    },
  });

  return TIME_SLOTS.map((time) => {
    const booking = bookings.find((b) => b.timeSlot === time);
    if (booking) {
      // Player bookings only show as "booked" if manager marked as paid
      // Manager bookings always show as "booked" regardless of payment status
      const isConfirmed =
        booking.source === "manager" || booking.paymentStatus === "paid";

      if (isConfirmed) {
        return {
          time,
          status: "booked" as const,
          playerName: booking.playerName,
          phoneNumber: "", // Hide phone from public view
          paymentStatus: "unpaid" as const, // Hide payment from public view
        };
      }
    }
    return {
      time,
      status: "available" as const,
      playerName: "",
      phoneNumber: "",
      paymentStatus: "unpaid" as const,
    };
  });
}

// ─── Book a Slot (Player Action — via public booking page) ───────────
export async function bookSlot(
  tenantId: string,
  dateKey: string,
  timeSlot: string,
  playerName: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  // Phone number is required
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return { success: false, error: "Phone number is required." };
  }

  try {
    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (!tenant) return { success: false, error: "Venue not found." };

    await prisma.booking.create({
      data: {
        tenantId,
        bookingDate: toDateOnly(dateKey),
        timeSlot,
        playerName,
        phoneNumber: phoneNumber.trim(),
        paymentStatus: "unpaid",
        source: "player",
      },
    });
    revalidatePath("/");
    revalidatePath(`/book/${tenant.slug}`);
    return { success: true };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return {
        success: false,
        error: "This slot has already been booked by someone else.",
      };
    }
    return { success: false, error: "Failed to book slot. Please try again." };
  }
}

// ─── Manager: Book a Slot ────────────────────────────────────────────
export async function managerBookSlot(
  dateKey: string,
  timeSlot: string,
  playerName: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return { success: false, error: "No venue configured. Complete onboarding first." };

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (!tenant) return { success: false, error: "Venue not found." };

    await prisma.booking.create({
      data: {
        tenantId,
        bookingDate: toDateOnly(dateKey),
        timeSlot,
        playerName,
        phoneNumber: phoneNumber?.trim() || "",
        paymentStatus: "paid",
        source: "manager",
      },
    });
    revalidatePath("/");
    revalidatePath(`/book/${tenant.slug}`);
    return { success: true };
  } catch (error: unknown) {
    console.error("managerBookSlot error:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return { success: false, error: "This slot is already booked." };
    }
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Failed to book slot: ${msg}` };
  }
}

// ─── Update Booking (Manager Action) ─────────────────────────────────
export async function updateBooking(
  dateKey: string,
  timeSlot: string,
  playerName: string,
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getMyTenantId();
    if (!tenantId) return { success: false, error: "Not authenticated" };

    await prisma.booking.updateMany({
      where: {
        tenantId,
        bookingDate: toDateOnly(dateKey),
        timeSlot,
      },
      data: {
        playerName,
        phoneNumber: phoneNumber || "",
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update booking." };
  }
}

// ─── Toggle Payment Status (Manager Action) ──────────────────────────
export async function togglePaymentStatus(
  dateKey: string,
  timeSlot: string
): Promise<{ success: boolean }> {
  try {
    const tenantId = await getMyTenantId();
    if (!tenantId) return { success: false };

    const booking = await prisma.booking.findFirst({
      where: {
        tenantId,
        bookingDate: toDateOnly(dateKey),
        timeSlot,
      },
    });
    if (!booking) return { success: false };

    const newStatus = booking.paymentStatus === "paid" ? "unpaid" : "paid";
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: newStatus },
    });
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Cancel Booking (Manager Action) ─────────────────────────────────
export async function cancelBooking(
  dateKey: string,
  timeSlot: string
): Promise<{ success: boolean }> {
  try {
    const tenantId = await getMyTenantId();
    if (!tenantId) return { success: false };

    await prisma.booking.deleteMany({
      where: {
        tenantId,
        bookingDate: toDateOnly(dateKey),
        timeSlot,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ─── Onboarding: Create Tenant ───────────────────────────────────────
export async function createTenant(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const venueName = (formData.get("venueName") as string)?.trim();
  const slug = (formData.get("slug") as string)?.trim().toLowerCase();
  const address = (formData.get("address") as string)?.trim() || "";
  const description = (formData.get("description") as string)?.trim() || "";

  if (!venueName || !slug) {
    return { success: false, error: "Venue name and URL slug are required." };
  }

  // Validate slug format
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return { success: false, error: "URL slug can only contain lowercase letters, numbers, and hyphens." };
  }

  // Check if user already has a tenant
  const existing = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    return { success: false, error: "You already have a venue set up." };
  }

  try {
    await prisma.tenant.create({
      data: {
        userId: session.user.id,
        slug,
        venueName,
        address,
        description,
      },
    });
    return { success: true };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return { success: false, error: "This URL slug is already taken. Please choose another." };
    }
    return { success: false, error: "Failed to create venue." };
  }
}

// ─── Update Tenant Info (Manager Action) ─────────────────────────────
export async function updateTenant(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Not authenticated" };

  const venueName = (formData.get("venueName") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || "";
  const address = (formData.get("address") as string)?.trim() || "";
  const logoUrl = formData.get("logoUrl") as string | null;

  if (!venueName) {
    return { success: false, error: "Venue name is required." };
  }

  try {
    const data: Record<string, string> = { venueName, description, address };
    if (logoUrl !== null) {
      data.logoUrl = logoUrl;
    }
    await prisma.tenant.update({
      where: { userId: session.user.id },
      data,
    });
    revalidatePath("/");
    revalidatePath("/link");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to update venue info." };
  }
}

// ─── Migrate Local Data to Cloud ─────────────────────────────────────
export async function migrateLocalData(
  schedule: Record<string, TimeSlot[]>
): Promise<{ migrated: number; skipped: number }> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return { migrated: 0, skipped: 0 };
  let migrated = 0;
  let skipped = 0;

  for (const [dateKey, slots] of Object.entries(schedule)) {
    const bookedSlots = slots.filter((s) => s.status === "booked");
    for (const slot of bookedSlots) {
      try {
        await prisma.booking.create({
          data: {
            tenantId,
            bookingDate: toDateOnly(dateKey),
            timeSlot: slot.time,
            playerName: slot.playerName,
            phoneNumber: slot.phoneNumber || "",
            paymentStatus: slot.paymentStatus || "unpaid",
          },
        });
        migrated++;
      } catch {
        // Already exists or other error — skip
        skipped++;
      }
    }
  }

  revalidatePath("/");
  return { migrated, skipped };
}

// ─── Section Prices ──────────────────────────────────────────────────

export interface SectionPrices {
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
  currency: string;
}

const DEFAULT_PRICES: SectionPrices = {
  morning: "",
  afternoon: "",
  evening: "",
  night: "",
  currency: "₹",
};

export async function getSectionPrices(): Promise<SectionPrices> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return DEFAULT_PRICES;

  const setting = await prisma.courtSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "section-prices" } },
  });

  if (!setting) return DEFAULT_PRICES;
  return { ...DEFAULT_PRICES, ...(setting.value as object) };
}

export async function getTenantPrices(tenantId: string): Promise<SectionPrices> {
  const setting = await prisma.courtSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "section-prices" } },
  });

  if (!setting) return DEFAULT_PRICES;
  return { ...DEFAULT_PRICES, ...(setting.value as object) };
}

export async function updateSectionPrices(
  prices: Omit<SectionPrices, "currency"> & { currency?: string }
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return { success: false, error: "No venue configured." };

  try {
    await prisma.courtSetting.upsert({
      where: { tenantId_key: { tenantId, key: "section-prices" } },
      create: {
        tenantId,
        key: "section-prices",
        value: prices as object,
      },
      update: {
        value: prices as object,
      },
    });
    revalidatePath("/");
    revalidatePath("/link");
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save prices." };
  }
}

// ─── Section Boundaries ──────────────────────────────────────────────

export async function getBoundaries(): Promise<SectionBoundaries> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return DEFAULT_SECTION_BOUNDARIES;

  const setting = await prisma.courtSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "section-boundaries" } },
  });

  if (!setting) return DEFAULT_SECTION_BOUNDARIES;
  return { ...DEFAULT_SECTION_BOUNDARIES, ...(setting.value as object) };
}

export async function getTenantBoundaries(tenantId: string): Promise<SectionBoundaries> {
  const setting = await prisma.courtSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "section-boundaries" } },
  });

  if (!setting) return DEFAULT_SECTION_BOUNDARIES;
  return { ...DEFAULT_SECTION_BOUNDARIES, ...(setting.value as object) };
}

export async function updateBoundaries(
  boundaries: SectionBoundaries
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return { success: false, error: "No venue configured." };

  try {
    await prisma.courtSetting.upsert({
      where: { tenantId_key: { tenantId, key: "section-boundaries" } },
      create: {
        tenantId,
        key: "section-boundaries",
        value: boundaries as object,
      },
      update: {
        value: boundaries as object,
      },
    });
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save boundaries." };
  }
}

// ─── Hidden Slots ────────────────────────────────────────────────────

export async function updateHiddenSlots(
  hiddenSlots: string[]
): Promise<{ success: boolean }> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return { success: false };

  try {
    await prisma.courtSetting.upsert({
      where: { tenantId_key: { tenantId, key: "hidden-slots" } },
      create: {
        tenantId,
        key: "hidden-slots",
        value: hiddenSlots as unknown as object,
      },
      update: {
        value: hiddenSlots as unknown as object,
      },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getHiddenSlots(): Promise<string[]> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return [];

  const setting = await prisma.courtSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "hidden-slots" } },
  });

  if (!setting) return [];
  const val = setting.value;
  if (Array.isArray(val)) return val as string[];
  return [];
}

export async function getTenantHiddenSlots(tenantId: string): Promise<string[]> {
  const setting = await prisma.courtSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "hidden-slots" } },
  });

  if (!setting) return [];
  const val = setting.value;
  if (Array.isArray(val)) return val as string[];
  return [];
}

// ─── Gallery Images ──────────────────────────────────────────────────

export interface GalleryItem {
  url: string;
  isVideo: boolean;
}

export async function updateGallery(
  items: GalleryItem[]
): Promise<{ success: boolean }> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return { success: false };

  try {
    await prisma.courtSetting.upsert({
      where: { tenantId_key: { tenantId, key: "gallery" } },
      create: {
        tenantId,
        key: "gallery",
        value: items as unknown as object,
      },
      update: {
        value: items as unknown as object,
      },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getGallery(): Promise<GalleryItem[]> {
  const tenantId = await getMyTenantId();
  if (!tenantId) return [];

  const setting = await prisma.courtSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "gallery" } },
  });

  if (!setting) return [];
  const val = setting.value;
  if (Array.isArray(val)) return val as unknown as GalleryItem[];
  return [];
}

export async function getTenantGallery(tenantId: string): Promise<GalleryItem[]> {
  const setting = await prisma.courtSetting.findUnique({
    where: { tenantId_key: { tenantId, key: "gallery" } },
  });

  if (!setting) return [];
  const val = setting.value;
  if (Array.isArray(val)) return val as unknown as GalleryItem[];
  return [];
}
