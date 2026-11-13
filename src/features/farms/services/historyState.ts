/**
 * Estado de un historial paginado.
 *
 * Propósito: describir carga, éxito, vacío y error de una página de
 * auditoría de forma pura y comprobable.
 * Contexto: lo usa el historial individual de un integrante.
 * @author Cristian Deysdayr Jimenez
 */

import type { HistoryPage } from "../types/index.ts";
import { totalPages } from "./eventDescription.ts";

export type HistoryState = {
  page: number;
  data: HistoryPage | null;
  loading: boolean;
  error: string;
};

export type HistoryAction =
  | { type: "start"; page: number }
  | { type: "success"; page: number; data: HistoryPage }
  | { type: "failure"; error: string };

export const INITIAL_HISTORY: HistoryState = {
  page: 1,
  data: null,
  loading: false,
  error: "",
};

/**
 * Aplica una transición. En un fallo se conserva la página anterior para que
 * "Reintentar" repita la misma consulta.
 */
export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case "start":
      return { ...state, loading: true, error: "", page: action.page };
    case "success":
      return { page: action.page, data: action.data, loading: false, error: "" };
    case "failure":
      return { ...state, loading: false, error: action.error };
  }
}

/** Vista derivada para pintar el historial. */
export type HistoryView =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | {
      kind: "list";
      data: HistoryPage;
      page: number;
      pages: number;
      hasPrevious: boolean;
      hasNext: boolean;
    };

/** @returns Qué debe mostrarse para el estado y tamaño de página dados. */
export function historyView(state: HistoryState, pageSize: number): HistoryView {
  if (state.loading) return { kind: "loading" };
  if (state.error) return { kind: "error", message: state.error };
  if (!state.data) return { kind: "idle" };
  if (state.data.results.length === 0) return { kind: "empty" };
  return {
    kind: "list",
    data: state.data,
    page: state.page,
    pages: totalPages(state.data.count, pageSize),
    hasPrevious: Boolean(state.data.previous),
    hasNext: Boolean(state.data.next),
  };
}
