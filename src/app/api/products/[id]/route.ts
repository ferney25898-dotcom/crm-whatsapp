import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const NUMERIC_FIELDS = ["price", "comparePrice", "cost", "shippingCost"] as const;

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { faqs: { orderBy: { order: "asc" } }, objections: { orderBy: { order: "asc" } } },
  });
  if (!product) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const body = await request.json();

  const { faqs, objections, ...fields } = body;
  delete fields.id;
  delete fields.createdAt;
  delete fields.updatedAt;
  delete fields._count;

  for (const field of NUMERIC_FIELDS) {
    if (field in fields) {
      const value = fields[field];
      fields[field] = value === "" || value === null ? (field === "price" ? 0 : null) : Number(value);
    }
  }

  await prisma.product.update({ where: { id }, data: fields });

  // Las FAQs y objeciones se reemplazan completas: es lo que envia el formulario.
  if (Array.isArray(faqs)) {
    await prisma.faq.deleteMany({ where: { productId: id } });
    await prisma.faq.createMany({
      data: faqs
        .filter((faq: { question?: string }) => faq.question?.trim())
        .map((faq: { question: string; answer: string }, index: number) => ({
          productId: id,
          question: faq.question.trim(),
          answer: (faq.answer ?? "").trim(),
          order: index,
        })),
    });
  }

  if (Array.isArray(objections)) {
    await prisma.objection.deleteMany({ where: { productId: id } });
    await prisma.objection.createMany({
      data: objections
        .filter((item: { trigger?: string }) => item.trigger?.trim())
        .map((item: { trigger: string; response: string }, index: number) => ({
          productId: id,
          trigger: item.trigger.trim(),
          response: (item.response ?? "").trim(),
          order: index,
        })),
    });
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: { faqs: { orderBy: { order: "asc" } }, objections: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(product);
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
