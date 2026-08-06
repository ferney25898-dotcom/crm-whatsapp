import { NextResponse } from "next/server";
import { countUsers, createUser, getCurrentUser, login, logout } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Estado de la sesion: quien soy y si hay que crear el primer administrador. */
export async function GET() {
  const [user, total] = await Promise.all([getCurrentUser(), countUsers()]);
  return NextResponse.json({
    user: user ? { id: user.id, name: user.name, username: user.username, role: user.role } : null,
    needsSetup: total === 0,
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  // Primer arranque: se crea el administrador inicial.
  if (body.action === "setup") {
    if ((await countUsers()) > 0) {
      return NextResponse.json({ error: "Ya existe un administrador" }, { status: 400 });
    }
    if (!body.username?.trim() || !body.password || body.password.length < 6) {
      return NextResponse.json(
        { error: "Escribe un usuario y una contrasena de al menos 6 caracteres" },
        { status: 400 },
      );
    }
    await createUser({
      username: body.username,
      name: body.name?.trim() || body.username,
      password: body.password,
      role: "admin",
    });
    const user = await login(body.username, body.password);
    return NextResponse.json({ user: user && { name: user.name, role: user.role } }, { status: 201 });
  }

  if (body.action === "logout") {
    await logout();
    return NextResponse.json({ ok: true });
  }

  const user = await login(body.username ?? "", body.password ?? "");
  if (!user) {
    return NextResponse.json({ error: "Usuario o contrasena incorrectos" }, { status: 401 });
  }
  return NextResponse.json({ user: { name: user.name, role: user.role } });
}
