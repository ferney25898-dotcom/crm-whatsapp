import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/orders";
import { ensureUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await ensureUser();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const orders = await prisma.order.findMany({
    where: status && status !== "todos" ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: true, contact: { select: { id: true, phone: true, name: true } } },
  });
  return NextResponse.json(orders);
}

/** Crea un pedido a mano desde el panel. */
export async function POST(request: Request) {
  const denied = await ensureUser();
  if (denied) return denied;

  const body = await request.json();

  const contact = await prisma.contact.upsert({
    where: { phone: body.phone },
    update: { name: body.customerName },
    create: { phone: body.phone, name: body.customerName },
  });

  const order = await createOrder({
    contactId: contact.id,
    customerName: body.customerName,
    phone: body.phone,
    address: body.address ?? "",
    city: body.city ?? "",
    department: body.department ?? "",
    notes: body.notes ?? "",
    shippingCost: Number(body.shippingCost) || 0,
    source: "manual",
    items: (body.items ?? []).map((item: Record<string, unknown>) => ({
      productId: (item.productId as string) || null,
      productName: (item.productName as string) || "Producto",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      variant: (item.variant as string) || undefined,
    })),
  });

  return NextResponse.json(order, { status: 201 });
}
