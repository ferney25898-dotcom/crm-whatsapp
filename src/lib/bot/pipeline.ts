import { prisma } from "@/lib/prisma";
import { emitAppEvent } from "@/lib/events";
import { getSettings } from "@/lib/settings";
import { generateReply } from "@/lib/bot/engine";
import type { TrainedProduct } from "@/lib/bot/prompt";
import { createOrderFromBot } from "@/lib/orders";
import { sendText, sendTyping } from "@/lib/whatsapp/manager";

export type IncomingMessage = {
  sessionId: string;
  /** Direccion exacta de WhatsApp a la que hay que responder. */
  waJid: string;
  phone: string;
  pushName?: string;
  body: string;
  mediaType?: string | null;
  waMessageId?: string;
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Guarda el motivo por el que el bot no pudo responder para que se vea en el
 * panel, en vez de quedarse solo en la consola del servidor.
 */
async function reportBotError(conversationId: string, context: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[bot] ${context}: ${detail}`);
  await prisma.conversation
    .update({ where: { id: conversationId }, data: { lastBotError: `${context}: ${detail}` } })
    .catch(() => null);
  emitAppEvent({ type: "conversation", conversationId });
}

function matchesHandoff(text: string, keywords: string): boolean {
  const body = text.toLowerCase();
  return keywords
    .split(",")
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean)
    .some((word) => body.includes(word));
}

/** Guarda un mensaje enviado por nosotros (bot o asesor) y avisa al panel. */
export async function recordOutgoing(params: {
  conversationId: string;
  body: string;
  sender: "bot" | "agent" | "system";
}) {
  await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      direction: "out",
      sender: params.sender,
      body: params.body,
    },
  });
  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { lastMessageAt: new Date() },
  });
  emitAppEvent({ type: "message", conversationId: params.conversationId });
}

/**
 * Punto de entrada de todo mensaje que llega por WhatsApp:
 * guarda el chat, decide si responde el bot y crea el pedido al cerrarse la venta.
 */
export async function handleIncomingMessage(incoming: IncomingMessage): Promise<void> {
  const settings = await getSettings();

  // Evita procesar dos veces el mismo mensaje si WhatsApp lo reenvia.
  if (incoming.waMessageId) {
    const seen = await prisma.message.findUnique({ where: { waMessageId: incoming.waMessageId } });
    if (seen) return;
  }

  const contact = await prisma.contact.upsert({
    where: { phone: incoming.phone },
    update: { waJid: incoming.waJid, ...(incoming.pushName ? { name: incoming.pushName } : {}) },
    create: { phone: incoming.phone, waJid: incoming.waJid, name: incoming.pushName ?? null },
  });

  const session = await prisma.whatsappSession.findUnique({ where: { id: incoming.sessionId } });

  let conversation = await prisma.conversation.findFirst({
    where: { contactId: contact.id, status: { not: "closed" } },
    orderBy: { lastMessageAt: "desc" },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        contactId: contact.id,
        sessionId: incoming.sessionId,
        productId: session?.defaultProductId ?? null,
        botEnabled: settings.botEnabledByDefault,
        status: settings.botEnabledByDefault ? "bot" : "human",
      },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "in",
      sender: "customer",
      body: incoming.body,
      mediaType: incoming.mediaType ?? null,
      waMessageId: incoming.waMessageId ?? null,
    },
  });

  conversation = await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), unread: { increment: 1 }, sessionId: incoming.sessionId },
  });

  // Un chat abierto antes de configurar el producto se queda sin ficha, asi que
  // adoptamos el producto por defecto del numero en cuanto exista.
  if (!conversation.productId && session?.defaultProductId) {
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { productId: session.defaultProductId },
    });
  }

  emitAppEvent({ type: "message", conversationId: conversation.id });

  // A partir de aqui decide el bot.
  if (!settings.aiEnabled || !conversation.botEnabled || conversation.status !== "bot") return;

  if (matchesHandoff(incoming.body, settings.handoffKeywords)) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "human", botEnabled: false },
    });
    await sendText(
      incoming.sessionId,
      incoming.waJid,
      "Claro, en un momento te contacta un asesor.",
    ).catch(() => null);
    await recordOutgoing({
      conversationId: conversation.id,
      body: "Claro, en un momento te contacta un asesor.",
      sender: "system",
    });
    emitAppEvent({ type: "conversation", conversationId: conversation.id });
    return;
  }

  const product = conversation.productId
    ? ((await prisma.product.findUnique({
        where: { id: conversation.productId },
        include: { faqs: { orderBy: { order: "asc" } }, objections: { orderBy: { order: "asc" } } },
      })) as TrainedProduct | null)
    : null;

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 60,
  });

  let result;
  try {
    result = await generateReply({
      settings,
      product,
      history,
      contactName: contact.name,
      summary: conversation.summary,
    });
  } catch (error) {
    await reportBotError(conversation.id, "No se pudo generar la respuesta", error);
    return;
  }

  if (!result?.reply) return;

  await sendTyping(incoming.sessionId, incoming.waJid);
  if (settings.responseDelaySec > 0) await wait(settings.responseDelaySec * 1000);

  try {
    await sendText(incoming.sessionId, incoming.waJid, result.reply);
  } catch (error) {
    await reportBotError(conversation.id, "No se pudo enviar la respuesta", error);
    return;
  }

  if (conversation.lastBotError) {
    await prisma.conversation.update({ where: { id: conversation.id }, data: { lastBotError: null } });
  }

  await recordOutgoing({ conversationId: conversation.id, body: result.reply, sender: "bot" });

  // Guarda lo que el bot ya sabe del cliente para no volver a preguntarlo.
  const customer = result.customer;
  const contactUpdate: Record<string, string> = {};
  if (customer.name && !contact.name) contactUpdate.name = customer.name;
  if (customer.city) contactUpdate.city = customer.city;
  if (customer.department) contactUpdate.department = customer.department;
  if (customer.address) contactUpdate.address = customer.address;
  if (Object.keys(contactUpdate).length) {
    await prisma.contact.update({ where: { id: contact.id }, data: contactUpdate });
  }

  const shouldHandoff = result.handoff || (result.sale_confirmed && product?.handoffAfterSale);

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      stage: result.sale_confirmed ? "confirmado" : result.stage,
      status: shouldHandoff ? "human" : "bot",
      botEnabled: shouldHandoff ? false : conversation.botEnabled,
    },
  });
  emitAppEvent({ type: "conversation", conversationId: conversation.id });

  if (!result.sale_confirmed) return;

  // No dupliques el pedido si ya se habia creado en esta conversacion.
  const existing = await prisma.order.findFirst({ where: { conversationId: conversation.id } });
  if (existing) return;

  const order = await createOrderFromBot({
    contactId: contact.id,
    conversationId: conversation.id,
    customer,
    fallbackPhone: incoming.phone,
    product,
  });

  if (settings.dropiEnabled && settings.dropiAutoSend) {
    const { sendOrderToDropi } = await import("@/lib/dropi/client");
    await sendOrderToDropi(order.id).catch((error) =>
      console.error("[dropi] no se pudo enviar el pedido automatico", error),
    );
  }
}
