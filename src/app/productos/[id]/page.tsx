"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";

type Faq = { question: string; answer: string };
type Objection = { trigger: string; response: string };

type Product = {
  id: string;
  name: string;
  sku: string | null;
  active: boolean;
  price: number;
  comparePrice: number | null;
  cost: number | null;
  shippingCost: number;
  freeShipping: boolean;
  description: string;
  imageUrls: string;
  coverageCities: string;
  deliveryTime: string;
  paymentMethod: string;
  botPersona: string;
  welcomeMessage: string;
  sellingPoints: string;
  promotions: string;
  variants: string;
  restrictions: string;
  customInstructions: string;
  closingMessage: string;
  requiredFields: string;
  confirmBeforeClosing: boolean;
  handoffAfterSale: boolean;
  dropiProductId: string | null;
  dropiVariationId: string | null;
  dropiWarehouseId: string | null;
  faqs: Faq[];
  objections: Objection[];
};

const TABS = [
  { id: "basico", label: "Datos del producto" },
  { id: "entrenamiento", label: "Entrenamiento del bot" },
  { id: "preguntas", label: "Preguntas y objeciones" },
  { id: "cierre", label: "Cierre y Dropi" },
] as const;

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("basico");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then((response) => response.json())
      .then(setProduct);
  }, [id]);

  function set<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  async function save() {
    if (!product) return;
    setSaving(true);
    const response = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });
    if (response.ok) {
      setProduct(await response.json());
      setSaved(true);
    }
    setSaving(false);
  }

  async function remove() {
    if (!confirm("Eliminar este producto y su entrenamiento?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    window.location.href = "/productos";
  }

  if (!product) {
    return <div className="p-8 text-sm text-slate-500">Cargando...</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/productos" className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        <div className="mb-5 flex items-center justify-between gap-4">
          <input
            className="w-full max-w-md border-none bg-transparent text-xl font-semibold text-slate-900 outline-none"
            value={product.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-emerald-600">Guardado</span>}
            <button onClick={save} disabled={saving} className="btn-primary">
              <Save className="h-4 w-4" /> Guardar
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
                tab === item.id
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "basico" && (
          <div className="card space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Precio de venta</label>
                <input
                  type="number"
                  className="field"
                  value={product.price}
                  onChange={(e) => set("price", Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Precio tachado (opcional)</label>
                <input
                  type="number"
                  className="field"
                  value={product.comparePrice ?? ""}
                  onChange={(e) => set("comparePrice", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Costo del producto (opcional)</label>
                <input
                  type="number"
                  className="field"
                  value={product.cost ?? ""}
                  onChange={(e) => set("cost", e.target.value === "" ? null : Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label">Costo de envio</label>
                <input
                  type="number"
                  className="field"
                  value={product.shippingCost}
                  onChange={(e) => set("shippingCost", Number(e.target.value))}
                  disabled={product.freeShipping}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={product.freeShipping}
                onChange={(e) => set("freeShipping", e.target.checked)}
              />
              El envio es gratis
            </label>

            <div>
              <label className="label">Descripcion</label>
              <textarea
                className="field h-24"
                value={product.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="De que se trata el producto, para que sirve, que incluye..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Tiempo de entrega</label>
                <input
                  className="field"
                  value={product.deliveryTime}
                  onChange={(e) => set("deliveryTime", e.target.value)}
                />
              </div>
              <div>
                <label className="label">Forma de pago</label>
                <input
                  className="field"
                  value={product.paymentMethod}
                  onChange={(e) => set("paymentMethod", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">Ciudades con contraentrega</label>
              <textarea
                className="field h-16"
                value={product.coverageCities}
                onChange={(e) => set("coverageCities", e.target.value)}
                placeholder="Dejalo vacio si cubres todo el pais"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={product.active} onChange={(e) => set("active", e.target.checked)} />
              Producto activo
            </label>
          </div>
        )}

        {tab === "entrenamiento" && (
          <div className="card space-y-4">
            <div>
              <label className="label">Tono y personalidad del bot</label>
              <textarea
                className="field h-20"
                value={product.botPersona}
                onChange={(e) => set("botPersona", e.target.value)}
                placeholder="Ej: Asesor cercano, tutea al cliente, usa pocos emojis."
              />
            </div>
            <div>
              <label className="label">Mensaje de bienvenida</label>
              <textarea
                className="field h-20"
                value={product.welcomeMessage}
                onChange={(e) => set("welcomeMessage", e.target.value)}
                placeholder="Lo que el bot responde cuando el cliente llega del anuncio."
              />
            </div>
            <div>
              <label className="label">Argumentos de venta (uno por linea)</label>
              <textarea
                className="field h-28"
                value={product.sellingPoints}
                onChange={(e) => set("sellingPoints", e.target.value)}
                placeholder={"Material resistente\nGarantia de 30 dias\nPagas cuando lo recibes"}
              />
            </div>
            <div>
              <label className="label">Promociones activas</label>
              <textarea
                className="field h-20"
                value={product.promotions}
                onChange={(e) => set("promotions", e.target.value)}
                placeholder="Ej: 2 unidades por $90.000"
              />
            </div>
            <div>
              <label className="label">Variantes disponibles</label>
              <textarea
                className="field h-20"
                value={product.variants}
                onChange={(e) => set("variants", e.target.value)}
                placeholder="Ej: Colores: negro, blanco, rojo. Tallas: S, M, L"
              />
            </div>
            <div>
              <label className="label">Lo que el bot NO puede decir ni prometer</label>
              <textarea
                className="field h-20"
                value={product.restrictions}
                onChange={(e) => set("restrictions", e.target.value)}
                placeholder="Ej: No prometer entrega el mismo dia. No dar descuentos extra."
              />
            </div>
            <div>
              <label className="label">Instrucciones adicionales</label>
              <textarea
                className="field h-24"
                value={product.customInstructions}
                onChange={(e) => set("customInstructions", e.target.value)}
                placeholder="Cualquier regla extra que quieras que el bot siga con este producto."
              />
            </div>
          </div>
        )}

        {tab === "preguntas" && (
          <div className="space-y-5">
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-slate-900">Preguntas frecuentes</h2>
                  <p className="text-xs text-slate-500">El bot responde exactamente lo que escribas aqui.</p>
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => set("faqs", [...product.faqs, { question: "", answer: "" }])}
                >
                  <Plus className="h-4 w-4" /> Agregar
                </button>
              </div>
              {product.faqs.map((faq, index) => (
                <div key={index} className="rounded-lg border border-slate-200 p-3">
                  <input
                    className="field mb-2"
                    placeholder="Pregunta del cliente"
                    value={faq.question}
                    onChange={(e) => {
                      const faqs = [...product.faqs];
                      faqs[index] = { ...faq, question: e.target.value };
                      set("faqs", faqs);
                    }}
                  />
                  <textarea
                    className="field h-16"
                    placeholder="Respuesta del bot"
                    value={faq.answer}
                    onChange={(e) => {
                      const faqs = [...product.faqs];
                      faqs[index] = { ...faq, answer: e.target.value };
                      set("faqs", faqs);
                    }}
                  />
                  <button
                    className="mt-2 text-xs text-red-600 hover:underline"
                    onClick={() => set("faqs", product.faqs.filter((_, i) => i !== index))}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>

            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-slate-900">Objeciones</h2>
                  <p className="text-xs text-slate-500">Las dudas que frenan la compra y como responderlas.</p>
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => set("objections", [...product.objections, { trigger: "", response: "" }])}
                >
                  <Plus className="h-4 w-4" /> Agregar
                </button>
              </div>
              {product.objections.map((objection, index) => (
                <div key={index} className="rounded-lg border border-slate-200 p-3">
                  <input
                    className="field mb-2"
                    placeholder='Ej: "esta muy caro"'
                    value={objection.trigger}
                    onChange={(e) => {
                      const objections = [...product.objections];
                      objections[index] = { ...objection, trigger: e.target.value };
                      set("objections", objections);
                    }}
                  />
                  <textarea
                    className="field h-16"
                    placeholder="Como debe responder el bot"
                    value={objection.response}
                    onChange={(e) => {
                      const objections = [...product.objections];
                      objections[index] = { ...objection, response: e.target.value };
                      set("objections", objections);
                    }}
                  />
                  <button
                    className="mt-2 text-xs text-red-600 hover:underline"
                    onClick={() => set("objections", product.objections.filter((_, i) => i !== index))}
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "cierre" && (
          <div className="space-y-5">
            <div className="card space-y-4">
              <div>
                <label className="label">Datos que el bot debe recoger antes de confirmar</label>
                <input
                  className="field"
                  value={product.requiredFields}
                  onChange={(e) => set("requiredFields", e.target.value)}
                />
                <p className="hint">Separados por coma. Son los campos que necesitas para montar el pedido en Dropi.</p>
              </div>
              <div>
                <label className="label">Mensaje de cierre</label>
                <textarea
                  className="field h-20"
                  value={product.closingMessage}
                  onChange={(e) => set("closingMessage", e.target.value)}
                />
                <p className="hint">Puedes usar {"{tiempo_entrega}"} y se reemplaza solo.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={product.confirmBeforeClosing}
                  onChange={(e) => set("confirmBeforeClosing", e.target.checked)}
                />
                Pedir confirmacion explicita antes de cerrar la venta
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={product.handoffAfterSale}
                  onChange={(e) => set("handoffAfterSale", e.target.checked)}
                />
                Pasar el chat a un humano apenas se confirme la venta
              </label>
            </div>

            <div className="card space-y-4">
              <div>
                <h2 className="font-medium text-slate-900">Datos de Dropi</h2>
                <p className="text-xs text-slate-500">
                  Solo se necesitan si vas a enviar los pedidos automaticamente. Los encuentras en la
                  ficha del producto dentro de Dropi.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">ID del producto</label>
                  <input
                    className="field"
                    value={product.dropiProductId ?? ""}
                    onChange={(e) => set("dropiProductId", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">ID de variacion</label>
                  <input
                    className="field"
                    value={product.dropiVariationId ?? ""}
                    onChange={(e) => set("dropiVariationId", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">ID de bodega</label>
                  <input
                    className="field"
                    value={product.dropiWarehouseId ?? ""}
                    onChange={(e) => set("dropiWarehouseId", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button onClick={remove} className="btn-danger">
              <Trash2 className="h-4 w-4" /> Eliminar producto
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
