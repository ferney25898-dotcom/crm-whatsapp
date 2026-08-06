import { bus, type AppEvent } from "@/lib/events";
import { ensureUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Canal en vivo para el panel: mensajes nuevos, cambios de estado de los
 * numeros y pedidos creados, sin tener que recargar.
 */
export async function GET() {
  const denied = await ensureUser();
  if (denied) return denied;

  const encoder = new TextEncoder();
  let listener: ((event: AppEvent) => void) | null = null;
  let heartbeat: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const push = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // el cliente ya cerro la conexion
        }
      };

      push(": conectado\n\n");

      listener = (event: AppEvent) => push(`data: ${JSON.stringify(event)}\n\n`);
      bus.on("app", listener);

      // Latido para que proxies y navegadores no corten la conexion.
      heartbeat = setInterval(() => push(": ping\n\n"), 25_000);
    },
    cancel() {
      if (listener) bus.off("app", listener);
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
