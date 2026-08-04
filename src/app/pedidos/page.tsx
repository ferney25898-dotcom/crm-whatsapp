"use client";

import { useCallback, useEffect, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { CopyField } from "@/components/CopyField";
import { useLiveEvents } from "@/lib/useLiveEvents";

type OrderItem = { id: string; productName: string; quantity: number; unitPrice: number; variant: string | null };

type Order = {
  id: string;
  number: number;
  customerName: string;
  phone: string;
  phone2: string | null;
  address: string;
  city: string;
  department: string;
  notes: string;
  total: number;
  shippingCost: number;
  status: string;
  source: string;
  dropiOrderId: string | null;
  dropiGuide: string | null;
  dropiResponse: string | null;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  enviado: "bg-emerald-100 text-emerald-700",
  error: "bg-red-100 text-red-700",
  cancelado: "bg-slate-100 text-slate-500",
};

function money(value: number) {
  return `$${new Intl.NumberFormat("es-CO").format(value)}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("todos");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/orders?status=${filter}`);
    setOrders(await response.json());
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveEvents((event) => {
    if (event.type === "order") load();
  });

  async function sendToDropi(order: Order) {
    setBusyId(order.id);
    setFeedback(null);
    const response = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dropi" }),
    });
    const result = await response.json().catch(() => ({ raw: "Sin respuesta" }));
    setFeedback({
      id: order.id,
      ok: Boolean(result.ok),
      text: result.ok ? "Pedido enviado a Dropi" : `Dropi respondio: ${result.raw ?? "error"}`,
    });
    setBusyId(null);
    load();
  }

  async function markSent(order: Order) {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: order.status === "enviado" ? "pendiente" : "enviado" }),
    });
    load();
  }

  async function remove(order: Order) {
    if (!confirm(`Eliminar el pedido #${order.number}?`)) return;
    await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Pedidos confirmados</h1>
            <p className="text-sm text-slate-500">
              Haz clic en cualquier campo para copiarlo y pegarlo en Dropi.
            </p>
          </div>
          <select className="field max-w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="enviado">Enviados</option>
            <option value="error">Con error</option>
          </select>
        </div>

        {orders.length === 0 ? (
          <div className="card text-sm text-slate-500">
            Aun no hay pedidos. Cuando el bot cierre una venta aparece aqui automaticamente.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="card">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      Pedido #{order.number} · {order.customerName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(order.createdAt).toLocaleString("es-CO")} ·{" "}
                      {order.source === "bot" ? "creado por el bot" : "creado a mano"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      STATUS_STYLE[order.status] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <CopyField label="Nombre" value={order.customerName} />
                  <CopyField label="Telefono" value={order.phone} />
                  <CopyField label="Direccion" value={order.address} />
                  <CopyField label="Ciudad" value={order.city} />
                  <CopyField label="Departamento" value={order.department} />
                  <CopyField label="Total a cobrar" value={String(order.total)} />
                  <CopyField
                    label="Producto"
                    value={order.items.map((item) => `${item.quantity} x ${item.productName}`).join(", ")}
                  />
                  <CopyField label="Nota" value={order.notes} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span>Total: {money(order.total)}</span>
                  {order.shippingCost > 0 && <span>Envio: {money(order.shippingCost)}</span>}
                  {order.dropiOrderId && <span>ID Dropi: {order.dropiOrderId}</span>}
                  {order.dropiGuide && <span>Guia: {order.dropiGuide}</span>}
                </div>

                {feedback?.id === order.id && (
                  <p className={`mt-3 text-xs ${feedback.ok ? "text-emerald-600" : "text-red-600"}`}>
                    {feedback.text}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => sendToDropi(order)} disabled={busyId === order.id} className="btn-primary">
                    <Send className="h-4 w-4" /> Enviar a Dropi
                  </button>
                  <button onClick={() => markSent(order)} className="btn-ghost">
                    {order.status === "enviado" ? "Marcar pendiente" : "Marcar como montado"}
                  </button>
                  <button onClick={() => remove(order)} className="btn-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
