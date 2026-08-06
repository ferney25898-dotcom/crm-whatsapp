import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "CRM WhatsApp",
  description: "CRM para vender por WhatsApp con bot entrenable y pedidos para Dropi",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="es" className="h-full antialiased">
      <body className="h-full">
        {user ? (
          <div className="flex h-full">
            <Sidebar user={{ name: user.name, role: user.role }} />
            <main className="flex-1 overflow-hidden">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
