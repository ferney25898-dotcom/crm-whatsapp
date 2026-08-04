import { prisma } from "@/lib/prisma";
import { emitAppEvent } from "@/lib/events";
import type { CustomerData } from "@/lib/bot/engine";

/** Numero corto consecutivo para el pedido. */
async function nextOrderNumber(): Promise<number> {
  const last = await prisma.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return (last?.number ?? 0) + 1;
}

export async function createOrder(input: {
  contactId: string;
  conversationId?: string | null;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  department?: string;
  notes?: string;
  shippingCost?: number;
  source?: string;
  items: { productId?: string | null; productName: string; quantity: number; unitPrice: number; variant?: string }[];
}) {
  const total =
    input.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) + (input.shippingCost ?? 0);

  const order = await prisma.order.create({
    data: {
      number: await nextOrderNumber(),
      contactId: input.contactId,
      conversationId: input.conversationId ?? null,
      customerName: input.customerName,
      phone: input.phone,
      address: input.address,
      city: input.city,
      department: input.department ?? "",
      notes: input.notes ?? "",
      shippingCost: input.shippingCost ?? 0,
      total,
      source: input.source ?? "bot",
      items: { create: input.items.map(({ productId, ...item }) => ({ ...item, productId: productId ?? null })) },
    },
    include: { items: true },
  });

  emitAppEvent({ type: "order", orderId: order.id });
  return order;
}

/** Convierte los datos que recogio el bot en un pedido listo para Dropi. */
export async function createOrderFromBot(params: {
  contactId: string;
  conversationId: string;
  customer: CustomerData;
  fallbackPhone: string;
  product: { id: string; name: string; price: number; shippingCost: number; freeShipping: boolean } | null;
}) {
  const { customer, product } = params;
  const quantity = Math.max(1, Number(customer.quantity) || 1);

  return createOrder({
    contactId: params.contactId,
    conversationId: params.conversationId,
    customerName: customer.name || "Sin nombre",
    phone: customer.phone || params.fallbackPhone,
    address: customer.address,
    city: customer.city,
    department: customer.department,
    notes: [customer.variant && `Variante: ${customer.variant}`, customer.notes].filter(Boolean).join(" | "),
    shippingCost: product && !product.freeShipping ? product.shippingCost : 0,
    items: [
      {
        productId: product?.id ?? null,
        productName: product?.name ?? "Producto",
        quantity,
        unitPrice: product?.price ?? 0,
        variant: customer.variant || undefined,
      },
    ],
  });
}
