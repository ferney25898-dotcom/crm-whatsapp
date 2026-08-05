import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordOutgoing } from "@/lib/bot/pipeline";
import { jidFromPhone, sendText } from "@/lib/whatsapp/manager";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/** Envia un mensaje escrito por el asesor desde el panel. */
export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const { body } = await request.json();
  if (!body?.trim()) return NextResponse.json({ error: "Mensaje vacio" }, { status: 400 });

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { contact: true },
  });
  if (!conversation) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (!conversation.sessionId) {
    return NextResponse.json({ error: "El chat no tiene un numero asociado" }, { status: 400 });
  }

  try {
    const jid = conversation.contact.waJid ?? jidFromPhone(conversation.contact.phone);
    await sendText(conversation.sessionId, jid, body.trim());
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo enviar";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await recordOutgoing({ conversationId: id, body: body.trim(), sender: "agent" });
  return NextResponse.json({ ok: true }, { status: 201 });
}
