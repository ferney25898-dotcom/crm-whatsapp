import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { faqs: true, objections: true, conversations: true } } },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const body = await request.json();
  const product = await prisma.product.create({
    data: {
      name: body.name?.trim() || "Producto nuevo",
      price: Number(body.price) || 0,
      description: body.description ?? "",
    },
  });
  return NextResponse.json(product, { status: 201 });
}
