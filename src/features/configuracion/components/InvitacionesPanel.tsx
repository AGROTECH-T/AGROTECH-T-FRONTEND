/**
 * Invitaciones desde Configuración.
 *
 * Propósito: enviar y administrar invitaciones eligiendo la finca.
 * Contexto: mismo flujo que la pestaña Invitaciones del detalle de finca.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { FarmInvitations } from "../../farms/components/FarmInvitations.tsx";
import { listFarms } from "../../farms/services/farmsApi.ts";
import { canManageInvitations } from "../../farms/services/invitationAdmin.ts";
import type { Farm } from "../../farms/types/index.ts";

/**
 * Selector de finca + formulario/listado de invitaciones.
 * @returns Panel de invitaciones de Configuración.
 */
export function InvitacionesPanel() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const notices = useNotices();

  const managed = useMemo(() => farms.filter((farm) => canManageInvitations(farm)), [farms]);
  const selected = managed.find((farm) => farm.id === farmId) ?? null;

  const loadFarms = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const items = await listFarms();
      setFarms(items);
      const usable = items.filter((farm) => canManageInvitations(farm));
      setFarmId((current) => {
        if (current != null && usable.some((farm) => farm.id === current)) return current;
        return usable[0]?.id ?? null;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las fincas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFarms();
  }, [loadFarms]);

  return (
    <div className="config-invites">
      <NoticeStack items={notices.items} onClose={notices.close} />

      {loading ? <p className="config-invites__hint">Cargando fincas...</p> : null}
      {error ? (
        <p className="config-invites__error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && managed.length === 0 ? (
        <div className="config-invites__empty" role="status">
          <p className="config-invites__title">No puedes enviar invitaciones aún</p>
          <p className="config-invites__hint">
            Necesitas ser administrador de una finca activa para invitar por correo.
          </p>
        </div>
      ) : null}

      {managed.length > 0 ? (
        <label className="config-invites__farm">
          <span>Finca</span>
          <select
            value={farmId ?? ""}
            onChange={(event) => setFarmId(Number(event.target.value))}
          >
            {managed.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {selected ? (
        <FarmInvitations
          farmId={selected.id}
          canManage
          onNotice={(text, tone) => notices.push([text], tone)}
          onAccessStale={() => void loadFarms()}
        />
      ) : null}
    </div>
  );
}
