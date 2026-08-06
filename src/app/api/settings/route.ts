import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { ensureAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const data = await request.json();
  delete data.id;
  delete data.updatedAt;
  await getSettings();
  const settings = await prisma.settings.update({ where: { id: 1 }, data });
  return NextResponse.json(settings);
}
