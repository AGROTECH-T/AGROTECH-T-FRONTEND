/**
 * Catálogo en un solo lugar.
 *
 * Propósito: entender de inmediato medida, forma de contar y categoría.
 * Contexto: el ejemplo con un bulto explica cómo se conectan los tres pasos.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { roleLabel } from "../../farms/services/roleLabel.ts";
import type { Farm, FarmRole } from "../../farms/types/index.ts";
import { BackButton } from "../../../components/ui/BackButton.tsx";
import { getInventoryCatalog } from "../services/inventoryApi.ts";
import type { InventoryCatalog } from "../types/index.ts";
import { CatalogCategories } from "./CatalogCategories.tsx";
import { CatalogChain } from "./CatalogChain.tsx";
import { CatalogMeasures } from "./CatalogMeasures.tsx";
import { CatalogUnits } from "./CatalogUnits.tsx";

type Tab = "grupos" | "cuentas" | "medidas";

type Step = {
  id: Tab;
  title: string;
  hint: string;
  detail: string;
  one: string;
  many: string;
};

type Props = {
  start: Tab;
  farmId: number | null;
  farms: Farm[];
  role: FarmRole;
  canWrite: boolean;
  onFarm: (farmId: number) => void;
  onCreateFarm: () => void;
  onBack: () => void;
  onNotice: (message: string) => void;
};

const STEPS: Step[] = [
  {
    id: "medidas",
    title: "Medida",
    hint: "Kilo, litro, unidad",
    detail: "Es lo que hay dentro del producto. Con esto se suma y se resta el stock.",
    one: "medida",
    many: "medidas",
  },
  {
    id: "cuentas",
    title: "Cómo lo cuentas",
    hint: "Bulto, caja, kilo suelto",
    detail: "Es como sale del depósito. Un bulto puede traer varios kilos.",
    one: "forma de contar",
    many: "formas de contar",
  },
  {
    id: "grupos",
    title: "Categoría",
    hint: "Semilla, abono, herramienta",
    detail: "Agrupa productos parecidos para encontrarlos rápido en la lista.",
    one: "categoría",
    many: "categorías",
  },
];

/**
 * Cantidad de elementos que tiene cada paso.
 * @param catalog - Catálogo del sistema o nulo mientras carga.
 * @param tab - Paso consultado.
 * @returns Total de elementos.
 */
function countOf(catalog: InventoryCatalog | null, tab: Tab): number {
  if (!catalog) return 0;
  if (tab === "medidas") return (catalog.base_units ?? []).length;
  if (tab === "cuentas") return catalog.units.length;
  return catalog.categories.length;
}

/**
 * Texto corto con el total y su plural.
 * @param total - Número de elementos.
 * @param one - Singular.
 * @param many - Plural.
 * @returns Etiqueta lista para mostrar.
 */
function countLabel(total: number, one: string, many: string): string {
  if (total === 0) return `Sin ${many}`;
  return `${total} ${total === 1 ? one : many}`;
}

/**
 * Tres pasos en la misma pantalla.
 * @param props - Finca y pestaña inicial.
 * @returns Catálogo.
 */
export function CatalogHub({
  start,
  farmId,
  farms,
  role,
  canWrite,
  onFarm,
  onCreateFarm,
  onBack,
  onNotice,
}: Readonly<Props>) {
  const [tab, setTab] = useState<Tab>(start);
  const [revision, setRevision] = useState(0);
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);

  useEffect(() => {
    setTab(start);
  }, [start]);

  useEffect(() => {
    let alive = true;
    void getInventoryCatalog()
      .then((data) => {
        if (alive) setCatalog(data);
      })
      .catch(() => {
        if (alive) setCatalog(null);
      });
    return () => {
      alive = false;
    };
  }, [revision]);

  const shared = { farmId, farms, role, canWrite, onFarm, onCreateFarm, onBack, onNotice, plain: true as const };
  const active = STEPS.find((item) => item.id === tab) ?? STEPS[0];
  const stepNumber = STEPS.findIndex((item) => item.id === tab) + 1;

  return (
    <section className="panel catalog" aria-labelledby="catalogo-title">
      <BackButton onClick={onBack} />
      <header className="panel__header">
        <h1 id="catalogo-title" className="panel__title">Catálogo</h1>
        <p className="panel__lead">
          Aquí decides cómo se mide, cómo se cuenta y en qué grupo va cada producto.
        </p>
      </header>

      <label className="inv-farm">
        <span>Tu finca {farms.length ? `· ${roleLabel(role)}` : ""}</span>
        <select
          value={farmId ?? ""}
          onChange={(event) => {
            if (event.target.value === "crear") {
              onCreateFarm();
              return;
            }
            onFarm(Number(event.target.value));
          }}
        >
          <option value="crear">+ Crear finca</option>
          {farms.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </label>

      <div className="cat-hero">
        <div className="cat-hero__text">
          <h2 className="cat-hero__title">Tres pasos y queda listo</h2>
          <p className="cat-hero__lead">
            Todo producto usa estos tres datos. Si ya existe, lo eliges; si no, lo creas aquí.
          </p>
        </div>
        <div className="cat-example">
          <span className="cat-example__tag">Ejemplo</span>
          <p className="cat-example__line">
            <strong>1 bulto</strong> de concentrado trae <strong>50 kg</strong> y va en{" "}
            <strong>Alimento concentrado</strong>.
          </p>
        </div>
      </div>

      <div className="cat-flow" role="tablist" aria-label="Pasos del catálogo">
        {STEPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "cat-flow__step is-on" : "cat-flow__step"}
            onClick={() => setTab(item.id)}
          >
            <span className="cat-flow__num" aria-hidden="true">{index + 1}</span>
            <span className="cat-flow__body">
              <strong>{item.title}</strong>
              <small>{item.hint}</small>
            </span>
            <span className="cat-flow__count">{countLabel(countOf(catalog, item.id), item.one, item.many)}</span>
          </button>
        ))}
      </div>

      {canWrite && farmId != null ? (
        <section className="cat-add" aria-labelledby="catalogo-add-title">
          <header className="cat-add__head">
            <h2 id="catalogo-add-title">Agregar algo nuevo</h2>
            <p>Puedes crear la medida, la forma de contar y la categoría en una sola vez.</p>
          </header>
          <CatalogChain farmId={farmId} onNotice={onNotice} onSaved={() => setRevision((current) => current + 1)} />
        </section>
      ) : null}

      <section className="cat-section" aria-labelledby="catalogo-paso-title">
        <header className="cat-section__head">
          <div>
            <p className="cat-section__kicker">Paso {stepNumber} de {STEPS.length}</p>
            <h2 id="catalogo-paso-title">{active.title}</h2>
            <p className="cat-section__detail">{active.detail}</p>
          </div>
          <span className="cat-section__count">{countLabel(countOf(catalog, active.id), active.one, active.many)}</span>
        </header>
        {canWrite && farmId != null ? null : (
          <p className="cat-readonly">
            {farmId == null
              ? "Elige o crea una finca para cambiar el catálogo."
              : "Solo el administrador puede cambiar el catálogo."}
          </p>
        )}
        <div className="catalog-well">
          {tab === "medidas" ? <CatalogMeasures key={revision} {...shared} canAdd={false} /> : null}
          {tab === "cuentas" ? (
            <CatalogUnits key={revision} {...shared} canAdd={false} onMeasures={() => setTab("medidas")} onGroups={() => setTab("grupos")} />
          ) : null}
          {tab === "grupos" ? <CatalogCategories key={revision} {...shared} canAdd={false} onNeedCount={() => setTab("cuentas")} /> : null}
        </div>
      </section>
    </section>
  );
}
