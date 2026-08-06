import { NextResponse } from "next/server";
import { testDropiConnection } from "@/lib/dropi/client";

export const dynamic = "force-dynamic";

/** Prueba el token de Dropi contra varias rutas y devuelve que respondio cada una. */
export async function POST() {
  try {
    return NextResponse.json(await testDropiConnection());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, probes: [], error: message }, { status: 400 });
  }
}
