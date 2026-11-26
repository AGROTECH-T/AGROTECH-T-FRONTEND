/**
 * Cliente del módulo de galpón.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { deleteJson, getJson, patchJson, postJson } from "../../../services/api/client.ts";
import { onSessionEnd } from "../../../services/sessionMemory.ts";
import { readToken } from "../../auth/services/session.ts";
import type { EventPage, House, Lot, LotEvent } from "../types/index.ts";

function root(farmId: number): string {
  return `/api/v1/avicultura/${farmId}`;
}

const housesCache = new Map<number, Promise<House[]>>();
const lotsCache = new Map<number, Promise<Lot[]>>();
const houseSnapshot = new Map<number, House[]>();
const lotSnapshot = new Map<number, Lot[]>();

function remember<T>(
  cache: Map<number, Promise<T[]>>,
  snapshot: Map<number, T[]>,
  farmId: number,
  load: () => Promise<T[]>,
): Promise<T[]> {
  const current = cache.get(farmId);
  if (current) return current;
  const pending = load()
    .then((items) => {
      if (cache.get(farmId) === pending) snapshot.set(farmId, items);
      return items;
    })
    .catch((error: unknown) => {
      if (cache.get(farmId) === pending) cache.delete(farmId);
      throw error;
    });
  cache.set(farmId, pending);
  return pending;
}

/** Galpones y lotes ya traídos de esa finca, o null si falta alguno. */
export function galponNow(farmId: number): { houses: House[]; lots: Lot[] } | null {
  const houses = houseSnapshot.get(farmId);
  const lots = lotSnapshot.get(farmId);
  if (!houses || !lots) return null;
  return { houses, lots };
}

/** Empieza a traer galpones y lotes sin esperar a que se abra la pantalla. */
export function preloadGalpon(farmId: number): void {
  void listHouses(farmId);
  void listLots(farmId);
}

function dropGalpon(farmId: number): void {
  housesCache.delete(farmId);
  lotsCache.delete(farmId);
  houseSnapshot.delete(farmId);
  lotSnapshot.delete(farmId);
}

function dropAfter<T>(farmId: number, work: Promise<T>): Promise<T> {
  return work.then((value) => {
    dropGalpon(farmId);
    return value;
  });
}

onSessionEnd(() => {
  housesCache.clear();
  lotsCache.clear();
  houseSnapshot.clear();
  lotSnapshot.clear();
});

export function listHouses(farmId: number): Promise<House[]> {
  return remember(housesCache, houseSnapshot, farmId, () =>
    getJson<House[]>(`${root(farmId)}/galpones/`, readToken()),
  );
}

export function createHouse(farmId: number, body: Record<string, unknown>): Promise<House> {
  return dropAfter(farmId, postJson<House>(`${root(farmId)}/galpones/`, body, readToken()));
}

export function updateHouse(
  farmId: number,
  houseId: number,
  body: Record<string, unknown>,
): Promise<House> {
  return dropAfter(farmId, patchJson<House>(`${root(farmId)}/galpones/${houseId}/`, body, readToken()));
}

export function deleteHouse(farmId: number, houseId: number): Promise<void> {
  return dropAfter(farmId, deleteJson(`${root(farmId)}/galpones/${houseId}/`, readToken()));
}

export function listLots(farmId: number): Promise<Lot[]> {
  return remember(lotsCache, lotSnapshot, farmId, () =>
    getJson<Lot[]>(`${root(farmId)}/lotes/`, readToken()),
  );
}

export function openLot(farmId: number, body: Record<string, unknown>): Promise<Lot> {
  return dropAfter(farmId, postJson<Lot>(`${root(farmId)}/lotes/`, body, readToken()));
}

export function getLot(farmId: number, lotId: number): Promise<Lot> {
  return getJson<Lot>(`${root(farmId)}/lotes/${lotId}/`, readToken());
}

export function updateLot(
  farmId: number,
  lotId: number,
  body: Record<string, unknown>,
): Promise<Lot> {
  return dropAfter(farmId, patchJson<Lot>(`${root(farmId)}/lotes/${lotId}/`, body, readToken()));
}

export function deleteLot(farmId: number, lotId: number): Promise<void> {
  return dropAfter(farmId, deleteJson(`${root(farmId)}/lotes/${lotId}/`, readToken()));
}

export function closeLot(farmId: number, lotId: number, note: string): Promise<Lot> {
  return dropAfter(farmId, postJson<Lot>(`${root(farmId)}/lotes/${lotId}/cerrar/`, { note }, readToken()));
}

export function reopenLot(farmId: number, lotId: number): Promise<Lot> {
  return dropAfter(farmId, postJson<Lot>(`${root(farmId)}/lotes/${lotId}/reabrir/`, {}, readToken()));
}

export const EVENT_PAGE_SIZE = 15;

/**
 * Una página de bitácora, sin bajar todo el lote.
 * @param farmId - Finca.
 * @param lotId - Lote.
 * @param query - Filtro de tipo y número de página.
 * @returns Página con totales por tipo.
 */
export function listEvents(
  farmId: number,
  lotId: number,
  query: { kind?: string; page?: number } = {},
): Promise<EventPage> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("page_size", String(EVENT_PAGE_SIZE));
  if (query.kind) params.set("kind", query.kind);
  return getJson<EventPage>(`${root(farmId)}/lotes/${lotId}/eventos/?${params}`, readToken());
}

export function createEvent(
  farmId: number,
  lotId: number,
  body: Record<string, unknown>,
): Promise<LotEvent> {
  return dropAfter(
    farmId,
    postJson<LotEvent>(`${root(farmId)}/lotes/${lotId}/eventos/`, body, readToken()),
  );
}

export function correctEvent(
  farmId: number,
  eventId: number,
  body: Record<string, unknown>,
): Promise<LotEvent> {
  return dropAfter(
    farmId,
    postJson<LotEvent>(`${root(farmId)}/eventos/${eventId}/corregir/`, body, readToken()),
  );
}

export function deleteEvent(farmId: number, eventId: number): Promise<void> {
  return dropAfter(farmId, deleteJson(`${root(farmId)}/eventos/${eventId}/`, readToken()));
}
