/**
 * Pestaña Reactivar fincas.
 *
 * Propósito: desactivar o reactivar fincas administradas desde Configuración.
 * Contexto: pestaña propia, al lado de Invitaciones; no mezcla roles.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { fetchAsignacion } from "../services/rolesPermisos.ts";
import type { FincaAsignable } from "../types/index.ts";
import { FincasEstadoPanel } from "./FincasEstadoPanel.tsx";

/**
 * Contenido de la pestaña Reactivar fincas.
 * @returns Panel de estado de fincas o aviso si no administra ninguna.
 */
export function ReactivarFincasPanel() {
  const [fincas, setFincas] = useState<FincaAsignable[]>([]);
  const [puedo, setPuedo] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const notices = useNotices();

  useEffect(() => {
    let activo = true;
    fetchAsignacion()
      .then((personas) => {
        if (!activo) return;
        setPuedo(personas.puedo_asignar);
        setFincas(personas.fincas ?? []);
      })
      .catch((cause: unknown) => {
        if (activo) {
          setError(cause instanceof Error ? cause.message : "No se pudieron cargar las fincas");
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (cargando) return <p className="config-state">Cargando fincas...</p>;

  if (!puedo) {
    return (
      <div className="config-empty">
        <h2>Se necesita ser administrador de la finca</h2>
        <p>
          Desactivar y reactivar solo lo puede hacer quien tiene el rol
          Administrador en esa finca.
        </p>
      </div>
    );
  }

  if (!fincas.length) {
    return (
      <div className="config-empty">
        <h2>Aún no hay fincas</h2>
        <p>Crea una finca para poder desactivarla o reactivarla desde aquí.</p>
      </div>
    );
  }

  return (
    <section className="config-reactivar" aria-label="Reactivar fincas">
      <NoticeStack items={notices.items} onClose={notices.close} />
      {error ? <p className="config-assign__error">{error}</p> : null}
      <FincasEstadoPanel
        fincas={fincas}
        onCambiada={(finca) =>
          setFincas((lista) => lista.map((item) => (item.id === finca.id ? finca : item)))
        }
        onAviso={(texto, tono) => notices.push([texto], tono)}
      />
    </section>
  );
}
