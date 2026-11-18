/**
 * Accesos directos a inventario y galpón desde la finca.
 *
 * Propósito: mostrar cada inventario o cada galpón de la finca como tarjeta
 * (una finca puede tener varios) y abrir el módulo correcto.
 * Distribución: una pestaña del detalle pide solo inventarios o solo galpones.
 * Contexto: la navegación la decide el shell.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import galponIcon from "../../../assets/icons/galpon.png";
import inventarioIcon from "../../../assets/icons/inventario.png";
import { listHouses } from "../../galpon/services/galponApi.ts";
import type { House } from "../../galpon/types/index.ts";
import { listInventories, type FarmInventory } from "../../inventario/services/farmInventories.ts";

export type FarmModuleAccessApi = {
  listInventories: (farmId: number) => FarmInventory[];
  listHouses: (farmId: number) => Promise<House[]>;
};

const DEFAULT_API: FarmModuleAccessApi = {
  listInventories,
  listHouses,
};

export type FarmModuleKind = "inventarios" | "galpones";

type Props = {
  farmId: number;
  farmActive: boolean;
  kind: FarmModuleKind;
  onOpenInventory: (inventoryId?: string) => void;
  onOpenGalpon: (houseId?: number) => void;
  api?: FarmModuleAccessApi;
};

type Load<T> = { kind: "loading" } | { kind: "error" } | { kind: "ok"; data: T };

function houseMeta(house: House): string {
  const status = house.status === "ocupado" ? "Ocupado" : "Disponible";
  if (house.open_lot_code) return `${status} · lote ${house.open_lot_code}`;
  if (house.location) return `${status} · ${house.location}`;
  return status;
}

/**
 * Bloque de acceso a inventarios o galpones de la finca.
 */
export function FarmModuleAccess({
  farmId,
  farmActive,
  kind,
  onOpenInventory,
  onOpenGalpon,
  api = DEFAULT_API,
}: Readonly<Props>) {
  const [inventories, setInventories] = useState<Load<FarmInventory[]>>({ kind: "loading" });
  const [houses, setHouses] = useState<Load<House[]>>({ kind: "loading" });

  useEffect(() => {
    if (kind !== "inventarios") return;
    setInventories({ kind: "loading" });
    try {
      setInventories({ kind: "ok", data: api.listInventories(farmId) });
    } catch {
      setInventories({ kind: "error" });
    }
  }, [api, farmId, kind]);

  useEffect(() => {
    if (kind !== "galpones") return;
    let alive = true;
    setHouses({ kind: "loading" });
    void api
      .listHouses(farmId)
      .then((data) => {
        if (alive) setHouses({ kind: "ok", data });
      })
      .catch(() => {
        if (alive) setHouses({ kind: "error" });
      });
    return () => {
      alive = false;
    };
  }, [api, farmId, kind]);

  if (!farmActive) {
    return (
      <section className="farm-access" aria-label="Accesos de la finca">
        <p className="farm-access__hint">
          Reactiva la finca para trabajar su inventario y sus galpones.
        </p>
      </section>
    );
  }

  if (kind === "inventarios") {
    const rows = inventories.kind === "ok" ? inventories.data : [];
    return (
      <section className="farm-access" aria-label="Inventarios de la finca">
        <header className="farm-access__intro">
          <h2>Inventarios</h2>
          <p>Elige un inventario. Una finca puede tener varios.</p>
        </header>

        {inventories.kind === "loading" ? (
          <p className="farm-access__state">Cargando inventarios…</p>
        ) : null}
        {inventories.kind === "error" ? (
          <p className="farm-access__state">No se pudieron cargar los inventarios.</p>
        ) : null}
        {inventories.kind === "ok" && rows.length === 0 ? (
          <p className="farm-access__state">Aún no hay inventarios en esta finca.</p>
        ) : null}

        {inventories.kind === "ok" && rows.length > 0 ? (
          <ul className="farm-access__tiles">
            {rows.map((item) => (
              <li key={item.id}>
                <article className="farm-access__tile">
                  <span className="farm-access__tile-mark" aria-hidden="true">
                    <img src={inventarioIcon} alt="" width={28} height={28} decoding="async" />
                  </span>
                  <div className="farm-access__tile-body">
                    <h4>{item.name}</h4>
                    <p>Despensa de la finca</p>
                    <button
                      type="button"
                      className="farm-access__open"
                      onClick={() => onOpenInventory(item.id)}
                    >
                      Abrir inventario
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : null}

        <button type="button" className="btn-secondary farm-access__all" onClick={() => onOpenInventory()}>
          Ver todos los inventarios
        </button>
      </section>
    );
  }

  const rows = houses.kind === "ok" ? houses.data : [];
  return (
    <section className="farm-access" aria-label="Galpones de la finca">
      <header className="farm-access__intro">
        <h2>Galpones</h2>
        <p>Elige un galpón. Una finca puede tener varios.</p>
      </header>

      {houses.kind === "loading" ? <p className="farm-access__state">Cargando galpones…</p> : null}
      {houses.kind === "error" ? (
        <p className="farm-access__state">No se pudieron cargar los galpones.</p>
      ) : null}
      {houses.kind === "ok" && rows.length === 0 ? (
        <p className="farm-access__state">Aún no hay galpones. Créalos desde el módulo Galpón.</p>
      ) : null}

      {houses.kind === "ok" && rows.length > 0 ? (
        <ul className="farm-access__tiles">
          {rows.map((item) => (
            <li key={item.id}>
              <article className="farm-access__tile" data-status={item.status}>
                <span className="farm-access__tile-mark" aria-hidden="true">
                  <img src={galponIcon} alt="" width={28} height={28} decoding="async" />
                </span>
                <div className="farm-access__tile-body">
                  <div className="farm-access__tile-head">
                    <h4>{item.name}</h4>
                    <span className="farm-access__badge" data-status={item.status}>
                      {item.status === "ocupado" ? "Ocupado" : "Disponible"}
                    </span>
                  </div>
                  <p>{houseMeta(item)}</p>
                  <button
                    type="button"
                    className="farm-access__open"
                    onClick={() => onOpenGalpon(item.id)}
                  >
                    Abrir galpón
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      ) : null}

      <button type="button" className="btn-secondary farm-access__all" onClick={() => onOpenGalpon()}>
        Ver todos los galpones
      </button>
    </section>
  );
}
