import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { UserModel } from "@/generated/prisma/models";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export { SESSION_COOKIE };
const SESSION_DAYS = 30;

/** Guardamos la contrasena como sal:hash, nunca en texto plano. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function countUsers(): Promise<number> {
  return prisma.user.count();
}

export async function createUser(input: {
  username: string;
  name: string;
  password: string;
  role: string;
}): Promise<UserModel> {
  return prisma.user.create({
    data: {
      username: input.username.trim().toLowerCase(),
      name: input.name.trim(),
      passwordHash: hashPassword(input.password),
      role: input.role === "admin" ? "admin" : "auxiliar",
    },
  });
}

/** Valida usuario y contrasena y abre una sesion nueva. */
export async function login(username: string, password: string): Promise<UserModel | null> {
  const user = await prisma.user.findUnique({ where: { username: username.trim().toLowerCase() } });
  if (!user || !user.active) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.userSession.create({ data: { token, userId: user.id, expiresAt } });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return user;
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.userSession.deleteMany({ where: { token } });
  store.delete(SESSION_COOKIE);
}

/** Usuario de la sesion actual, o null si no hay sesion valida. */
export async function getCurrentUser(): Promise<UserModel | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.userSession
    .findUnique({ where: { token }, include: { user: true } })
    .catch(() => null);
  if (!session || session.expiresAt < new Date()) return null;
  if (!session.user.active) return null;

  return session.user;
}

/** Error listo para devolver desde una ruta de API. */
export class AuthError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

export async function requireUser(): Promise<UserModel> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "Debes iniciar sesion");
  return user;
}

export async function requireAdmin(): Promise<UserModel> {
  const user = await requireUser();
  if (user.role !== "admin") throw new AuthError(403, "Solo el administrador puede hacer esto");
  return user;
}

/** Envuelve una ruta de API para que responda 401/403 en vez de reventar. */
export function authErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return null;
}

/** Atajo para rutas de API: devuelve la respuesta de error, o null si puede pasar. */
export async function ensureAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdmin();
    return null;
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function ensureUser(): Promise<NextResponse | null> {
  try {
    await requireUser();
    return null;
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
