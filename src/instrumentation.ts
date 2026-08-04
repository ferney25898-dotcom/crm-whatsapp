/** Se ejecuta una vez al arrancar el servidor. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startAutoSessions } = await import("@/lib/whatsapp/manager");
  await startAutoSessions().catch((error) =>
    console.error("[whatsapp] error iniciando las sesiones automaticas", error),
  );
}
