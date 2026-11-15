/**
 * Columnas de la bitácora según el filtro.
 *
 * Propósito: cada tipo de registro muestra solo sus campos útiles, no una
 * tabla genérica ni todos los datos llenados.
 * Contexto: la nota completa se abre con Ver; la fila no crece.
 * @author Cristian Deysdayr Jimenez
 */

import type { LotEvent } from "../types/index.ts";
import {
  eventTitle,
  kindLabel,
  numberText,
  stageLabel,
  timeText,
  unitText,
} from "./galponUi.tsx";

export type LogColumnId =
  | "fecha"
  | "hora"
  | "tipo"
  | "cantidad"
  | "quien"
  | "lugar"
  | "etapa"
  | "producto"
  | "accion"
  | "nota"
  | "acciones";

export type LogColumn = {
  id: LogColumnId;
  label: string;
  width: string;
};

const COL = {
  fecha: { id: "fecha", label: "Fecha y día", width: "minmax(128px, 1.1fr)" },
  hora: { id: "hora", label: "Hora", width: "72px" },
  tipo: { id: "tipo", label: "Tipo", width: "minmax(108px, 0.9fr)" },
  cantidad: { id: "cantidad", label: "Cantidad", width: "minmax(96px, 0.8fr)" },
  quien: { id: "quien", label: "Quién", width: "minmax(120px, 1fr)" },
  lugar: { id: "lugar", label: "Lugar", width: "minmax(100px, 1fr)" },
  etapa: { id: "etapa", label: "Etapa", width: "minmax(90px, 0.8fr)" },
  producto: { id: "producto", label: "Producto", width: "minmax(120px, 1fr)" },
  accion: { id: "accion", label: "Acción", width: "minmax(120px, 0.9fr)" },
  nota: { id: "nota", label: "Nota", width: "minmax(140px, 1.4fr)" },
  acciones: { id: "acciones", label: "Acciones", width: "148px" },
} as const satisfies Record<LogColumnId, LogColumn>;

const ALL: LogColumn[] = [
  COL.fecha,
  COL.hora,
  COL.tipo,
  COL.cantidad,
  COL.quien,
  COL.nota,
  COL.acciones,
];

const BY_KIND: Record<string, LogColumn[]> = {
  mortalidad: [COL.fecha, COL.hora, COL.cantidad, COL.lugar, COL.quien, COL.acciones],
  salida: [COL.fecha, COL.hora, COL.cantidad, COL.lugar, COL.quien, COL.acciones],
  aislamiento: [COL.fecha, COL.hora, COL.accion, COL.cantidad, COL.lugar, COL.acciones],
  ajuste: [COL.fecha, COL.hora, COL.accion, COL.cantidad, COL.quien, COL.acciones],
  alimento: [COL.fecha, COL.hora, COL.cantidad, COL.etapa, COL.quien, COL.acciones],
  peso: [COL.fecha, COL.hora, COL.cantidad, COL.quien, COL.acciones],
  agua: [COL.fecha, COL.hora, COL.cantidad, COL.lugar, COL.quien, COL.acciones],
  ambiente: [COL.fecha, COL.hora, COL.cantidad, COL.lugar, COL.quien, COL.acciones],
  sanidad: [COL.fecha, COL.hora, COL.producto, COL.quien, COL.acciones],
  ronda: [COL.fecha, COL.hora, COL.lugar, COL.quien, COL.acciones],
  cama: [COL.fecha, COL.hora, COL.lugar, COL.quien, COL.acciones],
  limpieza: [COL.fecha, COL.hora, COL.lugar, COL.quien, COL.acciones],
};

const DAY = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const WEEKDAY = new Intl.DateTimeFormat("es-CO", { weekday: "long" });

const ACCION: Record<string, string> = {
  apartar: "Apartar",
  devolver: "Devolver al lote",
  sumar: "Sumar aves",
  restar: "Restar aves",
};

/**
 * Columnas visibles según el filtro de tipo.
 * @param filter - Tipo elegido, o vacío para todos.
 * @returns Columnas de esa vista.
 */
export function logColumns(filter: string): LogColumn[] {
  if (!filter) return ALL;
  return BY_KIND[filter] ?? ALL;
}

/**
 * Fecha corta y día de la semana para la columna Fecha y día.
 * @param value - Texto ISO del backend.
 * @returns Día y weekday, o guiones.
 */
export function logDateParts(value: string | null): { day: string; weekday: string } {
  if (!value) return { day: "—", weekday: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "—", weekday: "" };
  const parts = DAY.formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  const month = (parts.find((part) => part.type === "month")?.value ?? "").replace(/\.$/, "");
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  return { day: `${day} ${month} ${year}`, weekday: WEEKDAY.format(date) };
}

/**
 * Ordena la bitácora de lo más reciente a lo más antiguo.
 * @param events - Registros visibles.
 * @returns Copia ordenada por fecha y luego por id.
 */
export function sortLogEvents(events: LotEvent[]): LotEvent[] {
  return [...events].sort((left, right) => {
    const byDate = Date.parse(right.occurred_at) - Date.parse(left.occurred_at);
    return byDate !== 0 ? byDate : right.id - left.id;
  });
}

/**
 * Texto de una celda, ya recortado para no inflar la fila.
 * @param column - Columna pedida.
 * @param event - Registro de bitácora.
 * @returns Valor listo para pintar, o un guion.
 */
export function logCell(column: LogColumnId, event: LotEvent): string {
  if (column === "hora") return timeText(event.occurred_at);
  if (column === "tipo") return eventTitle(event.kind, event.payload);
  if (column === "cantidad") return amountText(event);
  if (column === "quien") return whoText(event);
  if (column === "lugar") return event.place.trim() || "—";
  if (column === "etapa") return stageText(event);
  if (column === "producto") return productText(event);
  if (column === "accion") return actionText(event);
  if (column === "nota") return event.notes.trim() || "—";
  return "";
}

type DetailRow = { label: string; value: string };

/**
 * Datos llenos del registro, para la ventana Ver.
 * @param event - Registro de bitácora.
 * @returns Solo campos con valor, sin relleno vacío.
 */
export function logDetail(event: LotEvent): DetailRow[] {
  const when = logDateParts(event.occurred_at);
  const rows: (DetailRow | null)[] = [
    { label: "Tipo", value: eventTitle(event.kind, event.payload) },
    when.day !== "—" ? { label: "Fecha", value: `${when.day} · ${when.weekday}` } : null,
    { label: "Hora", value: timeText(event.occurred_at) },
    amountText(event) !== "—" ? { label: "Cantidad", value: amountText(event) } : null,
    actionText(event) !== "—" ? { label: "Acción", value: actionText(event) } : null,
    productText(event) !== "—" ? { label: "Producto", value: productText(event) } : null,
    prescriptorText(event) !== "—"
      ? { label: "Quién lo indicó", value: prescriptorText(event) }
      : null,
    stageText(event) !== "—" ? { label: "Etapa", value: stageText(event) } : null,
    event.place.trim() ? { label: "Lugar", value: event.place.trim() } : null,
    event.responsible.trim() ? { label: "Quién", value: whoText(event) } : null,
    event.notes.trim() ? { label: "Nota", value: event.notes.trim() } : null,
  ];
  return rows.filter((row): row is DetailRow => row !== null);
}

function amountText(event: LotEvent): string {
  if (event.observed_value == null || event.observed_value === "") return "—";
  const unit = unitText(event.unit, event.observed_value);
  const extra = event.estimated ? " est." : "";
  return `${numberText(event.observed_value)} ${unit}${extra}`.trim();
}

function whoText(event: LotEvent): string {
  const name = event.responsible.trim();
  if (!name) return "—";
  return event.confirmed ? `${name} · confirmado` : name;
}

function stageText(event: LotEvent): string {
  const raw = String(event.payload.etapa ?? "").trim();
  return raw ? stageLabel(raw) : "—";
}

function productText(event: LotEvent): string {
  const raw = String(event.payload.producto ?? "").trim();
  return raw || "—";
}

function prescriptorText(event: LotEvent): string {
  const raw = String(event.payload.prescriptor ?? "").trim();
  return raw || "—";
}

function actionText(event: LotEvent): string {
  const raw = String(event.payload.direccion ?? "").trim();
  return ACCION[raw] ?? (raw || "—");
}

/**
 * Título de la ventana Ver.
 * @param event - Registro.
 * @returns Nombre del tipo.
 */
export function logDetailTitle(event: LotEvent): string {
  return kindLabel(event.kind);
}
