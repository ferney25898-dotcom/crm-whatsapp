"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  _count: { faqs: number; objections: number; conversations: number };
};

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [creating, setCreating] = useState(false);

  async function load() {
    const response = await fetch("/api/products");
    setProducts(await response.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setCreating(true);
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Producto nuevo", price: 0 }),
    });
    const product = await response.json();
    setCreating(false);
    window.location.href = `/productos/${product.id}`;
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Productos</h1>
            <p className="text-sm text-slate-500">
              Cada producto tiene su propio entrenamiento: precio, promociones, respuestas y reglas
              de cierre que usa el bot.
            </p>
          </div>
          <button onClick={create} disabled={creating} className="btn-primary">
            <Plus className="h-4 w-4" /> Nuevo producto
          </button>
        </div>

        {products.length === 0 ? (
          <div className="card text-sm text-slate-500">
            Todavia no hay productos. Crea el primero para empezar a entrenar el bot.
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <Link key={product.id} href={`/productos/${product.id}`} className="card block hover:border-emerald-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-500">
                      ${new Intl.NumberFormat("es-CO").format(product.price)} ·{" "}
                      {product._count.faqs} preguntas · {product._count.objections} objeciones ·{" "}
                      {product._count.conversations} chats
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      product.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {product.active ? "Activo" : "Pausado"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
