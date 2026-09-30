import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

/**
 * Get the current authenticated user's tenant.
 * Redirects to /onboarding if no tenant is set up.
 * Redirects to /auth/signin if not authenticated.
 */
export async function requireTenant() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const tenant = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
  });

  if (!tenant) {
    redirect("/onboarding");
  }

  return { session, tenant };
}

/**
 * Get the current authenticated user (without requiring tenant).
 * For use in onboarding page.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  return session;
}

/**
 * Get tenant by slug (for public booking page).
 * Returns null if not found.
 */
export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
  });
}
