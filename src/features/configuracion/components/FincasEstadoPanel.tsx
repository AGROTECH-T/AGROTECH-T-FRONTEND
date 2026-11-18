/**
 * Ciclo de vida de fincas en Roles y permisos.
 *
 * Propósito: desactivar o reactivar cada finca administrada.
 * Contexto: pestaña Reactivar fincas. Activa → solo Desactivar; desactivada →
 * solo Reactivar en el mismo sitio.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog.tsx";
import { deleteFarm, getFarm, reactivateFarm } from "../../farms/services/farmsApi.ts";
import type { FincaAsignable } from "../types/index.ts";

type Props = {
  fincas: FincaAsignable[];
  onCambiada: (finca: FincaAsignable) => void;
  onAviso: (texto: string, tono: "ok" | "warn") => void;
};

type Accion = {
  farm: FincaAsignable;
  tipo: "deactivate" | "reactivate";
};

/**
 * Lista las fincas del administrador con una sola acción según el estado.
 * @param props - Fincas, callback de cambio y avisos.
 * @returns Bloque de estado de fincas.
 */
export function FincasEstadoPanel({ fincas, onCambiada, onAviso }: Readonly<Props>) {
  const [pendiente, setPendiente] = useState(false);
  const [accion, setAccion] = useState<Accion | null>(null);

  if (!fincas.length) return null;

  async function confirmar() {
    if (!accion) return;
    setPendiente(true);
    try {
      const quedaActiva = accion.tipo === "reactivate";
      if (quedaActiva) {
        await reactivateFarm(accion.farm.id);
      } else {
        await deleteFarm(accion.farm.id);
      }
      let actualizada: FincaAsignable = {
        id: accion.farm.id,
        name: accion.farm.name,
        is_active: quedaActiva,
      };
      try {
        const actual = await getFarm(accion.farm.id);
        actualizada = { id: actual.id, name: actual.name, is_active: actual.is_active };
      } catch {
        // Si la relectura falla, usamos el estado conocido de la acción.
      }
      onCambiada(actualizada);
      onAviso(
        actualizada.is_active
          ? `Finca "${actualizada.name}" reactivada.`
          : `Finca "${actualizada.name}" desactivada.`,
        "ok",
      );
      setAccion(null);
    } catch (cause) {
      onAviso(
        cause instanceof Error ? cause.message : "No se pudo actualizar la finca",
        "warn",
      );
    } finally {
      setPendiente(false);
    }
  }

  return (
    <section className="config-farms-life" aria-label="Estado de tus fincas">
      <header className="config-farms-life__head">
        <h2>Reactivar fincas</h2>
        <p>
          Con la finca activa solo aparece Desactivar. Cuando la desactives, en
          este mismo lugar aparece Reactivar.
        </p>
      </header>
      <ul className="config-farms-life__list">
        {fincas.map((finca) => {
          const desactivada = finca.is_active === false;
          return (
            <li key={finca.id} className="config-farms-life__item">
              <div className="config-farms-life__meta">
                <h3>{finca.name}</h3>
                <span className={desactivada ? "config-status is-off" : "config-status is-on"}>
                  {desactivada ? "Desactivada" : "Activa"}
                </span>
              </div>
              <div className="config-farms-life__actions" role="group" aria-label={`Acciones de ${finca.name}`}>
                {desactivada ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={pendiente}
                    onClick={() => setAccion({ farm: finca, tipo: "reactivate" })}
                  >
                    Reactivar finca
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={pendiente}
                    onClick={() => setAccion({ farm: finca, tipo: "deactivate" })}
                  >
                    Desactivar finca
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={accion !== null}
        title={
          accion?.tipo === "reactivate"
            ? `¿Reactivar la finca "${accion.farm.name}"?`
            : `¿Desactivar la finca "${accion?.farm.name ?? ""}"?`
        }
        description={
          accion?.tipo === "reactivate"
            ? "Volverá a estar operativa y aparecerá de nuevo en tu listado de fincas."
            : "Dejará de estar operativa, pero se conservan sus datos. En este mismo lugar aparecerá Reactivar."
        }
        confirmLabel={accion?.tipo === "reactivate" ? "Reactivar finca" : "Desactivar finca"}
        pendingLabel={accion?.tipo === "reactivate" ? "Reactivando..." : "Desactivando..."}
        loading={pendiente}
        tone={accion?.tipo === "deactivate" ? "warning" : "default"}
        onCancel={() => {
          if (!pendiente) setAccion(null);
        }}
        onConfirm={() => confirmar()}
      />
    </section>
  );
}
