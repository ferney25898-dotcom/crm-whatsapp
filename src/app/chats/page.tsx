"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { useLiveEvents } from "@/lib/useLiveEvents";

type ConversationRow = {
  id: string;
  status: string;
  stage: string;
  unread: number;
  botEnabled: boolean;
  lastMessageAt: string;
  contact: { name: string | null; phone: string };
  product: { id: string; name: string } | null;
  lastMessage: { body: string; direction: string } | null;
};

type MessageRow = {
  id: string;
  direction: string;
  sender: string;
  body: string;
  mediaType: string | null;
  createdAt: string;
};

type ConversationDetail = ConversationRow & {
  messages: MessageRow[];
  session: { id: string; name: string; status: string } | null;
};

const STAGE_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  interesado: "Interesado",
  datos_pendientes: "Faltan datos",
  confirmado: "Confirmado",
  perdido: "Perdido",
};

function hour(value: string) {
  return new Date(value).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatsPage() {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [filter, setFilter] = useState("todos");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const response = await fetch(`/api/conversations?status=${filter}`);
    setConversations(await response.json());
  }, [filter]);

  const loadDetail = useCallback(async (id: string) => {
    const response = await fetch(`/api/conversations/${id}`);
    if (response.ok) setDetail(await response.json());
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [detail?.messages.length]);

  useLiveEvents((event) => {
    if (event.type === "message" || event.type === "conversation") {
      loadConversations();
      if (selectedId && event.conversationId === selectedId) loadDetail(selectedId);
    }
  });

  async function send() {
    if (!selectedId || !draft.trim()) return;
    setSending(true);
    setError(null);
    const response = await fetch(`/api/conversations/${selectedId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft }),
    });
    if (response.ok) {
      setDraft("");
      await loadDetail(selectedId);
    } else {
      const data = await response.json().catch(() => ({ error: "No se pudo enviar" }));
      setError(data.error);
    }
    setSending(false);
  }

  async function toggleBot() {
    if (!detail) return;
    const botEnabled = !detail.botEnabled;
    await fetch(`/api/conversations/${detail.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botEnabled, status: botEnabled ? "bot" : "human" }),
    });
    loadDetail(detail.id);
    loadConversations();
  }

  return (
    <div className="flex h-full">
      <section className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-3">
          <select className="field" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="todos">Todos los chats</option>
            <option value="bot">Atendidos por el bot</option>
            <option value="human">Esperando un asesor</option>
            <option value="closed">Cerrados</option>
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-slate-500">
              Aun no hay chats. Conecta un numero en Configuracion y escribele desde otro telefono
              para probar.
            </p>
          )}
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedId(conversation.id)}
              className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                selectedId === conversation.id ? "bg-emerald-50" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-900">
                  {conversation.contact.name || conversation.contact.phone}
                </span>
                {conversation.unread > 0 && (
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                    {conversation.unread}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-slate-500">
                {conversation.lastMessage?.body || "Sin mensajes"}
              </p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                <span>{STAGE_LABEL[conversation.stage] ?? conversation.stage}</span>
                {conversation.product && <span>· {conversation.product.name}</span>}
                {conversation.status === "human" && <span className="text-amber-600">· asesor</span>}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-1 flex-col">
        {!detail ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Selecciona un chat para verlo
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div>
                <p className="font-medium text-slate-900">
                  {detail.contact.name || detail.contact.phone}
                </p>
                <p className="text-xs text-slate-500">
                  {detail.contact.phone}
                  {detail.product ? ` · ${detail.product.name}` : " · sin producto asignado"}
                </p>
              </div>
              <button onClick={toggleBot} className={detail.botEnabled ? "btn-ghost" : "btn-primary"}>
                {detail.botEnabled ? (
                  <>
                    <User className="h-4 w-4" /> Atender yo
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4" /> Devolver al bot
                  </>
                )}
              </button>
            </header>

            <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-5">
              {detail.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === "in" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-lg rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      message.direction === "in"
                        ? "bg-white text-slate-800"
                        : message.sender === "bot"
                          ? "bg-emerald-600 text-white"
                          : "bg-sky-600 text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">
                      {message.body || `[${message.mediaType ?? "adjunto"}]`}
                    </p>
                    <p className="mt-1 text-[10px] opacity-70">
                      {message.sender === "bot" ? "Bot · " : message.sender === "agent" ? "Yo · " : ""}
                      {hour(message.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <footer className="border-t border-slate-200 bg-white p-3">
              {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
              <div className="flex gap-2">
                <input
                  className="field"
                  placeholder="Escribe un mensaje..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                />
                <button onClick={send} disabled={sending} className="btn-primary">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
