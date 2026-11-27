/**
 * Pantalla de inventario.
 *
 * Propósito: elegir finca y operar su despensa.
 * Contexto: el rol sale de la membresía de farms.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useState } from "react";
import { farmsNow, listFarms } from "../../farms/services/farmsApi.ts";
import { roleLabel } from "../../farms/services/roleLabel.ts";
import type { Farm, FarmRole } from "../../farms/types/index.ts";
import { downloadInventory } from "../services/inventoryApi.ts";
import {
  listInventories,
  placeProduct,
  type FarmInventory,
} from "../services/farmInventories.ts";
import { canWriteInventory } from "../services/inventoryAccess.ts";
import type { Product } from "../types/index.ts";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { AdjustmentReport } from "./AdjustmentReport.tsx";
import { CatalogHub } from "./CatalogHub.tsx";
import { ConsumptionReport } from "./ConsumptionReport.tsx";
import { FarmHistory } from "./FarmHistory.tsx";
import { InventarioBrowser } from "./InventarioBrowser.tsx";
import { InventoryManager } from "./InventoryManager.tsx";
import { InventoryTemplateWindow } from "./InventoryTemplateWindow.tsx";
import { LoansReport } from "./LoansReport.tsx";
import { OrderReport } from "./OrderReport.tsx";
import { ProductCreateForm } from "./ProductCreateForm.tsx";
import { ProductAdjustWindow } from "./ProductAdjust.tsx";
import { ProductUpdateWindow } from "./ProductDetail.tsx";
import { ProductViewWindow } from "./ProductView.tsx";
import { ReportsHub } from "./ReportsHub.tsx";

export type StockView =
  | "lista"
  | "crear"
  | "entrada"
  | "salida"
  | "historial"
  | "inventarios"
  | "catalogo"
  | "categorias"
  | "unidades"
  | "medidas"
  | "reportes"
  | "ajustes"
  | "consumo"
  | "prestamos"
  | "pedido"
  | "bajo";

function pickFarm(items: Farm[], initialFarmId?: number): number | null {
  if (initialFarmId != null && items.some((item) => item.id === initialFarmId)) {
    return initialFarmId;
  }
  return items[0]?.id ?? null;
}

type Props = {
  view: StockView;
  tick: number;
  onView: (view: StockView) => void;
  onCreateFarm: () => void;
  /** Finca preferida al abrir desde el detalle de finca. */
  initialFarmId?: number;
  /** Inventario preferido al abrir desde el detalle de finca. */
  initialInventoryId?: string;
};

/**
 * Orquesta finca activa, listado, detalle e historial.
 * @returns Panel de Inventario.
 */
export function InventarioPanel({
  view,
  tick,
  onView,
  onCreateFarm,
  initialFarmId,
  initialInventoryId,
}: Readonly<Props>) {
  const known = farmsNow();
  const [farms, setFarms] = useState<Farm[]>(() => known ?? []);
  const [farmId, setFarmId] = useState<number | null>(() =>
    known ? pickFarm(known, initialFarmId) : null,
  );
  const [farmsReady, setFarmsReady] = useState(known != null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [detailMode, setDetailMode] = useState<{
    intent: "ver" | "actualizar" | "ajuste";
  }>({ intent: "ver" });
  const [error, setError] = useState("");
  const [inventories, setInventories] = useState<FarmInventory[]>([]);
  const [inventoryId, setInventoryId] = useState("");
  const [seed, setSeed] = useState({ name: "", barcode: "" });
  const [fresh, setFresh] = useState<Product | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [refreshMark, setRefreshMark] = useState(0);
  const farm = farms.find((item) => item.id === farmId) ?? null;
  const role: FarmRole = farm?.role ?? "consulta";
  const canWrite = canWriteInventory(farm);
  const blocked = view === "crear" || view === "entrada" || view === "salida";
  const shown: StockView = !canWrite && blocked ? "lista" : view;
  const desk = shown === "entrada" || shown === "salida" ? shown : null;
  const notices = useNotices();
  const [catalogMark, setCatalogMark] = useState(0);
  const tell = (message: string) => {
    notices.push([message], "ok");
    if (/categor[ií]a|unidad/i.test(message)) setCatalogMark((current) => current + 1);
  };

  useEffect(() => {
    let alive = true;
    if (farmsNow() == null) setFarmsReady(false);
    void listFarms()
      .then((items) => {
        if (!alive) return;
        setFarms(items);
        setFarmId(pickFarm(items, initialFarmId));
      })
      .catch((cause) => {
        if (!alive) return;
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las fincas");
      })
      .finally(() => {
        if (alive) setFarmsReady(true);
      });
    return () => {
      alive = false;
    };
  }, [tick, initialFarmId]);

  useEffect(() => {
    if (farmId == null) return;
    const items = listInventories(farmId);
    setInventories(items);
    setInventoryId((current) => {
      if (initialInventoryId && items.some((item) => item.id === initialInventoryId)) {
        return initialInventoryId;
      }
      if (items.some((item) => item.id === current)) return current;
      return items[0]?.id ?? "";
    });
  }, [farmId, initialInventoryId]);

  const clearFresh = useCallback(() => setFresh(null), []);

  const replaceProduct = (product: Product) => {
    setSelected((current) => (current?.id === product.id ? product : current));
    // La lista vive en InventarioBrowser: hay que forzar recarga, si no queda
    // el dato viejo hasta un F5.
    setRefreshMark((current) => current + 1);
  };

  const downloadStock = async () => {
    if (farmId == null) return;
    setDownloading(true);
    try {
      await downloadInventory(farmId, []);
      tell("inventario descargado");
    } catch (cause) {
      notices.push(
        [cause instanceof Error ? cause.message : "No se pudo descargar el inventario"],
        "warn",
      );
    } finally {
      setDownloading(false);
    }
  };

  const refreshInventories = (prefer?: string) => {
    if (farmId == null) return;
    const items = listInventories(farmId);
    setInventories(items);
    setInventoryId((current) => {
      if (prefer && items.some((item) => item.id === prefer)) return prefer;
      if (items.some((item) => item.id === current)) return current;
      return items[0]?.id ?? "";
    });
  };

  useEffect(() => {
    setSelected(null);
  }, [view, tick]);

  if (shown === "catalogo" || shown === "categorias" || shown === "unidades" || shown === "medidas") {
    const start = shown === "unidades" ? "cuentas" : shown === "categorias" ? "grupos" : "medidas";
    return (
      <>
        <NoticeStack items={notices.items} onClose={notices.close} />
        <CatalogHub
          start={start}
          farmId={farmId}
          farms={farms}
          role={role}
          canWrite={canWrite}
          onFarm={(id) => {
            setFarmId(id);
            setSelected(null);
          }}
          onCreateFarm={onCreateFarm}
          onBack={() => onView("lista")}
          onNotice={tell}
        />
      </>
    );
  }

  if (shown === "inventarios" && farmId != null) {
    return (
      <>
        <NoticeStack items={notices.items} onClose={notices.close} />
        <InventoryManager
          farmId={farmId}
          farms={farms}
          role={role}
          canWrite={canWrite}
          onFarm={(id) => {
            setFarmId(id);
            setSelected(null);
          }}
          onCreateFarm={onCreateFarm}
          onOpen={(id) => {
            setInventoryId(id);
            onView("lista");
          }}
          onCreated={(id) => {
            refreshInventories(id);
            tell("inventario creado");
          }}
          onChanged={(message) => {
            refreshInventories();
            tell(message);
          }}
          onBack={() => onView("lista")}
        />
      </>
    );
  }

  if (shown === "historial" && farmId != null) {
    return (
      <section className="panel">
        <FarmHistory farmId={farmId} onBack={() => onView("lista")} />
      </section>
    );
  }

  if (shown === "reportes" && farmId != null) {
    return <ReportsHub onOpen={onView} onBack={() => onView("lista")} />;
  }

  if (
    farmId != null &&
    (shown === "ajustes" ||
      shown === "consumo" ||
      shown === "prestamos" ||
      shown === "pedido" ||
      shown === "bajo")
  ) {
    const backToReports = () => onView("reportes");
    return (
      <section className="panel">
        {shown === "ajustes" ? (
          <AdjustmentReport farmId={farmId} onBack={backToReports} />
        ) : null}
        {shown === "consumo" ? (
          <ConsumptionReport
            farmId={farmId}
            farmName={farm?.name ?? "Esta finca"}
            onBack={() => onView("lista")}
            onLowStock={() => onView("bajo")}
          />
        ) : null}
        {shown === "prestamos" ? (
          <LoansReport farmId={farmId} onBack={backToReports} />
        ) : null}
        {shown === "pedido" ? <OrderReport farmId={farmId} onBack={backToReports} /> : null}
        {shown === "bajo" ? (
          <OrderReport farmId={farmId} onBack={() => onView("lista")} startLow />
        ) : null}
      </section>
    );
  }

  const closeDetail = () => {
    setSelected(null);
    setDetailMode({ intent: "ver" });
  };

  return (
    <>
    <NoticeStack items={notices.items} onClose={notices.close} />
    {farmsReady ? <div className="inv-quick">
      {canWrite ? (
        <button type="button" className="inv-pill is-in" onClick={() => onView("entrada")}>
          <Mark kind="in" /> Registrar entrada
        </button>
      ) : null}
      {canWrite ? (
        <button type="button" className="inv-pill is-out" onClick={() => onView("salida")}>
          <Mark kind="out" /> Registrar salida
        </button>
      ) : null}
      <button type="button" className="inv-pill is-log" onClick={() => onView("historial")}>
        <Mark kind="log" /> Historial
      </button>
      <button type="button" className="inv-pill is-chart" onClick={() => onView("consumo")}>
        <Mark kind="chart" /> Estadísticas
      </button>
      <button type="button" className="inv-pill is-more" onClick={() => onView("reportes")}>
        <Mark kind="more" /> Más reportes
      </button>
      {canWrite ? (
        <button
          type="button"
          className="inv-pill is-template"
          onClick={() => setTemplateOpen(true)}
          disabled={farmId == null}
        >
          <Mark kind="sheet" /> Cargar inventario
        </button>
      ) : null}
      <button
        type="button"
        className="inv-pill is-download"
        onClick={() => void downloadStock()}
        disabled={downloading || farmId == null}
      >
        <Mark kind="down" /> {downloading ? "Preparando..." : "Descargar inventario"}
      </button>
    </div> : null}
    <section className="panel" aria-labelledby="inventario-title">
      <header className="panel__header">
        <h1 id="inventario-title" className="panel__title">
          Inventario
        </h1>
        <p className="panel__lead">
          Despensa de la finca. La cantidad cambia solo con entradas, salidas y ajustes.
        </p>
      </header>

      {!farmsReady ? (
        <p className="inventario-empty__hint" role="status">
          Cargando inventario...
        </p>
      ) : null}

      {error ? (
        <p className="field-miss" role="alert">
          {error}
        </p>
      ) : null}

      {farmsReady && farms.length > 0 ? (
        <div className="inv-switch">
        {canWrite ? (
          <div className="inv-switch__action">
            <button type="button" className="btn-primary inv-create" onClick={() => { setSeed({ name: "", barcode: "" }); onView("crear"); }}>
              Crear producto
            </button>
          </div>
        ) : <span className="inv-switch__action" />}
        <div className="inv-switch__half">
        <label className="inv-farm">
          <span>Finca {farm ? `· ${roleLabel(farm.role)}` : ""}</span>
          <select
            value={farmId ?? ""}
            onChange={(event) => {
              if (event.target.value === "crear") {
                onCreateFarm();
                return;
              }
              setFarmId(Number(event.target.value));
              setSelected(null);
              onView("lista");
            }}
          >
            <option value="crear">+ Crear finca</option>
            {farms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        </div>
        {inventories.length > 0 ? (
          <div className="inv-switch__half">
          <label className="inv-farm">
            <span>Inventario</span>
            <select
              value={inventoryId}
              onChange={(event) => {
                if (event.target.value === "crear") {
                  onView("inventarios");
                  return;
                }
                setInventoryId(event.target.value);
                onView("lista");
              }}
            >
              {canWrite ? <option value="crear">+ Crear inventario</option> : null}
              {inventories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          </div>
        ) : <div className="inv-switch__half" />}
        </div>
      ) : null}

      {farmsReady && farms.length === 0 && !error ? (
        <div className="inventario-empty" role="status">
          <p className="inventario-empty__title">Primero crea una finca</p>
          <p className="inventario-empty__hint">El inventario vive dentro de una finca.</p>
        </div>
      ) : null}

      {farmsReady && farmId != null ? (
        <InventarioBrowser
          farmId={farmId}
          inventoryId={inventoryId}
          role={role}
          canWrite={canWrite}
          onSelect={(product) => {
            setDetailMode({ intent: "ver" });
            setSelected(product);
          }}
          onEdit={(product) => {
            setDetailMode({ intent: "actualizar" });
            setSelected(product);
          }}
          onMove={(product) => {
            setDetailMode({ intent: "ajuste" });
            setSelected(product);
          }}
          desk={desk}
          onDesk={(next) => onView(next ?? "lista")}
          fresh={fresh}
          onFreshUsed={clearFresh}
          onMoved={replaceProduct}
          onNotice={tell}
          catalogMark={catalogMark}
          refreshMark={refreshMark}
        />
      ) : null}
    </section>
    {shown === "crear" && farmId != null && inventoryId ? (
      <ProductCreateForm
        farmId={farmId}
        initialName={seed.name}
        initialBarcode={seed.barcode}
        onCancel={() => onView("lista")}
        onCreated={(product) => {
          placeProduct(product.id, inventoryId);
          setFresh(product);
          onView("lista");
          tell("producto creado");
        }}
        onNotice={tell}
      />
    ) : null}
    {selected && farmId != null && detailMode.intent === "ver" ? (
      <ProductViewWindow
        farmId={farmId}
        product={selected}
        canWrite={canWrite}
        onBack={closeDetail}
        onChanged={(product) => {
          setSelected(product);
          replaceProduct(product);
        }}
        onNotice={tell}
      />
    ) : null}
    {selected && farmId != null && detailMode.intent === "ajuste" ? (
      <ProductAdjustWindow
        farmId={farmId}
        product={selected}
        onBack={closeDetail}
        onChanged={(product) => {
          setSelected(product);
          replaceProduct(product);
        }}
        onNotice={tell}
      />
    ) : null}
    {selected && farmId != null && detailMode.intent === "actualizar" ? (
      <ProductUpdateWindow
        farmId={farmId}
        product={selected}
        onBack={closeDetail}
        onChanged={(product) => {
          setSelected(product);
          replaceProduct(product);
        }}
        onRemoved={() => {
          setFresh(selected);
          closeDetail();
        }}
        onNotice={tell}
      />
    ) : null}
    {templateOpen && farmId != null ? (
      <InventoryTemplateWindow
        farmId={farmId}
        canWrite={canWrite}
        onClose={() => setTemplateOpen(false)}
        onImported={(report) => {
          for (const id of report.created_ids) placeProduct(id, inventoryId);
          setRefreshMark((current) => current + 1);
        }}
        onNotice={tell}
      />
    ) : null}
    </>
  );
}

function Mark({ kind }: { kind: "in" | "out" | "log" | "down" | "chart" | "more" | "sheet" }) {
  if (kind === "sheet") {
    return (
      <svg className="inv-ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16v14H4z" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M4 10h16M10 10v9" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === "chart") {
    return (
      <svg className="inv-ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 19h16M7 15V9M12 15V5M17 15v-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "more") {
    return (
      <svg className="inv-ico" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="5" cy="12" r="1.8" fill="currentColor" />
        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
        <circle cx="19" cy="12" r="1.8" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "log") {
    return (
      <svg className="inv-ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3h8l4 4v14H7z" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M15 3v5h5M9 13h6M9 17h6" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === "down") {
    return (
      <svg className="inv-ico" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3v10M8 9l4 4 4-4M4 17v3h16v-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  const down = kind === "in";
  return (
    <svg className="inv-ico" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={down ? "M12 4v12M7 12l5 5 5-5" : "M12 20V8M7 12l5-5 5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
