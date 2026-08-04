import { NextResponse } from "next/server";
import { testDropiConnection } from "@/lib/dropi/client";

export const dynamic = "force-dynamic";

/** Prueba el token de Dropi y devuelve la respuesta cruda para depurar. */
export async function POST() {
  try {
    const result = await testDropiConnection();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ ok: false, status: 0, raw: message }, { status: 400 });
  }
}
