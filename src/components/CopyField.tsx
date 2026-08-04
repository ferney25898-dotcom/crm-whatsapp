"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Campo de un pedido con boton para copiarlo de un clic y pegarlo en Dropi. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title="Clic para copiar"
      className="group flex w-full items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
    >
      <span className="min-w-0">
        <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <span className="block break-words text-sm text-slate-900">{value || "—"}</span>
      </span>
      {copied ? (
        <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
      ) : (
        <Copy className="mt-1 h-4 w-4 shrink-0 text-slate-400 group-hover:text-emerald-600" />
      )}
    </button>
  );
}
