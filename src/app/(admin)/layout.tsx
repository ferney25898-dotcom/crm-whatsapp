import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** Estas pantallas son solo del administrador. El auxiliar va a Pedidos. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/pedidos");
  return children;
}
