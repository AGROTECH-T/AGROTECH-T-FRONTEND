/**
 * Hub de reportes del inventario.
 *
 * Propósito: entrar a ajustes, préstamos y pedido sugerido.
 * Contexto: las estadísticas de consumo tienen su botón directo.
 * @author Cristian Deysdayr Jimenez
 */

export type ReportView = "ajustes" | "prestamos" | "pedido";

type Props = {
  onOpen: (view: ReportView) => void;
  onBack: () => void;
};

const REPORTS: { id: ReportView; title: string; lead: string; action: string }[] = [
  {
    id: "ajustes",
    title: "Ajustes",
    lead: "Reconteos con su motivo: qué se corrigió, cuándo y cuánto cambió el stock.",
    action: "Ver ajustes",
  },
  {
    id: "prestamos",
    title: "Préstamos",
    lead: "Qué se prestó, a quién y qué sigue pendiente de devolver.",
    action: "Ver préstamos",
  },
  {
    id: "pedido",
    title: "Qué pedir",
    lead: "Stock inicial contra actual y cuánto conviene pedir para volver al mínimo.",
    action: "Ver pedido",
  },
];

/**
 * Tarjetas con los reportes disponibles.
 * @param props - Apertura de un reporte y regreso al inventario.
 * @returns Hub de reportes.
 */
export function ReportsHub({ onOpen, onBack }: Readonly<Props>) {
  return (
    <section className="panel" aria-labelledby="reportes-title">
      <button type="button" className="btn-secondary screen-back" onClick={onBack}>
        ← Volver al inventario
      </button>
      <header className="panel__header">
        <h1 id="reportes-title" className="panel__title">
          Más reportes
        </h1>
        <p className="panel__lead">
          Elige el reporte, ajusta las fechas y descarga lo mismo que ves.
        </p>
      </header>
      <div className="rp-hub">
        {REPORTS.map((item) => (
          <article key={item.id} className="rp-hub__card">
            <span className="rp-hub__icon" aria-hidden="true">
              <HubIcon kind={item.id} />
            </span>
            <h2>{item.title}</h2>
            <p>{item.lead}</p>
            <button type="button" className="btn-primary" onClick={() => onOpen(item.id)}>
              {item.action}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function HubIcon({ kind }: { kind: ReportView }) {
  if (kind === "prestamos") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 7h13l-3-3M20 17H7l3 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "pedido") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M4 5h2l2 10h9l2-7H7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="10" cy="19" r="1.4" />
        <circle cx="17" cy="19" r="1.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 19h16M7 15V9M12 15V5M17 15v-4" strokeLinecap="round" />
    </svg>
  );
}
