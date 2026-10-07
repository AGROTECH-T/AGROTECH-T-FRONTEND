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
  const push = (texts: string[], tone: Notice["tone"]) => {
    const next = texts.filter(Boolean).map((text) => ({ id: ++serial.current, tone, text }));
    setItems((current) => [...next, ...current].slice(0, 6));
  };
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
  const [left, setLeft] = useState(total);

  useEffect(() => {
    const started = Date.now();
    let closed = false;
    const timer = globalThis.setInterval(() => {
      const remain = total - Math.floor((Date.now() - started) / 1000);
      setLeft(Math.max(remain, 0));
      if (remain <= 0 && !closed) {
        closed = true;
        globalThis.clearInterval(timer);
        onClose(item.id);
      }
    }, 250);
    return () => globalThis.clearInterval(timer);
  }, [item.id, onClose, total]);

  return (
    <article className={item.tone === "ok" ? "notice-card ok" : "notice-card warn"} role={item.tone === "ok" ? "status" : "alert"}>
      <p>{item.text}</p>
      <p className="notice-time">Se quita en {left} s</p>
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
