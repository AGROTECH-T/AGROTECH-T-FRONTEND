/**
 * Panel de notificaciones.
 *
 * Propósito: mostrar los avisos de stock desde la barra superior.
 * Contexto: los avisos se calculan al vuelo; no hay notificaciones guardadas.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useState } from "react";
import { listAlerts, type Alert } from "../../features/alertas/index.ts";
import type { AppSection } from "./navTypes.ts";

type Props = {
  open: boolean;
  onToggle: () => void;
  onNavigate?: (section: AppSection, view?: string) => void;
};

/**
 * Campana con el panel de avisos.
 * @param props - Estado abierto, conmutador y navegación.
 * @returns Botón de campana y su panel.
 */
export function NotificationsMenu({ open, onToggle, onNavigate }: Readonly<Props>) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAlerts();
      setAlerts(data.results);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los avisos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const openLowStock = () => {
    onNavigate?.("inventario", "bajo");
    onToggle();
  };

  return (
    <div className="notifications">
      <button
        type="button"
        className="notifications__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={alerts.length > 0 ? `Notificaciones: ${alerts.length}` : "Notificaciones"}
        onClick={onToggle}
      >
        <svg
          className="notifications__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16z" />
          <path d="M10.5 21a2 2 0 0 0 3 0" />
        </svg>
        {alerts.length > 0 ? (
          <span className="notifications__dot" aria-hidden="true">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="notifications__panel" role="menu">
          <header className="notifications__head">
            <p className="notifications__title">Notificaciones</p>
            <span className="notifications__badge">{alerts.length}</span>
          </header>

          {loading ? <p className="notifications__hint">Cargando avisos...</p> : null}
          {error ? (
            <p className="notifications__error" role="alert">
              {error}
            </p>
          ) : null}

          {!loading && !error && alerts.length === 0 ? (
            <div className="notifications__empty">
              <p className="notifications__empty-title">Todo en orden</p>
              <p className="notifications__empty-hint">
                Ningún producto está en o bajo su mínimo.
              </p>
            </div>
          ) : null}

          {!loading && alerts.length > 0 ? (
            <>
              <ul className="notifications__list">
                {alerts.map((alert) => (
                  <li key={alert.id}>
                    <button
                      type="button"
                      role="menuitem"
                      className={`notifications__item is-${alert.kind}`}
                      onClick={openLowStock}
                    >
                      <span className="notifications__item-title">{alert.title}</span>
                      <span className="notifications__item-detail">{alert.detail}</span>
                      <span className="notifications__item-farm">{alert.farm}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="notifications__all" onClick={openLowStock}>
                Ver qué pedir
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
