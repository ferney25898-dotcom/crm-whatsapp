import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("q")?.trim();

  const conversations = await prisma.conversation.findMany({
    where: {
      ...(status && status !== "todos" ? { status } : {}),
      ...(search
        ? {
            contact: {
              OR: [{ name: { contains: search } }, { phone: { contains: search } }],
            },
          }
        : {}),
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      contact: true,
      product: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json(
    conversations.map((conversation) => ({
      ...conversation,
      lastMessage: conversation.messages[0] ?? null,
      messages: undefined,
    })),
  );
}
