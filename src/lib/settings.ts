import { prisma } from "@/lib/prisma";
import type { SettingsModel } from "@/generated/prisma/models";

/** Devuelve la configuracion global, creandola con valores por defecto la primera vez. */
export async function getSettings(): Promise<SettingsModel> {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

/** La API key de IA puede venir del entorno o del panel de configuracion. */
export function resolveAiKey(settings: SettingsModel): string | null {
  return settings.aiApiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim() || null;
}
