/**
 * Tarjetas de indicadores del tablero de inventario.
 *
 * Propósito: mostrar una cifra grande con su icono, su color y la variación
 * frente al periodo de comparación.
 * Contexto: el color identifica la categoría; la flecha y el porcentaje
 * explican el cambio, nunca lo sustituyen.
 * @author Cristian Deysdayr Jimenez
 */

export type KpiTone = "blue" | "violet" | "green" | "amber" | "red" | "slate";

export type KpiIconName = "box" | "check" | "alert" | "empty" | "in" | "out" | "loan" | "return";

export type KpiDelta = {
  text: string;
  tone: "up" | "down" | "flat";
};

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: KpiIconName;
  tone?: KpiTone;
  delta?: KpiDelta;
};

/**
 * Tarjeta de un indicador.
 * @param props - Rótulo, valor, pista, icono, color y variación opcional.
 * @returns Tarjeta con cabecera de color y pie de comparación.
 */
export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "slate",
  delta,
}: Readonly<KpiCardProps>) {
  return (
    <article className={`kpi kpi--${tone}`}>
      <span className="kpi__icon" aria-hidden="true">
        <KpiIcon name={icon} />
      </span>
      <span className="kpi__label">{label}</span>
      <strong className="kpi__value">{value}</strong>
      <div className="kpi__foot">
        <small>{hint ?? ""}</small>
        {delta ? (
          <em className={`kpi__delta is-${delta.tone}`}>
            {delta.tone === "up" ? "▲" : delta.tone === "down" ? "▼" : "•"} {delta.text}
          </em>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Icono de línea de una tarjeta.
 * @param props - Nombre del icono.
 * @returns Dibujo de 18 px con el color del texto.
 */
function KpiIcon({ name }: Readonly<{ name: KpiIconName }>) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" {...common} />
        <path d="M8.4 12.2l2.4 2.4 4.8-4.9" {...common} />
      </svg>
    );
  }
  if (name === "alert") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4l8 15H4z" {...common} />
        <path d="M12 10v4M12 16.6v.1" {...common} />
      </svg>
    );
  }
  if (name === "empty") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" {...common} />
        <path d="M6.4 17.6L17.6 6.4" {...common} />
      </svg>
    );
  }
  if (name === "in") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v11M8 11l4 4 4-4M5 19h14" {...common} />
      </svg>
    );
  }
  if (name === "out") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20V9M8 13l4-4 4 4M5 5h14" {...common} />
      </svg>
    );
  }
  if (name === "loan") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9l8-4 8 4v4l-8 4-8-4z" {...common} />
        <path d="M4 13v3.5l8 4 8-4V13M16 6l3-3M19 3h-3M19 3v3" {...common} />
      </svg>
    );
  }
  if (name === "return") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9l8-4 8 4v4l-8 4-8-4z" {...common} />
        <path d="M4 13v3.5l8 4 8-4V13M19 6l-3-3M16 3h3M16 3v3" {...common} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8l8-4 8 4v8l-8 4-8-4z" {...common} />
      <path d="M4 8l8 4 8-4M12 12v8" {...common} />
    </svg>
  );
}
