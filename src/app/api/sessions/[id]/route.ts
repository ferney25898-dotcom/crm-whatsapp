import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetSession, startSession, stopSession } from "@/lib/whatsapp/manager";
import { ensureAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { id } = await params;
  const session = await prisma.whatsappSession.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(session);
}

export async function PATCH(request: Request, { params }: Context) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();

  // Acciones de conexion.
  if (body.action === "start") {
    await startSession(id);
    return NextResponse.json(await prisma.whatsappSession.findUnique({ where: { id } }));
  }
  if (body.action === "stop") {
    await stopSession(id);
    return NextResponse.json(await prisma.whatsappSession.findUnique({ where: { id } }));
  }
  if (body.action === "reset") {
    await resetSession(id);
    return NextResponse.json(await prisma.whatsappSession.findUnique({ where: { id } }));
  }

  const session = await prisma.whatsappSession.update({
    where: { id },
    data: {
      name: body.name,
      isActive: body.isActive,
      autoStart: body.autoStart,
      defaultProductId: body.defaultProductId === "" ? null : body.defaultProductId,
      cloudPhoneNumberId: body.cloudPhoneNumberId,
      cloudToken: body.cloudToken,
      cloudVerifyToken: body.cloudVerifyToken,
    },
  });
  return NextResponse.json(session);
}

export async function DELETE(_request: Request, { params }: Context) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { id } = await params;
  await resetSession(id).catch(() => null);
  await prisma.whatsappSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
