import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, createUser, hashPassword, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Error" }, { status: 500 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, name: true, role: true, active: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Error" }, { status: 500 });
  }

  const body = await request.json();
  if (!body.username?.trim() || !body.password || body.password.length < 6) {
    return NextResponse.json(
      { error: "Escribe un usuario y una contrasena de al menos 6 caracteres" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username: body.username.trim().toLowerCase() },
  });
  if (existing) return NextResponse.json({ error: "Ese usuario ya existe" }, { status: 400 });

  const user = await createUser(body);
  return NextResponse.json({ id: user.id, username: user.username, role: user.role }, { status: 201 });
}

export async function PATCH(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Error" }, { status: 500 });
  }

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });

  // Nadie puede dejarse a si mismo sin acceso.
  if (body.id === admin.id && (body.active === false || body.role === "auxiliar")) {
    return NextResponse.json({ error: "No puedes quitarte tus propios permisos" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: body.id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.role ? { role: body.role === "admin" ? "admin" : "auxiliar" } : {}),
      ...(typeof body.active === "boolean" ? { active: body.active } : {}),
      ...(body.password ? { passwordHash: hashPassword(body.password) } : {}),
    },
    select: { id: true, username: true, name: true, role: true, active: true },
  });

  // Al desactivar o cambiar la clave, se cierran sus sesiones abiertas.
  if (body.active === false || body.password) {
    await prisma.userSession.deleteMany({ where: { userId: body.id } });
  }

  return NextResponse.json(user);
}

export async function DELETE(request: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Error" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta el usuario" }, { status: 400 });
  if (id === admin.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
