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
 * Dropi respondio "Access denied" en una ruta que si existe, asi que probamos
 * varias formas de mandar el token. La ruta de productos solo lista, no crea
 * nada, y con cuerpo vacio ninguna ruta de pedidos puede registrar un pedido.
 */
const AUTH_HEADERS: { label: string; header: (token: string) => Record<string, string> }[] = [
  { label: "dropi-integration-key", header: (t) => ({ "dropi-integration-key": t }) },
  { label: "dropi-integration-token", header: (t) => ({ "dropi-integration-token": t }) },
  { label: "Authorization: Bearer", header: (t) => ({ Authorization: `Bearer ${t}` }) },
  { label: "Authorization (sin Bearer)", header: (t) => ({ Authorization: t }) },
  { label: "X-Authorization", header: (t) => ({ "X-Authorization": t }) },
  { label: "x-api-key", header: (t) => ({ "x-api-key": t }) },
  { label: "integration-key", header: (t) => ({ "integration-key": t }) },
];

/** Rutas candidatas para crear el pedido, con el header por defecto. */
const ORDER_PATHS = [
  "/integrations/orders/create",
  "/integrations/create-order",
  "/integrations/createOrder",
  "/integrations/orders/add",
  "/integrations/upload-order",
  "/integrations/import-order",
];

export type DropiProbe = { path: string; status: number; snippet: string };

/**
 * Primero busca con que header acepta Dropi el token, y luego, si alguno
 * funciona, prueba los nombres candidatos del servicio que crea pedidos.
 */
export async function testDropiConnection(): Promise<{ ok: boolean; probes: DropiProbe[] }> {
  const settings = await getSettings();
  const token = settings.dropiToken?.trim();
  if (!token) throw new Error("Falta el token de integracion de Dropi");

  const probes: DropiProbe[] = [];

  async function probe(label: string, path: string, headers: Record<string, string>) {
    try {
      const response = await fetch(joinUrl(settings.dropiBaseUrl, path), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
        body: "{}",
      });
      const raw = await response.text();
      probes.push({ path: label, status: response.status, snippet: raw.slice(0, 220) });
      return response.status;
    } catch (error) {
      probes.push({
        path: label,
        status: 0,
        snippet: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  // 1. Que header acepta el token, sobre una ruta que ya sabemos que existe.
  let working: ((token: string) => Record<string, string>) | null = null;
  for (const auth of AUTH_HEADERS) {
    const status = await probe(`AUTH ${auth.label}`, "/integrations/products", auth.header(token));
    if (status !== 401 && status !== 403 && status !== 0 && !working) working = auth.header;
  }

  // 2. Con el header que paso, buscamos el nombre del servicio de pedidos.
  if (working) {
    for (const path of ORDER_PATHS) {
      await probe(`RUTA ${path}`, path, working(token));
    }
  }

  return { ok: Boolean(working), probes };
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
