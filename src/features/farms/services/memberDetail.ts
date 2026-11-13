/**
 * Consulta del detalle de un integrante.
 *
 * Propósito: confirmar la membresía antes de pedir su historial.
 * Contexto: GET .../members/{id}/history/ responde 200 vacío para ids que no
 * existen; por eso el historial solo se consulta tras un GET de detalle
 * exitoso del integrante abierto desde el listado.
 * @author Cristian Deysdayr Jimenez
 */

import type { FarmMember, HistoryPage } from "../types/index.ts";

export const MEMBER_HISTORY_PAGE_SIZE = 20;

/** Operaciones HTTP del detalle (inyectables en pruebas). */
export type MemberDetailApi = {
  getFarmMember: (farmId: number, membershipId: number) => Promise<FarmMember>;
  listMemberHistory: (
    farmId: number,
    membershipId: number,
    page?: number,
    pageSize?: number,
  ) => Promise<HistoryPage>;
};

/**
 * Lee el integrante; si el backend lo confirma, pide la primera página de su
 * historial. Si el detalle falla, propaga el error sin consultar historial.
 */
export async function loadMemberDetail(
  api: MemberDetailApi,
  farmId: number,
  membershipId: number,
): Promise<{ member: FarmMember; history: Promise<HistoryPage> }> {
  const member = await api.getFarmMember(farmId, membershipId);
  return {
    member,
    history: api.listMemberHistory(farmId, member.id, 1, MEMBER_HISTORY_PAGE_SIZE),
  };
}

/** Pide una página concreta del historial de un integrante ya confirmado. */
export function loadMemberHistoryPage(
  api: MemberDetailApi,
  farmId: number,
  member: FarmMember,
  page: number,
): Promise<HistoryPage> {
  return api.listMemberHistory(farmId, member.id, page, MEMBER_HISTORY_PAGE_SIZE);
}

/** @returns Mensaje legible de un error de la API. */
export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}
