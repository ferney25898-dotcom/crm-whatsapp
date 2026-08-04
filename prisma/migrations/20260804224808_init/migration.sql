-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "businessName" TEXT NOT NULL DEFAULT 'Mi Tienda',
    "country" TEXT NOT NULL DEFAULT 'CO',
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "aiApiKey" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
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
    "dropiAutoSend" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WhatsappSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'baileys',
    "phoneNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "qrCode" TEXT,
    "lastError" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoStart" BOOLEAN NOT NULL DEFAULT true,
    "cloudPhoneNumberId" TEXT,
    "cloudToken" TEXT,
    "cloudVerifyToken" TEXT,
    "defaultProductId" TEXT,
    "lastConnectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WhatsappSession_defaultProductId_fkey" FOREIGN KEY ("defaultProductId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "price" REAL NOT NULL,
    "comparePrice" REAL,
    "cost" REAL,
    "shippingCost" REAL NOT NULL DEFAULT 0,
    "freeShipping" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrls" TEXT NOT NULL DEFAULT '',
    "coverageCities" TEXT NOT NULL DEFAULT '',
    "deliveryTime" TEXT NOT NULL DEFAULT '2 a 5 dias habiles',
    "paymentMethod" TEXT NOT NULL DEFAULT 'Pago contra entrega',
    "botPersona" TEXT NOT NULL DEFAULT 'Asesor de ventas amable, cercano y directo.',
    "welcomeMessage" TEXT NOT NULL DEFAULT '',
    "sellingPoints" TEXT NOT NULL DEFAULT '',
    "promotions" TEXT NOT NULL DEFAULT '',
    "variants" TEXT NOT NULL DEFAULT '',
    "restrictions" TEXT NOT NULL DEFAULT '',
    "customInstructions" TEXT NOT NULL DEFAULT '',
    "closingMessage" TEXT NOT NULL DEFAULT 'Listo! Tu pedido quedo registrado. Te llega en {tiempo_entrega} y pagas al recibir.',
    "requiredFields" TEXT NOT NULL DEFAULT 'nombre,telefono,direccion,ciudad,departamento',
    "confirmBeforeClosing" BOOLEAN NOT NULL DEFAULT true,
    "handoffAfterSale" BOOLEAN NOT NULL DEFAULT false,
    "dropiProductId" TEXT,
    "dropiVariationId" TEXT,
    "dropiWarehouseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Faq_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Objection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Objection_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "city" TEXT,
    "department" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "sessionId" TEXT,
    "productId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'bot',
    "botEnabled" BOOLEAN NOT NULL DEFAULT true,
    "stage" TEXT NOT NULL DEFAULT 'nuevo',
    "unread" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Conversation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WhatsappSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Conversation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "mediaType" TEXT,
    "mediaUrl" TEXT,
    "waMessageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER NOT NULL,
    "contactId" TEXT NOT NULL,
    "conversationId" TEXT,
    "customerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phone2" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "department" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "shippingCost" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "source" TEXT NOT NULL DEFAULT 'bot',
    "dropiOrderId" TEXT,
    "dropiGuide" TEXT,
    "dropiResponse" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Order_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "variant" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Contact_phone_key" ON "Contact"("phone");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_waMessageId_key" ON "Message"("waMessageId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
