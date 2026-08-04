import Anthropic from "@anthropic-ai/sdk";
import type { MessageModel, SettingsModel } from "@/generated/prisma/models";
import { REPLY_SCHEMA, buildSystemPrompt, type TrainedProduct } from "@/lib/bot/prompt";
import { resolveAiKey } from "@/lib/settings";

export type CustomerData = {
  name: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  quantity: number;
  variant: string;
  notes: string;
};

export type BotReply = {
  reply: string;
  stage: string;
  sale_confirmed: boolean;
  handoff: boolean;
  customer: CustomerData;
};

/** Cuantos mensajes del historial se le pasan al modelo. */
const HISTORY_LIMIT = 24;

function toApiMessages(history: MessageModel[]): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  for (const message of history) {
    const role = message.direction === "in" ? "user" : "assistant";
    const body = message.body.trim() || (message.mediaType ? `[el cliente envio ${message.mediaType}]` : "");
    if (!body) continue;
    messages.push({ role, content: body });
  }
  // La conversacion siempre debe empezar por el cliente.
  while (messages.length && messages[0].role === "assistant") messages.shift();
  return messages;
}

function emptyCustomer(): CustomerData {
  return { name: "", phone: "", address: "", city: "", department: "", quantity: 1, variant: "", notes: "" };
}

/**
 * Le pide al modelo la siguiente respuesta del bot junto con los datos
 * del cliente que haya logrado recoger hasta ahora.
 */
export async function generateReply(params: {
  settings: SettingsModel;
  product: TrainedProduct | null;
  history: MessageModel[];
  contactName?: string | null;
  summary?: string | null;
}): Promise<BotReply | null> {
  const { settings, product, history, contactName, summary } = params;

  const apiKey = resolveAiKey(settings);
  if (!apiKey) throw new Error("Falta la API key de IA en Configuracion");

  const messages = toApiMessages(history.slice(-HISTORY_LIMIT));
  if (!messages.length) return null;

  let system = buildSystemPrompt(settings, product, contactName);
  if (summary?.trim()) system += `\n\n# LO QUE YA SE HABLO\n${summary.trim()}`;

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: settings.aiModel,
    max_tokens: settings.aiMaxTokens,
    system,
    messages,
    output_config: { format: { type: "json_schema", schema: REPLY_SCHEMA } },
  });

  if (response.stop_reason === "refusal") return null;

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
  if (!text.trim()) return null;

  let parsed: Partial<BotReply>;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Si el modelo no devolvio JSON valido, usamos el texto tal cual.
    return {
      reply: text.trim(),
      stage: "interesado",
      sale_confirmed: false,
      handoff: false,
      customer: emptyCustomer(),
    };
  }

  return {
    reply: (parsed.reply ?? "").trim(),
    stage: parsed.stage ?? "interesado",
    sale_confirmed: Boolean(parsed.sale_confirmed),
    handoff: Boolean(parsed.handoff),
    customer: { ...emptyCustomer(), ...(parsed.customer ?? {}) },
  };
}
