import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baileys y el driver de SQLite usan modulos nativos y cargas dinamicas:
  // deben ejecutarse en Node, no pasar por el empaquetador.
  serverExternalPackages: ["baileys", "better-sqlite3", "@prisma/adapter-better-sqlite3", "pino"],
};

export default nextConfig;
