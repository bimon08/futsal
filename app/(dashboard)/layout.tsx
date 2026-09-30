import { BottomNav } from "@/components/bottom-nav";
import { requireTenant } from "@/lib/tenant";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // This will redirect to /auth/signin if not logged in,
  // and to /onboarding if no venue is set up yet.
  await requireTenant();

  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
