"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Power, RefreshCw, Save, Trash2 } from "lucide-react";
import { useLiveEvents } from "@/lib/useLiveEvents";

type Session = {
  id: string;
  name: string;
  provider: string;
  phoneNumber: string | null;
  status: string;
  qrCode: string | null;
  lastError: string | null;
  autoStart: boolean;
  defaultProductId: string | null;
};

type ProductOption = { id: string; name: string };

type DropiProbe = { path: string; status: number; snippet: string };

type User = {
  id: string;
  username: string;
  name: string;
  role: string;
  active: boolean;
};

type Settings = {
  businessName: string;
  currency: string;
  aiEnabled: boolean;
  aiApiKey: string | null;
  aiModel: string;
  aiMaxTokens: number;
  globalPrompt: string;
  responseDelaySec: number;
  botEnabledByDefault: boolean;
  handoffKeywords: string;
  dropiEnabled: boolean;
  dropiBaseUrl: string;
  dropiToken: string | null;
  dropiOrderPath: string;
  dropiAutoSend: boolean;
};

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  connected: { text: "Conectado", className: "bg-emerald-100 text-emerald-700" },
  connecting: { text: "Conectando...", className: "bg-amber-100 text-amber-700" },
  qr: { text: "Escanea el QR", className: "bg-sky-100 text-sky-700" },
  disconnected: { text: "Desconectado", className: "bg-slate-100 text-slate-600" },
};

export default function SettingsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dropiTest, setDropiTest] = useState<DropiProbe[] | null>(null);
  const [dropiError, setDropiError] = useState<string | null>(null);
  const [botTest, setBotTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ username: "", name: "", password: "", role: "auxiliar" });
  const [userError, setUserError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/users");
    if (response.ok) setUsers(await response.json());
  }, []);

  const loadSessions = useCallback(async () => {
    const response = await fetch("/api/sessions");
    setSessions(await response.json());
  }, []);

  useEffect(() => {
    loadSessions();
    fetch("/api/products")
      .then((response) => response.json())
      .then(setProducts);
    fetch("/api/settings")
      .then((response) => response.json())
      .then(setSettings);
    loadUsers();
  }, [loadSessions, loadUsers]);

  useLiveEvents((event) => {
    if (event.type === "session") loadSessions();
  });

  // Mientras haya un QR en pantalla lo refrescamos: WhatsApp lo rota cada pocos segundos.
  useEffect(() => {
    const waiting = sessions.some((session) => session.status === "qr" || session.status === "connecting");
    if (!waiting) return;
    const timer = setInterval(loadSessions, 3000);
    return () => clearInterval(timer);
  }, [sessions, loadSessions]);

  async function sessionAction(id: string, action: string) {
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadSessions();
  }

  async function updateSession(id: string, data: Partial<Session>) {
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    loadSessions();
  }

  async function addSession() {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: `Numero ${sessions.length + 1}` }),
    });
    loadSessions();
  }

  async function removeSession(id: string) {
    if (!confirm("Eliminar este numero? Los chats se conservan.")) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    loadSessions();
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
    setSaved(false);
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (response.ok) setSaved(true);
    setSaving(false);
  }

  async function addUser() {
    setUserError(null);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    if (response.ok) {
      setNewUser({ username: "", name: "", password: "", role: "auxiliar" });
      loadUsers();
    } else {
      const data = await response.json().catch(() => ({ error: "No se pudo crear" }));
      setUserError(data.error);
    }
  }

  async function updateUser(id: string, data: Record<string, unknown>) {
    setUserError(null);
    const response = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "No se pudo actualizar" }));
      setUserError(result.error);
    }
    loadUsers();
  }

  async function removeUser(id: string) {
    if (!confirm("Eliminar este usuario? Perdera el acceso de inmediato.")) return;
    const response = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: "No se pudo eliminar" }));
      setUserError(result.error);
    }
    loadUsers();
  }

  async function testBot() {
    setBotTest({ ok: true, message: "Probando..." });
    const response = await fetch("/api/settings/bot", { method: "POST" });
    const result = await response.json();
    setBotTest({ ok: Boolean(result.ok), message: result.message });
  }

  async function testDropi() {
    setDropiError(null);
    setDropiTest(null);
    const response = await fetch("/api/settings/dropi", { method: "POST" });
    const result = await response.json();
    if (result.error) setDropiError(result.error);
    setDropiTest(result.probes ?? []);
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Configuracion</h1>
          {settings && (
            <div className="flex items-center gap-2">
              {saved && <span className="text-xs text-emerald-600">Guardado</span>}
              <button onClick={saveSettings} disabled={saving} className="btn-primary">
                <Save className="h-4 w-4" /> Guardar
              </button>
            </div>
          )}
        </div>

        <section className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-slate-900">Numeros de WhatsApp</h2>
              <p className="text-xs text-slate-500">
                Conecta escaneando el QR desde WhatsApp &gt; Dispositivos vinculados. Si bloquean un
                numero, agrega otro aqui y sigue vendiendo: los productos y chats no se pierden.
              </p>
            </div>
            <button onClick={addSession} className="btn-ghost">
              <Plus className="h-4 w-4" /> Agregar
            </button>
          </div>

          {sessions.length === 0 && (
            <p className="text-sm text-slate-500">Todavia no has conectado ningun numero.</p>
          )}

          {sessions.map((session) => {
            const status = STATUS_LABEL[session.status] ?? STATUS_LABEL.disconnected;
            return (
              <div key={session.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input
                    className="field max-w-56"
                    value={session.name}
                    onChange={(e) =>
                      setSessions((current) =>
                        current.map((item) =>
                          item.id === session.id ? { ...item, name: e.target.value } : item,
                        ),
                      )
                    }
                    onBlur={(e) => updateSession(session.id, { name: e.target.value })}
                  />
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}>
                    {status.text}
                  </span>
                </div>

                {session.phoneNumber && (
                  <p className="mt-2 text-sm text-slate-600">Numero: +{session.phoneNumber}</p>
                )}
                {session.lastError && <p className="mt-1 text-xs text-amber-600">{session.lastError}</p>}

                {session.status === "qr" && session.qrCode && (
                  <div className="mt-3 flex items-center gap-4">
                    <Image
                      src={session.qrCode}
                      alt="Codigo QR de WhatsApp"
                      width={180}
                      height={180}
                      unoptimized
                      className="rounded-lg border border-slate-200"
                    />
                    <p className="text-xs text-slate-500">
                      Abre WhatsApp en el celular, entra a Dispositivos vinculados y escanea este
                      codigo. Se actualiza solo cada pocos segundos.
                    </p>
                  </div>
                )}

                <div className="mt-3">
                  <label className="label">Producto por defecto de este numero</label>
                  <select
                    className="field"
                    value={session.defaultProductId ?? ""}
                    onChange={(e) => updateSession(session.id, { defaultProductId: e.target.value })}
                  >
                    <option value="">Sin producto (el bot pregunta)</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <p className="hint">
                    Si usas un numero por campana, el bot ya sabe que producto vende sin preguntar.
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {session.status === "connected" ? (
                    <button onClick={() => sessionAction(session.id, "stop")} className="btn-ghost">
                      <Power className="h-4 w-4" /> Desconectar
                    </button>
                  ) : (
                    <button onClick={() => sessionAction(session.id, "start")} className="btn-primary">
                      <Power className="h-4 w-4" /> Conectar
                    </button>
                  )}
                  <button onClick={() => sessionAction(session.id, "reset")} className="btn-ghost">
                    <RefreshCw className="h-4 w-4" /> Cambiar de numero
                  </button>
                  <button onClick={() => removeSession(session.id)} className="btn-danger">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {settings && (
          <>
            <section className="card space-y-4">
              <h2 className="font-medium text-slate-900">Negocio y bot</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Nombre del negocio</label>
                  <input
                    className="field"
                    value={settings.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Moneda</label>
                  <input
                    className="field"
                    value={settings.currency}
                    onChange={(e) => set("currency", e.target.value)}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.aiEnabled}
                  onChange={(e) => set("aiEnabled", e.target.checked)}
                />
                El bot responde automaticamente
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.botEnabledByDefault}
                  onChange={(e) => set("botEnabledByDefault", e.target.checked)}
                />
                Activar el bot en los chats nuevos
              </label>

              <div>
                <label className="label">API key de Claude</label>
                <input
                  className="field"
                  type="password"
                  placeholder="sk-ant-..."
                  value={settings.aiApiKey ?? ""}
                  onChange={(e) => set("aiApiKey", e.target.value)}
                />
                <p className="hint">
                  La sacas en console.anthropic.com. Tambien puedes ponerla en la variable de entorno
                  ANTHROPIC_API_KEY.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Modelo</label>
                  <select className="field" value={settings.aiModel} onChange={(e) => set("aiModel", e.target.value)}>
                    <option value="claude-haiku-4-5">Haiku 4.5 (mas economico)</option>
                    <option value="claude-sonnet-5">Sonnet 5 (equilibrado)</option>
                    <option value="claude-opus-5">Opus 5 (el mas capaz)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Largo de respuesta</label>
                  <input
                    type="number"
                    className="field"
                    value={settings.aiMaxTokens}
                    onChange={(e) => set("aiMaxTokens", Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label">Espera antes de responder (seg)</label>
                  <input
                    type="number"
                    className="field"
                    value={settings.responseDelaySec}
                    onChange={(e) => set("responseDelaySec", Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <label className="label">Instrucciones que aplican a todos los productos</label>
                <textarea
                  className="field h-24"
                  value={settings.globalPrompt}
                  onChange={(e) => set("globalPrompt", e.target.value)}
                  placeholder="Ej: Nunca pidas datos de tarjeta. Siempre confirma la ciudad antes de cerrar."
                />
              </div>

              <div>
                <button onClick={testBot} className="btn-ghost">
                  Probar el bot
                </button>
                {botTest && (
                  <p className={`mt-2 text-xs ${botTest.ok ? "text-emerald-600" : "text-red-600"}`}>
                    {botTest.message}
                  </p>
                )}
                <p className="hint">
                  Comprueba la API key sin pasar por WhatsApp. Guarda antes de probar.
                </p>
              </div>

              <div>
                <label className="label">Palabras que pasan el chat a un humano</label>
                <input
                  className="field"
                  value={settings.handoffKeywords}
                  onChange={(e) => set("handoffKeywords", e.target.value)}
                />
                <p className="hint">Separadas por coma.</p>
              </div>
            </section>

            <section className="card space-y-4">
              <div>
                <h2 className="font-medium text-slate-900">Integracion con Dropi</h2>
                <p className="text-xs text-slate-500">
                  El token se genera en Dropi &gt; Mis Integraciones. Aunque tengas que elegir una
                  marca en la lista de tipos, el token generado es el que autentica las peticiones.
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.dropiEnabled}
                  onChange={(e) => set("dropiEnabled", e.target.checked)}
                />
                Activar el envio de pedidos a Dropi
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={settings.dropiAutoSend}
                  onChange={(e) => set("dropiAutoSend", e.target.checked)}
                />
                Enviar automaticamente apenas el bot confirme la venta
              </label>

              <div>
                <label className="label">Token de integracion</label>
                <input
                  className="field"
                  type="password"
                  value={settings.dropiToken ?? ""}
                  onChange={(e) => set("dropiToken", e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">URL de la API</label>
                  <input
                    className="field"
                    value={settings.dropiBaseUrl}
                    onChange={(e) => set("dropiBaseUrl", e.target.value)}
                  />
                  <p className="hint">Cambia el dominio segun tu pais (api.dropi.co, api.dropi.mx...).</p>
                </div>
                <div>
                  <label className="label">Ruta para crear pedidos</label>
                  <input
                    className="field"
                    value={settings.dropiOrderPath}
                    onChange={(e) => set("dropiOrderPath", e.target.value)}
                  />
                  <p className="hint">Si Dropi cambia el servicio, se ajusta aqui sin tocar el codigo.</p>
                </div>
              </div>

              <button onClick={testDropi} className="btn-ghost">
                Buscar la ruta correcta
              </button>
              {dropiError && <p className="text-xs text-red-600">{dropiError}</p>}
              {dropiTest && (
                <div className="space-y-1 text-xs">
                  <p className="text-slate-500">
                    Un 404 significa que la ruta no existe. Cualquier otra respuesta (405, 400,
                    422) significa que si existe: esa es la buena.
                  </p>
                  {dropiTest.map((probe) => (
                    <div
                      key={probe.path}
                      className={`rounded border px-2 py-1 ${
                        probe.status === 200
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span className="font-medium">{probe.status}</span> {probe.path}
                      <span className="block break-all opacity-70">{probe.snippet}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="card space-y-4">
              <div>
                <h2 className="font-medium text-slate-900">Usuarios del panel</h2>
                <p className="text-xs text-slate-500">
                  El auxiliar solo ve la pestana de Pedidos: puede montarlos en Dropi pero no toca
                  el entrenamiento del bot, la configuracion ni los numeros.
                </p>
              </div>

              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div className="min-w-40 flex-1">
                    <p className="text-sm font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.username}</p>
                  </div>
                  <select
                    className="field max-w-40"
                    value={user.role}
                    onChange={(e) => updateUser(user.id, { role: e.target.value })}
                  >
                    <option value="admin">Administrador</option>
                    <option value="auxiliar">Auxiliar de pedidos</option>
                  </select>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={user.active}
                      onChange={(e) => updateUser(user.id, { active: e.target.checked })}
                    />
                    Activo
                  </label>
                  <button
                    className="text-xs text-slate-500 hover:underline"
                    onClick={() => {
                      const password = prompt("Nueva contrasena (minimo 6 caracteres)");
                      if (password && password.length >= 6) updateUser(user.id, { password });
                    }}
                  >
                    Cambiar clave
                  </button>
                  <button className="btn-danger" onClick={() => removeUser(user.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="rounded-lg border border-dashed border-slate-300 p-3">
                <p className="mb-3 text-sm font-medium text-slate-800">Agregar un usuario</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">Usuario</label>
                    <input
                      className="field"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="juan"
                    />
                  </div>
                  <div>
                    <label className="label">Nombre</label>
                    <input
                      className="field"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Juan Perez"
                    />
                  </div>
                  <div>
                    <label className="label">Contrasena</label>
                    <input
                      type="password"
                      className="field"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Permiso</label>
                    <select
                      className="field"
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    >
                      <option value="auxiliar">Auxiliar de pedidos</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                {userError && <p className="mt-2 text-xs text-red-600">{userError}</p>}
                <button onClick={addUser} className="btn-primary mt-3">
                  <Plus className="h-4 w-4" /> Crear usuario
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
