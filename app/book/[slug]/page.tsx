import { notFound } from "next/navigation";
import { getTenantBySlug } from "@/lib/tenant";
import { getTenantPrices, getTenantBoundaries, getTenantHiddenSlots, getTenantGallery } from "@/lib/actions";
import { BookingClient } from "./booking-client";

// Dynamic route — no static generation
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/book/[slug]">) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);
  if (!tenant) return { title: "Venue Not Found" };

  return {
    title: `Book ${tenant.venueName} | Futsal`,
    description: tenant.description || `Book your futsal slot at ${tenant.venueName}`,
  };
}

export default async function BookingPage({ params }: PageProps<"/book/[slug]">) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  const [prices, boundaries, hiddenSlots, gallery] = await Promise.all([
    getTenantPrices(tenant.id),
    getTenantBoundaries(tenant.id),
    getTenantHiddenSlots(tenant.id),
    getTenantGallery(tenant.id),
  ]);

  return (
    <BookingClient
      tenantId={tenant.id}
      venueName={tenant.venueName}
      address={tenant.address}
      description={tenant.description}
      slotDuration={tenant.slotDuration}
      logoUrl={tenant.logoUrl}
      sectionPrices={prices}
      sectionBoundaries={boundaries}
      hiddenSlots={hiddenSlots}
      gallery={gallery}
    />
  );
}
