"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LogOut, MessageSquare, Package, Settings } from "lucide-react";

const LINKS = [
  { href: "/chats", label: "Chats", icon: MessageSquare, adminOnly: true },
  { href: "/productos", label: "Productos", icon: Package, adminOnly: true },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList, adminOnly: false },
  { href: "/configuracion", label: "Configuracion", icon: Settings, adminOnly: true },
];

export function Sidebar({ user }: { user: { name: string; role: string } }) {
  const pathname = usePathname();
  const isAdmin = user.role === "admin";

  async function logout() {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    window.location.href = "/login";
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-6">
        <p className="text-lg font-semibold text-slate-900">CRM WhatsApp</p>
        <p className="text-xs text-slate-500">Ventas y pedidos</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {LINKS.filter((link) => isAdmin || !link.adminOnly).map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <p className="px-2 text-sm font-medium text-slate-800">{user.name}</p>
        <p className="mb-2 px-2 text-xs text-slate-500">
          {isAdmin ? "Administrador" : "Auxiliar de pedidos"}
        </p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
        >
          <LogOut className="h-4 w-4" /> Salir
        </button>
      </div>
    </aside>
  );
}
