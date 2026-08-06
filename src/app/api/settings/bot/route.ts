import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSettings, resolveAiKey } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Prueba el motor del bot sin pasar por WhatsApp: sirve para saber si la API
 * key y el modelo estan bien configurados antes de culpar a otra cosa.
 */
export async function POST() {
  const settings = await getSettings();

  if (!settings.aiEnabled) {
    return NextResponse.json(
      { ok: false, message: 'El bot esta apagado. Marca "El bot responde automaticamente" y guarda.' },
      { status: 400 },
    );
  }

  const apiKey = resolveAiKey(settings);
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "Falta la API key de Claude. Pegala arriba y presiona Guardar." },
      { status: 400 },
    );
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: settings.aiModel,
      max_tokens: 64,
      messages: [{ role: "user", content: 'Responde unicamente con la palabra: listo' }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return NextResponse.json({
      ok: true,
      message: `El bot funciona. Modelo ${settings.aiModel}, respondio: "${text}".`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
