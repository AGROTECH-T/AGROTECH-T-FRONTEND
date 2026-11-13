/**
 * Cliente del módulo de galpón.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { deleteJson, getJson, patchJson, postJson } from "../../../services/api/client.ts";
import { readToken } from "../../auth/services/session.ts";
import type { House, Lot, LotEvent } from "../types/index.ts";

function root(farmId: number): string {
  return `/api/v1/avicultura/${farmId}`;
}

export function listHouses(farmId: number): Promise<House[]> {
  return getJson<House[]>(`${root(farmId)}/galpones/`, readToken());
}

export function createHouse(farmId: number, body: Record<string, unknown>): Promise<House> {
  return postJson<House>(`${root(farmId)}/galpones/`, body, readToken());
}

export function updateHouse(
  farmId: number,
  houseId: number,
  body: Record<string, unknown>,
): Promise<House> {
  return patchJson<House>(`${root(farmId)}/galpones/${houseId}/`, body, readToken());
}

export function deleteHouse(farmId: number, houseId: number): Promise<void> {
  return deleteJson(`${root(farmId)}/galpones/${houseId}/`, readToken());
}

export function listLots(farmId: number): Promise<Lot[]> {
  return getJson<Lot[]>(`${root(farmId)}/lotes/`, readToken());
}

export function openLot(farmId: number, body: Record<string, unknown>): Promise<Lot> {
  return postJson<Lot>(`${root(farmId)}/lotes/`, body, readToken());
}

export function getLot(farmId: number, lotId: number): Promise<Lot> {
  return getJson<Lot>(`${root(farmId)}/lotes/${lotId}/`, readToken());
}

export function updateLot(
  farmId: number,
  lotId: number,
  body: Record<string, unknown>,
): Promise<Lot> {
  return patchJson<Lot>(`${root(farmId)}/lotes/${lotId}/`, body, readToken());
}

export function deleteLot(farmId: number, lotId: number): Promise<void> {
  return deleteJson(`${root(farmId)}/lotes/${lotId}/`, readToken());
}

export function closeLot(farmId: number, lotId: number, note: string): Promise<Lot> {
  return postJson<Lot>(`${root(farmId)}/lotes/${lotId}/cerrar/`, { note }, readToken());
}

export function reopenLot(farmId: number, lotId: number): Promise<Lot> {
  return postJson<Lot>(`${root(farmId)}/lotes/${lotId}/reabrir/`, {}, readToken());
}

export function listEvents(farmId: number, lotId: number): Promise<LotEvent[]> {
  return getJson<LotEvent[]>(`${root(farmId)}/lotes/${lotId}/eventos/`, readToken());
}

export function createEvent(
  farmId: number,
  lotId: number,
  body: Record<string, unknown>,
): Promise<LotEvent> {
  return postJson<LotEvent>(`${root(farmId)}/lotes/${lotId}/eventos/`, body, readToken());
}

export function correctEvent(
  farmId: number,
  eventId: number,
  body: Record<string, unknown>,
): Promise<LotEvent> {
  return postJson<LotEvent>(
    `${root(farmId)}/eventos/${eventId}/corregir/`,
    body,
    readToken(),
  );
}

export function deleteEvent(farmId: number, eventId: number): Promise<void> {
  return deleteJson(`${root(farmId)}/eventos/${eventId}/`, readToken());
}
