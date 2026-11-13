/**
 * Pantalla del galpón de engorde.
 *
 * Propósito: recorrer la finca como en la vida real: primero los galpones,
 * luego los lotes de cada galpón y por último la bitácora e indicadores de
 * ese lote.
 * Contexto: el rol de la finca decide si se puede escribir.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useState } from "react";
import { BackButton } from "../../../components/ui/BackButton.tsx";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { listFarms } from "../../farms/services/farmsApi.ts";
import type { Farm, FarmRole } from "../../farms/types/index.ts";
import {
  getLot,
  listEvents,
  listHouses,
  listLots,
} from "../services/galponApi.ts";
import type { House, Lot, LotEvent } from "../types/index.ts";
import { HouseWorkspace } from "./HouseWorkspace.tsx";
import { HousesView } from "./HousesView.tsx";
import { LotWorkspace } from "./LotWorkspace.tsx";
import { Empty } from "./galponUi.tsx";

type Props = {
  onCreateFarm?: () => void;
};

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

/**
 * Opera el engorde de la finca elegida.
 * @param props - Acción para crear una finca cuando todavía no hay ninguna.
 * @returns Cabecera, ruta y contenido de la pantalla actual.
 */
export function GalponPanel({ onCreateFarm }: Readonly<Props> = {}) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState<number | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [houseId, setHouseId] = useState<number | null>(null);
  const [lotId, setLotId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Lot | null>(null);
  const [events, setEvents] = useState<LotEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const notices = useNotices();

  const notify = useCallback(
    (text: string, tone: "ok" | "warn" = "ok") => {
      notices.push([text], tone);
    },
    [notices],
  );

  const farm = farms.find((item) => item.id === farmId) ?? null;
  const role: FarmRole = farm?.role ?? "consulta";
  const canWrite = role === "administrador" || role === "operador";
  const house = houseId == null ? null : houses.find((item) => item.id === houseId) ?? null;
  const houseLots = houseId == null ? [] : lots.filter((item) => item.house_id === houseId);
  const lot = detail?.id === lotId ? detail : null;

  const reload = useCallback(async (id: number) => {
    const [nextHouses, nextLots] = await Promise.all([listHouses(id), listLots(id)]);
    setHouses(nextHouses);
    setLots(nextLots);
  }, []);

  const refreshLot = useCallback(async () => {
    if (farmId == null || lotId == null) return;
    const [nextLot, nextEvents] = await Promise.all([
      getLot(farmId, lotId),
      listEvents(farmId, lotId),
    ]);
    setDetail(nextLot);
    setEvents(nextEvents);
  }, [farmId, lotId]);

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
    setError("");
    void reload(farmId).catch((cause) =>
      setError(message(cause, "No se pudo cargar el galpón")),
    );
  }, [farmId, reload]);

  useEffect(() => {
    if (houseId != null && !houses.some((item) => item.id === houseId)) {
      setHouseId(null);
      setLotId(null);
    }
  }, [houses, houseId]);

  useEffect(() => {
    if (lotId == null) {
      setDetail(null);
      setEvents([]);
      return;
    }
    setError("");
    void refreshLot().catch((cause) => setError(message(cause, "No se pudo abrir el lote")));
  }, [lotId, refreshLot]);

  const openHouse = (item: House) => {
    setError("");
    setHouseId(item.id);
    setLotId(null);
  };

  const openLot = (id: number) => {
    setError("");
    setLotId(id);
  };

  const backToList = () => {
    setHouseId(null);
    setLotId(null);
    setError("");
  };

  const backToHouse = () => {
    setLotId(null);
    setError("");
  };

  const changeFarm = (id: number) => {
    setFarmId(id);
    setHouseId(null);
    setLotId(null);
    setDetail(null);
    setEvents([]);
  };

  const afterChange = async () => {
    if (farmId == null) return;
    await reload(farmId);
    await refreshLot();
  };

  return (
    <section className="galpon" aria-labelledby="galpon-title">
      <NoticeStack items={notices.items} onClose={notices.close} />

      <div className={house ? "panel galpon__panel is-drilldown" : "panel galpon__panel"}>
        {house ? (
          <BackButton onClick={lot ? backToHouse : backToList} />
        ) : null}

        <header className="panel__header galpon__head">
          <div className="galpon__head-main">
            <h1 id="galpon-title" className="panel__title">
              Galpón
            </h1>
            <p className="panel__lead">
              Galpones, lotes y bitácora del engorde. Abre un galpón para trabajar sus lotes.
            </p>
          </div>

          {farm ? (
            <div className="galpon__head-side">
              {farms.length > 1 ? (
                <label className="gp-tool-field galpon__farm-select">
                  <span>Finca</span>
                  <select
                    value={farmId ?? ""}
                    onChange={(event) => changeFarm(Number(event.target.value))}
                  >
                    {farms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="galpon__farm">
                  <span>Finca</span>
                  <strong>{farm.name}</strong>
                </div>
              )}
            </div>
          ) : null}
        </header>

        {error ? (
          <p className="galpon__error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="galpon__loading" role="status">
            Cargando galpones...
          </p>
        ) : null}

        {!loading && farmId == null ? (
          <Empty
            title="Primero crea una finca"
            action={
              onCreateFarm ? (
                <button type="button" className="btn-primary" onClick={onCreateFarm}>
                  Crear finca
                </button>
              ) : undefined
            }
          >
            El galpón vive dentro de una finca. Crea una y vuelve para registrar tus aves.
          </Empty>
        ) : null}

        {!loading && farmId != null ? (
          <>
            {houseId == null ? (
              <HousesView
                farmId={farmId}
                houses={houses}
                canWrite={canWrite}
                onOpen={openHouse}
                onChanged={() => reload(farmId)}
                notify={notify}
              />
            ) : null}

            {houseId != null && lotId == null && house ? (
              <HouseWorkspace
                farmId={farmId}
                house={house}
                lots={houseLots}
                canWrite={canWrite}
                onOpenLot={openLot}
                onChanged={() => reload(farmId)}
                onBack={backToList}
                notify={notify}
              />
            ) : null}

            {lotId != null ? (
              lot ? (
                <LotWorkspace
                  farmId={farmId}
                  house={house}
                  lot={lot}
                  events={events}
                  canWrite={canWrite}
                  onChanged={afterChange}
                  onDeleted={async () => {
                    backToHouse();
                    if (farmId != null) await reload(farmId);
                  }}
                  notify={notify}
                />
              ) : (
                <p className="galpon__loading" role="status">
                  Cargando lote...
                </p>
              )
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
