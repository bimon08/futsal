import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { userId: session.user.id },
    select: { slug: true, venueName: true, address: true, description: true, logoUrl: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: "No tenant" }, { status: 404 });
  }

  return NextResponse.json({
    ...tenant,
    userName: session.user.name,
    userImage: session.user.image,
  });
}
