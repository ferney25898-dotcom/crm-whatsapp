import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emitAppEvent } from "@/lib/events";
import { sendOrderToDropi } from "@/lib/dropi/client";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, contact: true },
  });
  if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();

  if (body.action === "dropi") {
    try {
      const result = await sendOrderToDropi(id);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error enviando a Dropi";
      return NextResponse.json({ ok: false, raw: message }, { status: 400 });
    }
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: body.status,
      customerName: body.customerName,
      phone: body.phone,
      phone2: body.phone2,
      address: body.address,
      city: body.city,
      department: body.department,
      notes: body.notes,
    },
  });
  emitAppEvent({ type: "order", orderId: id });
  return NextResponse.json(order);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
