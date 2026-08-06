import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRuntimeStatus } from "@/lib/whatsapp/manager";
import { ensureAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const sessions = await prisma.whatsappSession.findMany({
    orderBy: { createdAt: "asc" },
    include: { defaultProduct: { select: { id: true, name: true } } },
  });
  return NextResponse.json(
    sessions.map((session) => ({ ...session, runtime: getRuntimeStatus(session.id) })),
  );
}

export async function POST(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const body = await request.json();
  const session = await prisma.whatsappSession.create({
    data: {
      name: body.name?.trim() || "Numero nuevo",
      provider: body.provider === "cloud" ? "cloud" : "baileys",
      defaultProductId: body.defaultProductId || null,
    },
  });
  return NextResponse.json(session, { status: 201 });
}
