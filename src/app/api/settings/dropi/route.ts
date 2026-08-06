import { NextResponse } from "next/server";
import { testDropiConnection } from "@/lib/dropi/client";
import { ensureAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Prueba el token de Dropi contra varias rutas y devuelve que respondio cada una. */
export async function POST() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    return NextResponse.json(await testDropiConnection());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, probes: [], error: message }, { status: 400 });
  }
}
