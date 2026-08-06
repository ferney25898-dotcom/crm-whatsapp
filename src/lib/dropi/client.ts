import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { emitAppEvent } from "@/lib/events";

/**
 * Cliente de la API de integraciones de Dropi.
 *
 * Dropi no publica documentacion oficial: la integracion se autentica con el
 * token que se genera en el panel (seccion "Mis Integraciones") y se envia en
 * el header `dropi-integration-key`. Como la ruta exacta puede cambiar segun el
 * pais, se deja configurable en Configuracion y guardamos siempre la respuesta
 * completa del servidor para poder ajustarla sin tocar el codigo.
 */

export type DropiResult = {
  ok: boolean;
  status: number;
  /** Respuesta cruda de Dropi, util para depurar. */
  raw: string;
  orderId?: string;
  guide?: string;
};

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function request(path: string, body: unknown): Promise<DropiResult> {
  const settings = await getSettings();
  if (!settings.dropiToken?.trim()) throw new Error("Falta el token de integracion de Dropi");

  const response = await fetch(joinUrl(settings.dropiBaseUrl, path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "dropi-integration-key": settings.dropiToken.trim(),
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Dropi puede responder texto plano en los errores.
  }

  const data = (parsed.data ?? parsed) as Record<string, unknown>;
  const isError = parsed.isSuccess === false || parsed.error != null;

  return {
    ok: response.ok && !isError,
    status: response.status,
    raw,
    orderId: data?.id != null ? String(data.id) : undefined,
    guide: typeof data?.tracking_number === "string" ? data.tracking_number : undefined,
  };
}

/**
 * Rutas de solo lectura que se prueban para descubrir como responde la cuenta.
 * Dropi no publica su documentacion y el prefijo cambia entre paises y planes,
 * asi que preguntamos y dejamos que el usuario vea el resultado de cada una.
 */
const PROBE_PATHS = [
  "/integrations/products",
  "/integrations/orders",
  "/api/integrations/products",
  "/api/products",
  "/orders/myorders",
  "/api/orders/myorders",
];

export type DropiProbe = { path: string; status: number; snippet: string };

/** Prueba el token contra varias rutas y devuelve que respondio cada una. */
export async function testDropiConnection(): Promise<{ ok: boolean; probes: DropiProbe[] }> {
  const settings = await getSettings();
  if (!settings.dropiToken?.trim()) throw new Error("Falta el token de integracion de Dropi");

  const probes: DropiProbe[] = [];
  for (const path of PROBE_PATHS) {
    try {
      const response = await fetch(joinUrl(settings.dropiBaseUrl, path), {
        headers: {
          Accept: "application/json",
          "dropi-integration-key": settings.dropiToken.trim(),
        },
      });
      const raw = await response.text();
      probes.push({ path, status: response.status, snippet: raw.slice(0, 200) });
    } catch (error) {
      probes.push({
        path,
        status: 0,
        snippet: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { ok: probes.some((probe) => probe.status === 200), probes };
}

/** Envia un pedido ya confirmado a Dropi y guarda el resultado. */
export async function sendOrderToDropi(orderId: string): Promise<DropiResult> {
  const settings = await getSettings();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw new Error("Pedido no encontrado");

  const payload = {
    name: order.customerName,
    surname: "",
    phone: order.phone,
    phone2: order.phone2 ?? "",
    dir: order.address,
    city: order.city,
    department: order.department,
    notes: order.notes,
    total_order: order.total,
    shipping_value: order.shippingCost,
    type: "CON RECAUDO",
    products: order.items.map((item) => ({
      id: item.product?.dropiProductId ? Number(item.product.dropiProductId) : undefined,
      variation_id: item.product?.dropiVariationId ? Number(item.product.dropiVariationId) : undefined,
      warehouse_id: item.product?.dropiWarehouseId ? Number(item.product.dropiWarehouseId) : undefined,
      name: item.productName,
      quantity: item.quantity,
      price: item.unitPrice,
    })),
  };

  let result: DropiResult;
  try {
    result = await request(settings.dropiOrderPath, payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "error", dropiResponse: message },
    });
    emitAppEvent({ type: "order", orderId });
    throw error;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: result.ok ? "enviado" : "error",
      dropiOrderId: result.orderId ?? null,
      dropiGuide: result.guide ?? null,
      dropiResponse: result.raw.slice(0, 4000),
      sentAt: result.ok ? new Date() : null,
    },
  });
  emitAppEvent({ type: "order", orderId });

  return result;
}
