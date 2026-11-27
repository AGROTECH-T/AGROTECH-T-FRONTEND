/**
 * Notificaciones de la pantalla.
 *
 * Propósito: apilar avisos de éxito y de error.
 * Contexto: acompañan el mensaje del campo, en la paleta verde.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type Notice = {
  id: number;
  tone: "ok" | "warn";
  text: string;
};

/**
 * Conserva las notificaciones y permite cerrarlas.
 * @returns Avisos visibles y acciones para abrir o cerrar.
 */
export function useNotices() {
  const [items, setItems] = useState<Notice[]>([]);
  const serial = useRef(0);
  const push = useCallback((texts: string[], tone: Notice["tone"]) => {
    const next = texts.filter(Boolean).map((text) => ({ id: ++serial.current, tone, text }));
    setItems((current) => [...next, ...current].slice(0, 6));
  }, []);
  const close = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);
  return { items, push, close };
}

type CardProps = {
  item: Notice;
  onClose: (id: number) => void;
};

/**
 * Muestra una notificación y la retira sola.
 * @param props - Texto, tono y cierre.
 * @returns Tarjeta de aviso.
 */
function NoticeCard({ item, onClose }: Readonly<CardProps>) {
  const total = item.tone === "ok" ? 5 : 7;

  useEffect(() => {
    const timer = globalThis.setTimeout(() => onClose(item.id), total * 1000);
    return () => globalThis.clearTimeout(timer);
  }, [item.id, onClose, total]);

  const ok = item.tone === "ok";
  return (
    <article className={ok ? "notice-card ok" : "notice-card warn"} role={ok ? "status" : "alert"}>
      <span className="notice-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            d={ok ? "M6.5 12.5 10.2 16.2 17.5 8.2" : "M8 8l8 8M16 8l-8 8"}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p>{item.text}</p>
      <button type="button" aria-label="Cerrar notificación" onClick={() => onClose(item.id)}>×</button>
    </article>
  );
}

type StackProps = {
  items: Notice[];
  onClose: (id: number) => void;
};

/**
 * Apila las notificaciones en la esquina.
 * @param props - Avisos y cierre.
 * @returns Lista de notificaciones, o nada si no hay.
 */
export function NoticeStack({ items, onClose }: Readonly<StackProps>) {
  const root = globalThis.document?.body;
  if (!items.length || !root) return null;
  return createPortal(
    <div className="notices">
      {items.map((item) => <NoticeCard key={item.id} item={item} onClose={onClose} />)}
    </div>,
    root,
  );
}
