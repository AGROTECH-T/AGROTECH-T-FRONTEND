/**
 * Panel de notificaciones.
 *
 * Propósito: abrir los avisos del sistema desde la barra superior.
 * Contexto: interfaz lista; los datos llegan con el módulo de alertas.
 * @author Cristian Deysdayr Jimenez
 */

type Props = {
  open: boolean;
  onToggle: () => void;
};

/**
 * Campana con el panel de avisos.
 * @param props - Estado abierto y conmutador.
 * @returns Botón de campana y su panel.
 */
export function NotificationsMenu({ open, onToggle }: Readonly<Props>) {
  return (
    <div className="notifications">
      <button
        type="button"
        className="notifications__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Notificaciones"
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
      </button>
      {open ? (
        <div className="notifications__panel" role="menu">
          <header className="notifications__head">
            <p className="notifications__title">Notificaciones</p>
            <span className="notifications__badge">0</span>
          </header>
          <div className="notifications__empty">
            <p className="notifications__empty-title">Sin notificaciones</p>
            <p className="notifications__empty-hint">
              Aquí verás los avisos cuando se conecte el módulo de alertas.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
