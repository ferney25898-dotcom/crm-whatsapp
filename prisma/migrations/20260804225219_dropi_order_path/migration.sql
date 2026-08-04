-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'Mi Tienda',
    "country" TEXT NOT NULL DEFAULT 'CO',
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "aiApiKey" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-haiku-4-5',
    "aiMaxTokens" INTEGER NOT NULL DEFAULT 500,
    "globalPrompt" TEXT NOT NULL DEFAULT '',
    "responseDelaySec" INTEGER NOT NULL DEFAULT 3,
    "botEnabledByDefault" BOOLEAN NOT NULL DEFAULT true,
    "handoffKeywords" TEXT NOT NULL DEFAULT 'asesor,humano,persona real,hablar con alguien',
    "followUpMinutes" INTEGER NOT NULL DEFAULT 60,
    "followUpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "followUpMessage" TEXT NOT NULL DEFAULT 'Hola! Sigues interesado en tu pedido? Te ayudo a completarlo.',
    "dropiEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dropiBaseUrl" TEXT NOT NULL DEFAULT 'https://api.dropi.co',
    "dropiToken" TEXT,
    "dropiUser" TEXT,
    "dropiPassword" TEXT,
    "dropiOrderPath" TEXT NOT NULL DEFAULT '/integrations/orders',
    "dropiAutoSend" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("aiApiKey", "aiEnabled", "aiMaxTokens", "aiModel", "aiProvider", "botEnabledByDefault", "businessName", "country", "currency", "dropiAutoSend", "dropiBaseUrl", "dropiEnabled", "dropiPassword", "dropiToken", "dropiUser", "followUpEnabled", "followUpMessage", "followUpMinutes", "globalPrompt", "handoffKeywords", "id", "responseDelaySec", "timezone", "updatedAt") SELECT "aiApiKey", "aiEnabled", "aiMaxTokens", "aiModel", "aiProvider", "botEnabledByDefault", "businessName", "country", "currency", "dropiAutoSend", "dropiBaseUrl", "dropiEnabled", "dropiPassword", "dropiToken", "dropiUser", "followUpEnabled", "followUpMessage", "followUpMinutes", "globalPrompt", "handoffKeywords", "id", "responseDelaySec", "timezone", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
