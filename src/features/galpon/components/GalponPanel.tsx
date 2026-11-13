/**
 * Pantalla del galpon de engorde.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useState } from "react";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { listFarms } from "../../farms/services/farmsApi.ts";
import type { Farm, FarmRole } from "../../farms/types/index.ts";
import { listHouses } from "../services/galponApi.ts";
import type { House } from "../types/index.ts";
import { HousesView } from "./HousesView.tsx";
import { Empty } from "./galponUi.tsx";

type Props = { onCreateFarm?: () => void };

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export function GalponPanel({ onCreateFarm }: Readonly<Props> = {}) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState<number | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const notices = useNotices();
  const farm = farms.find((item) => item.id === farmId) ?? null;
  const role: FarmRole = farm?.role ?? "consulta";
  const canWrite = role === "administrador" || role === "operador";

  const reload = useCallback(async (id: number) => {
    setHouses(await listHouses(id));
  }, []);

  useEffect(() => {
    void listFarms()
      .then((items) => {
        setFarms(items);
        setFarmId(items[0]?.id ?? null);
      })
      .catch((cause) => setError(message(cause, "No se pudieron cargar las fincas")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (farmId == null) return;
    void reload(farmId).catch((cause) => setError(message(cause, "No se pudo cargar el galpon")));
  }, [farmId, reload]);

  return (
    <section className="galpon" aria-labelledby="galpon-title">
      <NoticeStack items={notices.items} onClose={notices.close} />
      <div className="panel galpon__panel">
        <header className="panel__header galpon__head">
          <div className="galpon__head-main">
            <h1 id="galpon-title" className="panel__title">Galpon</h1>
            <p className="panel__lead">Galpones de la finca. Crea uno para empezar el engorde.</p>
          </div>
        </header>
        {error ? <p className="galpon__error" role="alert">{error}</p> : null}
        {loading ? <p className="galpon__loading" role="status">Cargando galpones...</p> : null}
        {!loading && farmId == null ? (
          <Empty
            title="Primero crea una finca"
            action={
              onCreateFarm ? (
                <button type="button" className="btn-primary" onClick={onCreateFarm}>Crear finca</button>
              ) : undefined
            }
          >
            El galpon vive dentro de una finca.
          </Empty>
        ) : null}
        {!loading && farmId != null ? (
          <HousesView
            farmId={farmId}
            houses={houses}
            canWrite={canWrite}
            onOpen={() => undefined}
            onChanged={() => reload(farmId)}
            notify={(text, tone = "ok") => notices.push([text], tone)}
          />
        ) : null}
      </div>
    </section>
  );
}
