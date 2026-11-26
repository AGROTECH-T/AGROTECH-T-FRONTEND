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
import { farmsNow, listFarms } from "../../farms/services/farmsApi.ts";
import type { Farm } from "../../farms/types/index.ts";
import { galponNow, getLot, listHouses, listLots } from "../services/galponApi.ts";
import { canWriteGalpon } from "../services/galponAccess.ts";
import type { House, Lot } from "../types/index.ts";
import { HouseWorkspace } from "./HouseWorkspace.tsx";
import { HousesView } from "./HousesView.tsx";
import { LotWorkspace } from "./LotWorkspace.tsx";
import { Empty } from "./galponUi.tsx";

type Props = {
  tick?: number;
  onCreateFarm?: () => void;
  /** Finca preferida al abrir desde el detalle de finca. */
  initialFarmId?: number;
  /** Galpón preferido al abrir desde el detalle de finca. */
  initialHouseId?: number;
};

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

function pickFarm(items: Farm[], initialFarmId?: number): number | null {
  if (initialFarmId != null && items.some((item) => item.id === initialFarmId)) {
    return initialFarmId;
  }
  return items[0]?.id ?? null;
}

/**
 * Opera el engorde de la finca elegida.
 * @param props - Acción para crear una finca cuando todavía no hay ninguna.
 * @returns Cabecera, ruta y contenido de la pantalla actual.
 */
export function GalponPanel({
  tick = 0,
  onCreateFarm,
  initialFarmId,
  initialHouseId,
}: Readonly<Props> = {}) {
  const known = farmsNow();
  const startId = known ? pickFarm(known, initialFarmId) : null;
  const board = startId != null ? galponNow(startId) : null;
  const [farms, setFarms] = useState<Farm[]>(() => known ?? []);
  const [farmId, setFarmId] = useState<number | null>(startId);
  const [houses, setHouses] = useState<House[]>(() => board?.houses ?? []);
  const [lots, setLots] = useState<Lot[]>(() => board?.lots ?? []);
  const [loadedFarm, setLoadedFarm] = useState<number | null>(board ? startId : null);
  const [houseId, setHouseId] = useState<number | null>(null);
  const [lotId, setLotId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Lot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(board == null);
  const notices = useNotices();

  const notify = useCallback(
    (text: string, tone: "ok" | "warn" = "ok") => {
      notices.push([text], tone);
    },
    [notices.push],
  );

  const farm = farms.find((item) => item.id === farmId) ?? null;
  const canWrite = canWriteGalpon(farm);
  const house = houseId == null ? null : houses.find((item) => item.id === houseId) ?? null;
  const houseLots = houseId == null ? [] : lots.filter((item) => item.house_id === houseId);
  const lot = detail?.id === lotId ? detail : null;
  const heading =
    lot != null ? `Bitácora · ${lot.code}` : lotId != null ? "Bitácora" : house ? "Lotes" : "Galpón";
  const lead =
    lot != null
      ? `Anota la bitácora del lote ${lot.code} y revisa sus indicadores.`
      : lotId != null
        ? "Anota la bitácora y revisa los indicadores de este lote."
        : house
          ? "Lotes de este galpón. Abre uno para anotar su bitácora."
          : "Galpones, lotes y bitácora del engorde. Abre un galpón para trabajar sus lotes.";

  const reload = useCallback(async (id: number) => {
    const [nextHouses, nextLots] = await Promise.all([listHouses(id), listLots(id)]);
    setHouses(nextHouses);
    setLots(nextLots);
  }, []);

  const refreshLot = useCallback(async () => {
    if (farmId == null || lotId == null) return;
    setDetail(await getLot(farmId, lotId));
  }, [farmId, lotId]);

  useEffect(() => {
    let alive = true;
    if (farmsNow() == null) setLoading(true);
    void listFarms()
      .then((items) => {
        if (!alive) return;
        setFarms(items);
        const preferred = pickFarm(items, initialFarmId);
        setFarmId(preferred);
        if (preferred == null) setLoading(false);
      })
      .catch((cause) => {
        if (!alive) return;
        setError(message(cause, "No se pudieron cargar las fincas"));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tick, initialFarmId]);

  useEffect(() => {
    if (tick === 0 && initialHouseId == null) return;
    setLotId(null);
    setDetail(null);
    setError("");
    setHouseId(initialHouseId ?? null);
  }, [tick, initialHouseId]);

  useEffect(() => {
    if (farmId == null) return;
    let alive = true;
    setError("");
    if (galponNow(farmId) == null) {
      setLoading(true);
      setLoadedFarm(null);
    }
    void reload(farmId)
      .then(() => {
        if (alive) setLoadedFarm(farmId);
      })
      .catch((cause) => {
        if (alive) setError(message(cause, "No se pudo cargar el galpón"));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
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
    const ready = galponNow(id);
    setFarmId(id);
    setHouseId(null);
    setLotId(null);
    setDetail(null);
    if (ready) {
      setHouses(ready.houses);
      setLots(ready.lots);
      setLoadedFarm(id);
      setLoading(false);
      return;
    }
    setLoadedFarm(null);
    setLoading(true);
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
              {heading}
            </h1>
            <p className="panel__lead">{lead}</p>
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

        {!loading && farmId == null && !error ? (
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

        {!loading && farmId != null && loadedFarm === farmId ? (
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
                notify={notify}
              />
            ) : null}

            {lotId != null ? (
              lot ? (
                <LotWorkspace
                  farmId={farmId}
                  house={house}
                  lot={lot}
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
