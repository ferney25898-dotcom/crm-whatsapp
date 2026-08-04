import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const data = await request.json();
  delete data.id;
  delete data.updatedAt;
  await getSettings();
  const settings = await prisma.settings.update({ where: { id: 1 }, data });
  return NextResponse.json(settings);
}
