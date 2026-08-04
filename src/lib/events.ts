import { EventEmitter } from "node:events";

/**
 * Bus de eventos en memoria. El panel se suscribe por SSE para ver
 * mensajes nuevos y cambios de estado sin recargar la pagina.
 */
export type AppEvent =
  | { type: "session"; sessionId: string }
  | { type: "message"; conversationId: string }
  | { type: "conversation"; conversationId: string }
  | { type: "order"; orderId: string };

const globalForBus = globalThis as unknown as { appBus?: EventEmitter };

export const bus = globalForBus.appBus ?? new EventEmitter();
bus.setMaxListeners(100);
globalForBus.appBus = bus;

export function emitAppEvent(event: AppEvent) {
  bus.emit("app", event);
}
