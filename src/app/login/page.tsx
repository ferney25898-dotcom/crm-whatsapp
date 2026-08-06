"use client";

import { useEffect, useState } from "react";

export default function LoginPage() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth")
      .then((response) => response.json())
      .then((data) => setNeedsSetup(Boolean(data.needsSetup)));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        needsSetup ? { action: "setup", username, name, password } : { username, password },
      ),
    });

    if (response.ok) {
      window.location.href = "/chats";
      return;
    }

    const data = await response.json().catch(() => ({ error: "No se pudo entrar" }));
    setError(data.error);
    setBusy(false);
  }

  if (needsSetup === null) {
    return <div className="p-10 text-sm text-slate-500">Cargando...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {needsSetup ? "Crea tu cuenta de administrador" : "CRM WhatsApp"}
          </h1>
          <p className="text-xs text-slate-500">
            {needsSetup
              ? "Es la primera vez que abres el CRM. Esta cuenta tendra acceso a todo."
              : "Entra con tu usuario y contrasena."}
          </p>
        </div>

        <div>
          <label className="label">Usuario</label>
          <input
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>

        {needsSetup && (
          <div>
            <label className="label">Tu nombre</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}

        <div>
          <label className="label">Contrasena</label>
          <input
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {needsSetup && <p className="hint">Minimo 6 caracteres. Anotala, no hay forma de recuperarla.</p>}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {needsSetup ? "Crear cuenta y entrar" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
