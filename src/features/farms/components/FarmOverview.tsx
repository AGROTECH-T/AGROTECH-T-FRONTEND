/**
 * Avisos del resumen de una finca.
 *
 * Propósito: mostrar solo el estado de finca desactivada cuando aplica.
 * El trabajo por módulo vive en las pestañas Inventarios y Galpones.
 * @author Cristian Deysdayr Jimenez
 */

import type { Farm, FarmInvitation } from "../types/index.ts";

/**
 * Cuenta invitaciones por estado y devuelve la más reciente.
 * @param invitations - Invitaciones de la finca.
 * @returns Total, aceptadas, pendientes y la última invitación.
 */
export function invitationStats(invitations: readonly FarmInvitation[]) {
  const latest =
    [...invitations].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  return {
    total: invitations.length,
    accepted: invitations.filter((item) => item.status === "accepted").length,
    pending: invitations.filter((item) => item.status === "pending").length,
    latest,
  };
}

/**
 * Iniciales (máximo dos) para el avatar de una persona.
 * @param name - Nombre o correo.
 * @returns Iniciales en mayúsculas.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

type Props = {
  farm: Farm;
  /** Puede reactivar: el aviso de finca desactivada remite a Configuración. */
  canReactivate: boolean;
};

/**
 * Aviso de finca desactivada.
 * @param props - Finca y capacidad de reactivar.
 * @returns Bloque de estado o null si la finca está activa.
 */
export function FarmOverview({ farm, canReactivate }: Readonly<Props>) {
  if (farm.is_active) return null;
  return (
    <div className="farm-state farm-lifecycle" role="status">
      <p className="farm-empty__title">Finca desactivada</p>
      <p className="farm-empty__hint">
        {canReactivate
          ? "No aparece en tu listado ni admite cambios. Puedes reactivarla desde Configuración."
          : "Esta finca no está operativa."}
      </p>
    </div>
  );
}
