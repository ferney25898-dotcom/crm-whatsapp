import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitAppEvent } from "@/lib/events";
import { ensureAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      contact: true,
      product: true,
      session: { select: { id: true, name: true, status: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 200 },
      orders: { select: { id: true, number: true, status: true } },
    },
  });
  if (!conversation) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  if (conversation.unread > 0) {
    await prisma.conversation.update({ where: { id }, data: { unread: 0 } });
  }
  return NextResponse.json(conversation);
}

export async function PATCH(request: Request, { params }: Context) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();

  const conversation = await prisma.conversation.update({
    where: { id },
    data: {
      botEnabled: body.botEnabled,
      status: body.status,
      stage: body.stage,
      productId: body.productId === "" ? null : body.productId,
      unread: body.unread,
    },
  });
  emitAppEvent({ type: "conversation", conversationId: id });
  return NextResponse.json(conversation);
}
