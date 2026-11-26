/**
 * Hub de Inicio.
 *
 * Propósito: atajos a módulos y un resumen corto de lo pendiente.
 * Contexto: sección Inicio del shell; no sustituye Inventario ni Galpón.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSection } from "../../../components/layout/index.ts";
import galponIcon from "../../../assets/icons/galpon.png";
import inventarioIcon from "../../../assets/icons/inventario.png";
import { listAlerts } from "../../alertas/index.ts";
import type { Alert } from "../../alertas/types/index.ts";
import type { Account } from "../../auth/types/index.ts";
import { homeGreeting, homeTitle } from "../services/homeWelcome.ts";
import { moreLabel, splitHomeAlerts } from "../services/homeOverview.ts";
import "../../../styles/home.css";

type Props = {
  account: Account;
  onNavigate: (section: AppSection, view?: string) => void;
  onOpenGalpon?: (farmId: number, houseId?: number) => void;
};

type Shortcut = {
  id: AppSection;
  title: string;
  hint: string;
  icon: "inventario" | "galpon" | "iot";
};

const SHORTCUTS: Shortcut[] = [
  {
    id: "inventario",
    title: "Inventario",
    hint: "Stock, entradas y pedidos",
    icon: "inventario",
  },
  {
    id: "iot",
    title: "Sensores",
    hint: "Sensores y lecturas de campo",
    icon: "iot",
  },
  {
    id: "galpon",
    title: "Galpón",
    hint: "Lotes y bitácora diaria",
    icon: "galpon",
  },
];

function ShortcutIcon({ name }: { name: Shortcut["icon"] }) {
  if (name === "iot") {
    return (
      <span className="home-shortcut__icon home-shortcut__icon--iot" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 4v2.2M12 17.8V20M4 12h2.2M17.8 12H20" strokeLinecap="round" />
          <path
            d="M6.6 6.6l1.5 1.5M15.9 15.9l1.5 1.5M17.4 6.6l-1.5 1.5M8.1 15.9l-1.5 1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  const src = name === "inventario" ? inventarioIcon : galponIcon;
  return (
    <span className="home-shortcut__icon" aria-hidden="true">
      <img src={src} alt="" />
    </span>
  );
}

/**
 * Bienvenida, atajos y avisos esenciales.
 * @param props - Cuenta y navegación del shell.
 */
export function HomeHub({ account, onNavigate, onOpenGalpon }: Readonly<Props>) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const modules = account.modulos ?? ["home"];
  const shortcuts = useMemo(
    () => SHORTCUTS.filter((item) => modules.includes(item.id)),
    [modules],
  );
  const overview = useMemo(() => splitHomeAlerts(alerts), [alerts]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAlerts();
      setAlerts(data.results);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el resumen.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openBitacora = (alert: Alert) => {
    if (onOpenGalpon && alert.farm_id) {
      onOpenGalpon(alert.farm_id, alert.house_id);
      return;
    }
    onNavigate("galpon");
  };

  return (
    <section className="panel panel--home home-hub" aria-labelledby="home-title">
      <header className="home-hub__head">
        <p className="panel__kicker">{homeGreeting()}</p>
        <h1 id="home-title" className="panel__title">
          {homeTitle(account)}
        </h1>
        <p className="home-hub__lead">
          Accesos rápidos y lo pendiente de hoy. Entrá al módulo solo cuando haga falta.
        </p>
      </header>

      {shortcuts.length > 0 ? (
        <div className="home-shortcuts" role="navigation" aria-label="Accesos directos">
          {shortcuts.map((item) => (
            <button
              key={item.id}
              type="button"
              className="home-shortcut"
              onClick={() => onNavigate(item.id)}
            >
              <ShortcutIcon name={item.icon} />
              <strong>{item.title}</strong>
              <span>{item.hint}</span>
            </button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <p className="home-status" role="status">
          Cargando resumen…
        </p>
      ) : null}

      {error ? (
        <div className="home-status" role="alert">
          <p>{error}</p>
          <button type="button" className="home-card__action home-card__action--ghost" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="home-pulse">
          {modules.includes("inventario") ? (
            <article
              className={`home-card ${overview.stockTotal > 0 ? "home-card--warn" : "home-card--ok"}`}
            >
              <div className="home-card__head">
                <h2>Stock bajo</h2>
                <span className="home-card__count">
                  {overview.stockTotal === 0
                    ? "Al día"
                    : `${overview.stockTotal} aviso${overview.stockTotal === 1 ? "" : "s"}`}
                </span>
              </div>
              {overview.stockTotal === 0 ? (
                <p className="home-card__empty">Ningún producto está en o bajo su mínimo.</p>
              ) : (
                <>
                  <ul className="home-card__list">
                    {overview.stock.map((item) => (
                      <li key={item.id}>
                        <strong>{item.product ?? item.title}</strong>
                        <span>
                          {item.farm}
                          {item.quantity != null && item.unit
                            ? ` · ${item.quantity} ${item.unit}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {moreLabel(overview.stock.length, overview.stockTotal) ? (
                    <p className="home-card__more">
                      {moreLabel(overview.stock.length, overview.stockTotal)}
                    </p>
                  ) : null}
                </>
              )}
              <button
                type="button"
                className="home-card__action"
                onClick={() => onNavigate("inventario", "bajo")}
              >
                Ver inventario
              </button>
            </article>
          ) : null}

          {modules.includes("galpon") ? (
            <article
              className={`home-card ${overview.bitacoraTotal > 0 ? "home-card--warn" : "home-card--ok"}`}
            >
              <div className="home-card__head">
                <h2>Bitácora diaria</h2>
                <span className="home-card__count">
                  {overview.bitacoraTotal === 0
                    ? "Al día"
                    : `${overview.bitacoraTotal} lote${overview.bitacoraTotal === 1 ? "" : "s"}`}
                </span>
              </div>
              {overview.bitacoraTotal === 0 ? (
                <p className="home-card__empty">Los lotes abiertos ya tienen ronda de hoy.</p>
              ) : (
                <>
                  <ul className="home-card__list">
                    {overview.bitacora.map((item) => (
                      <li key={item.id}>
                        <strong>{item.lot ?? item.title}</strong>
                        <span>
                          {item.farm}
                          {item.house ? ` · ${item.house}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {moreLabel(overview.bitacora.length, overview.bitacoraTotal) ? (
                    <p className="home-card__more">
                      {moreLabel(overview.bitacora.length, overview.bitacoraTotal)}
                    </p>
                  ) : null}
                </>
              )}
              <button
                type="button"
                className="home-card__action"
                onClick={() => {
                  const first = overview.bitacora[0];
                  if (first) openBitacora(first);
                  else onNavigate("galpon");
                }}
              >
                Ir a galpón
              </button>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
