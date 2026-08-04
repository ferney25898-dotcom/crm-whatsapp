import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { faqs: true, objections: true, conversations: true } } },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
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
