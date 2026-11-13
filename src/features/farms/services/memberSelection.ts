/**
 * Selección de integrantes en el listado.
 *
 * Propósito: localizar el integrante pulsado por su id de membresía.
 * Contexto: dos personas pueden llamarse igual; el id es la única clave fiable.
 * @author Cristian Deysdayr Jimenez
 */

import type { FarmMember, FarmMembersResponse } from "../types/index.ts";

/**
 * Busca un integrante de la página cargada por id de membresía.
 * @param data - Página actual del listado.
 * @param membershipId - Id de la membresía pulsada.
 * @returns El integrante, o null si no está en la página.
 */
export function findMember(
  data: FarmMembersResponse | null | undefined,
  membershipId: number,
): FarmMember | null {
  return data?.results.find((member) => member.id === membershipId) ?? null;
}

/**
 * Sustituye en la página cargada la membresía con el mismo id.
 * @param data - Página actual (o null si aún no hay).
 * @param updated - Membresía devuelta por el backend.
 * @returns Una página nueva; la misma referencia si no había datos.
 */
export function replaceMember(
  data: FarmMembersResponse | null,
  updated: FarmMember,
): FarmMembersResponse | null {
  if (!data) return data;
  return {
    ...data,
    results: data.results.map((member) => (member.id === updated.id ? updated : member)),
  };
}
