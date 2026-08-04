"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Package, ClipboardList, Settings } from "lucide-react";

const LINKS = [
  { href: "/chats", label: "Chats", icon: MessageSquare },
  { href: "/productos", label: "Productos", icon: Package },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/configuracion", label: "Configuracion", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-6">
        <p className="text-lg font-semibold text-slate-900">CRM WhatsApp</p>
        <p className="text-xs text-slate-500">Ventas y pedidos</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {LINKS.map(({ href, label, icon: Icon }) => {
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
    </aside>
  );
}
