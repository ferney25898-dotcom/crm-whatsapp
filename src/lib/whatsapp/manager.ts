import fs from "node:fs";
import path from "node:path";
import { Boom } from "@hapi/boom";
import pino from "pino";
import QRCode from "qrcode";
import {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeWASocket,
  useMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from "baileys";
import { prisma } from "@/lib/prisma";
import { emitAppEvent } from "@/lib/events";

const AUTH_ROOT = path.join(process.cwd(), "data", "wa");

type Runtime = {
  socket: WASocket | null;
  /** Evita reconectar en bucle cuando el usuario apago la sesion a proposito. */
  stopped: boolean;
  reconnectAttempts: number;
  timer?: NodeJS.Timeout;
};

const globalForWa = globalThis as unknown as {
  waRuntimes?: Map<string, Runtime>;
};

const runtimes: Map<string, Runtime> = globalForWa.waRuntimes ?? new Map();
globalForWa.waRuntimes = runtimes;

const logger = pino({ level: "silent" });

function authDir(sessionId: string) {
  return path.join(AUTH_ROOT, sessionId);
}

async function setStatus(
  sessionId: string,
  data: {
    status?: string;
    qrCode?: string | null;
    lastError?: string | null;
    phoneNumber?: string;
    lastConnectedAt?: Date;
  },
) {
  await prisma.whatsappSession.update({ where: { id: sessionId }, data }).catch(() => null);
  emitAppEvent({ type: "session", sessionId });
}

/** Texto plano de un mensaje entrante, sin importar en que formato venga. */
export function extractText(message: WAMessage): string {
  const m = message.message;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedDisplayText ||
    m.listResponseMessage?.title ||
    m.templateButtonReplyMessage?.selectedDisplayText ||
    ""
  );
}

function mediaTypeOf(message: WAMessage): string | null {
  const m = message.message;
  if (!m) return null;
  if (m.imageMessage) return "image";
  if (m.audioMessage) return "audio";
  if (m.videoMessage) return "video";
  if (m.documentMessage) return "document";
  if (m.stickerMessage) return "sticker";
  return null;
}

/** Convierte 573001112233@s.whatsapp.net en 573001112233. */
export function phoneFromJid(jid: string): string {
  return jid.split("@")[0].split(":")[0];
}

export function jidFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

export function getRuntimeStatus(sessionId: string) {
  const runtime = runtimes.get(sessionId);
  return {
    running: Boolean(runtime?.socket) && !runtime?.stopped,
    attempts: runtime?.reconnectAttempts ?? 0,
  };
}

/**
 * Conecta un numero por codigo QR. Si ya hay credenciales guardadas
 * reconecta solo, sin volver a pedir el QR.
 */
export async function startSession(sessionId: string): Promise<void> {
  const session = await prisma.whatsappSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error("Sesion no encontrada");
  if (session.provider !== "baileys") return;

  const existing = runtimes.get(sessionId);
  if (existing?.socket && !existing.stopped) return;
  if (existing?.timer) clearTimeout(existing.timer);

  const runtime: Runtime = existing ?? { socket: null, stopped: false, reconnectAttempts: 0 };
  runtime.stopped = false;
  runtimes.set(sessionId, runtime);

  fs.mkdirSync(authDir(sessionId), { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(authDir(sessionId));
  const { version } = await fetchLatestBaileysVersion();

  await setStatus(sessionId, { status: "connecting", lastError: null });

  const socket = makeWASocket({
    version,
    auth: state,
    logger,
    // El navegador que WhatsApp muestra en "Dispositivos vinculados".
    browser: ["CRM WhatsApp", "Chrome", "1.0.0"],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  runtime.socket = socket;

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const dataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      await setStatus(sessionId, { status: "qr", qrCode: dataUrl });
    }

    if (connection === "open") {
      runtime.reconnectAttempts = 0;
      const phone = socket.user?.id ? phoneFromJid(socket.user.id) : undefined;
      await setStatus(sessionId, {
        status: "connected",
        qrCode: null,
        lastError: null,
        phoneNumber: phone,
        lastConnectedAt: new Date(),
      });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      runtime.socket = null;

      if (loggedOut) {
        // WhatsApp cerro la sesion: hay que escanear un QR nuevo.
        fs.rmSync(authDir(sessionId), { recursive: true, force: true });
        runtime.stopped = true;
        await setStatus(sessionId, {
          status: "disconnected",
          qrCode: null,
          lastError: "La sesion se cerro desde el telefono. Escanea el QR de nuevo.",
        });
        return;
      }

      if (runtime.stopped) {
        await setStatus(sessionId, { status: "disconnected", qrCode: null });
        return;
      }

      runtime.reconnectAttempts += 1;
      if (runtime.reconnectAttempts > 10) {
        await setStatus(sessionId, {
          status: "disconnected",
          lastError: "No se pudo reconectar despues de varios intentos.",
        });
        return;
      }

      const delay = Math.min(30_000, 2_000 * runtime.reconnectAttempts);
      await setStatus(sessionId, {
        status: "connecting",
        lastError: `Reconectando (intento ${runtime.reconnectAttempts})...`,
      });
      runtime.timer = setTimeout(() => {
        startSession(sessionId).catch(() => null);
      }, delay);
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const message of messages) {
      try {
        await onIncoming(sessionId, message);
      } catch (error) {
        console.error("[whatsapp] error procesando mensaje", error);
      }
    }
  });
}

async function onIncoming(sessionId: string, message: WAMessage) {
  const jid = message.key.remoteJid;
  if (!jid) return;
  // Ignoramos grupos, estados y notas propias.
  if (message.key.fromMe) return;
  if (jid.endsWith("@g.us") || jid === "status@broadcast" || jid.endsWith("@newsletter")) return;

  const body = extractText(message);
  const mediaType = mediaTypeOf(message);
  if (!body && !mediaType) return;

  const { handleIncomingMessage } = await import("@/lib/bot/pipeline");
  await handleIncomingMessage({
    sessionId,
    phone: phoneFromJid(jid),
    pushName: message.pushName ?? undefined,
    body,
    mediaType,
    waMessageId: message.key.id ?? undefined,
  });
}

/** Desconecta el numero sin borrar sus credenciales. */
export async function stopSession(sessionId: string): Promise<void> {
  const runtime = runtimes.get(sessionId);
  if (runtime) {
    runtime.stopped = true;
    if (runtime.timer) clearTimeout(runtime.timer);
    try {
      runtime.socket?.end(undefined);
    } catch {
      // el socket ya estaba cerrado
    }
    runtime.socket = null;
  }
  await setStatus(sessionId, { status: "disconnected", qrCode: null });
}

/**
 * Cierra la sesion y borra las credenciales. Se usa cuando Meta bloquea
 * el numero y hay que enlazar otro rapido.
 */
export async function resetSession(sessionId: string): Promise<void> {
  await stopSession(sessionId);
  fs.rmSync(authDir(sessionId), { recursive: true, force: true });
  await setStatus(sessionId, { status: "disconnected", qrCode: null, lastError: null });
}

export async function sendText(sessionId: string, phone: string, text: string): Promise<void> {
  const runtime = runtimes.get(sessionId);
  if (!runtime?.socket) throw new Error("El numero no esta conectado");
  await runtime.socket.sendMessage(jidFromPhone(phone), { text });
}

export async function sendImage(sessionId: string, phone: string, url: string, caption?: string) {
  const runtime = runtimes.get(sessionId);
  if (!runtime?.socket) throw new Error("El numero no esta conectado");
  await runtime.socket.sendMessage(jidFromPhone(phone), { image: { url }, caption });
}

/** Marca "escribiendo..." para que la respuesta del bot se sienta natural. */
export async function sendTyping(sessionId: string, phone: string) {
  const runtime = runtimes.get(sessionId);
  if (!runtime?.socket) return;
  try {
    const jid = jidFromPhone(phone);
    await runtime.socket.presenceSubscribe(jid);
    await runtime.socket.sendPresenceUpdate("composing", jid);
  } catch {
    // la presencia es cosmetica, no interrumpe el envio
  }
}

/** Arranca al iniciar el servidor todas las sesiones marcadas como automaticas. */
export async function startAutoSessions(): Promise<void> {
  const sessions = await prisma.whatsappSession
    .findMany({ where: { isActive: true, autoStart: true, provider: "baileys" } })
    .catch(() => []);
  for (const session of sessions) {
    startSession(session.id).catch((error) =>
      console.error(`[whatsapp] no se pudo iniciar ${session.name}`, error),
    );
  }
}
