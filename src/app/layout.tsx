import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "CRM WhatsApp",
  description: "CRM para vender por WhatsApp con bot entrenable y pedidos para Dropi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="h-full">
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
