/**
 * Piezas comunes del módulo de galpón.
 *
 * Propósito: que galpones, lotes, bitácora e indicadores compartan
 * etiquetas, tarjetas, campos, errores y la guía de uso sin repetir marcado.
 * Contexto: solo presentación; las cifras vienen del backend.
 * @author Cristian Deysdayr Jimenez
 */

import { type ReactNode } from "react";

type Tone = "ok" | "warn" | "alert" | "idle";

export const HOUSE_STATUS: Record<string, { label: string; tone: Tone }> = {
  disponible: { label: "Disponible", tone: "idle" },
  ocupado: { label: "Ocupado", tone: "ok" },
};

export const LOT_STATUS: Record<string, { label: string; tone: Tone }> = {
  abierto: { label: "Lote abierto", tone: "ok" },
  cerrado: { label: "Lote cerrado", tone: "idle" },
};

export const STAGES: { id: string; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "levante", label: "Levante" },
  { id: "engorde", label: "Engorde" },
];

export const FEED_MODES: { id: string; label: string }[] = [
  { id: "voluntad", label: "A voluntad" },
  { id: "medido", label: "Medido" },
];

export type EventKind = {
  id: string;
  label: string;
  hint: string;
};

export const EVENT_KINDS: EventKind[] = [
  { id: "ronda", label: "Ronda", hint: "Qué se vio y qué se hizo en la inspección." },
  { id: "mortalidad", label: "Mortalidad", hint: "Aves muertas. Resta del saldo vivo." },
  { id: "aislamiento", label: "Aislamiento", hint: "Aparta aves del espacio normal. Cuando se recuperen, anota otra vez aislamiento y elige devolverlas." },
  { id: "salida", label: "Salida", hint: "Aves que salen del lote. Resta del saldo vivo." },
  { id: "peso", label: "Peso", hint: "Peso promedio de una muestra o estimación." },
  { id: "alimento", label: "Alimento", hint: "Entrega por etapa, en bultos, canecas o kilos." },
  { id: "agua", label: "Agua", hint: "Lectura o estimación de consumo." },
  { id: "ambiente", label: "Ambiente", hint: "Temperatura, humedad u olor observado." },
  { id: "cama", label: "Cama", hint: "Zona atendida y condición de la cama." },
  { id: "sanidad", label: "Sanidad", hint: "Producto, motivo y seguimiento." },
  { id: "limpieza", label: "Limpieza", hint: "Bioseguridad y preparación del galpón." },
  { id: "ajuste", label: "Ajuste de saldo", hint: "Suma o resta aves con nota justificada." },
];

export const ATTENTION: Record<string, { label: string; tone: Tone }> = {
  informativo: { label: "Informativo", tone: "idle" },
  revisar: { label: "Por revisar", tone: "warn" },
  urgente: { label: "Urgente", tone: "alert" },
};

export function houseStatus(status: string): { label: string; tone: Tone } {
  return HOUSE_STATUS[status] ?? { label: status, tone: "idle" };
}

export function lotStatus(status: string): { label: string; tone: Tone } {
  return LOT_STATUS[status] ?? { label: status, tone: "idle" };
}

export function stageLabel(stage: string): string {
  return STAGES.find((item) => item.id === stage)?.label ?? stage;
}

export function kindLabel(kind: string): string {
  return EVENT_KINDS.find((item) => item.id === kind)?.label ?? kind;
}

/**
 * Nombre del registro en la bitácora, con la acción de aislamiento.
 * @param kind - Tipo del hecho.
 * @param payload - Datos extra del registro.
 * @returns Etiqueta para la tabla.
 */
export function eventTitle(kind: string, payload: Record<string, unknown> = {}): string {
  if (kind === "aislamiento" && payload.direccion === "devolver") {
    return "Vuelta al lote";
  }
  return kindLabel(kind);
}

export function kindHint(kind: string): string {
  return EVENT_KINDS.find((item) => item.id === kind)?.hint ?? "";
}

function localDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const DAY_FORMAT = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TIME_FORMAT = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

/**
 * Fecha y hora en la zona del navegador.
 * @param value - Texto ISO del backend, que llega en UTC.
 * @returns Día y hora legibles, o un guion si no hay dato.
 */
export function whenText(value: string | null): string {
  const date = localDate(value);
  if (!date) return "—";
  return `${DAY_FORMAT.format(date)} · ${TIME_FORMAT.format(date)}`;
}

/**
 * Hora en la zona del navegador, para listas ya agrupadas por día.
 * @param value - Texto ISO del backend.
 * @returns Hora corta, o un guion.
 */
export function timeText(value: string | null): string {
  const date = localDate(value);
  return date ? TIME_FORMAT.format(date) : "—";
}

/**
 * Día en la zona del navegador.
 * @param value - Texto ISO del backend, que llega en UTC.
 * @returns Día legible, o un guion.
 */
export function dayText(value: string | null): string {
  const date = localDate(value);
  return date ? DAY_FORMAT.format(date) : "—";
}

/**
 * Encabezado del día para agrupar la bitácora.
 * @param value - Texto ISO del backend.
 * @returns Hoy, Ayer o la fecha.
 */
export function dayLabel(value: string | null): string {
  const date = localDate(value);
  if (!date) return "Sin fecha";
  const today = new Date();
  if (sameDay(date, today)) return `Hoy · ${DAY_FORMAT.format(date)}`;
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (sameDay(date, yesterday)) return `Ayer · ${DAY_FORMAT.format(date)}`;
  return DAY_FORMAT.format(date);
}

/**
 * Cifra con separadores y sin ceros de relleno.
 *
 * El backend entrega decimales largos ("50.00000"); aquí se muestran
 * cortos y legibles sin redondear datos que importan (0,048 kg).
 * @param value - Cifra recibida o escrita por la persona.
 * @param digits - Decimales máximos (3 por defecto).
 * @returns Cifra legible, o un guion si no hay dato.
 */
export function numberText(
  value: string | number | null | undefined,
  digits = 3,
): string {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return number.toLocaleString("es-CO", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
}

/**
 * Deja el número como se escribió: 2, no 2.00.
 * @param value - Cifra del backend o del formulario.
 * @returns Texto compacto, o vacío si no hay dato.
 */
export function plainNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const text = String(value).trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(text)) return String(value).trim();
  const [wholeRaw, fraction = ""] = text.split(".");
  const sign = wholeRaw.startsWith("-") ? "-" : "";
  const whole = wholeRaw.replace("-", "").replace(/^0+(?=\d)/, "");
  const decimals = fraction.replace(/0+$/, "");
  if (!decimals) return `${sign}${whole || "0"}`;
  return `${sign}${whole || "0"}.${decimals}`;
}

/**
 * Edad del lote con singular y plural.
 * @param days - Días cumplidos.
 * @returns Texto como "1 día" o "12 días".
 */
export function ageText(days: number): string {
  return `${days} ${days === 1 ? "día" : "días"}`;
}

const UNIT_PLURALS: Record<string, [string, string]> = {
  aves: ["ave", "aves"],
  bulto: ["bulto", "bultos"],
  caneca: ["caneca", "canecas"],
};

/**
 * Unidad escrita como se lee, con singular cuando corresponde.
 * @param unit - Código de la unidad que guarda el backend.
 * @param value - Cantidad registrada.
 * @returns Unidad legible, por ejemplo "aves" o "bultos".
 */
export function unitText(unit: string, value: string | number | null): string {
  const pair = UNIT_PLURALS[unit];
  if (!pair) return unit;
  return Number(value) === 1 ? pair[0] : pair[1];
}

type PillProps = {
  label: string;
  tone?: Tone;
};

/**
 * Etiqueta de estado.
 * @param props - Texto y color.
 * @returns Insignia compacta.
 */
export function Pill({ label, tone = "idle" }: Readonly<PillProps>) {
  return <span className={`gp-pill is-${tone}`}>{label}</span>;
}

type StatProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
};

/**
 * Cifra de resumen del galpón.
 * @param props - Rótulo, valor y pista.
 * @returns Tarjeta de indicador.
 */
export function GalponStat({ label, value, hint, tone = "idle" }: Readonly<StatProps>) {
  return (
    <article className={`gp-stat is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

type CardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  wide?: boolean;
};

/**
 * Tarjeta de sección del galpón.
 * @param props - Título, subtítulo, acción y contenido.
 * @returns Panel con cabecera.
 */
export function GalponCard({ title, subtitle, action, children, wide = false }: Readonly<CardProps>) {
  return (
    <section className={wide ? "gp-card is-wide" : "gp-card"}>
      <header className="gp-card__head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  span?: boolean;
  required?: boolean;
};

/**
 * Campo de formulario con su rótulo y su error debajo.
 * @param props - Rótulo, control, ayuda, error y si es obligatorio.
 * @returns Etiqueta lista para el formulario.
 */
export function Field({
  label,
  children,
  hint,
  error = "",
  span = false,
  required = false,
}: Readonly<FieldProps>) {
  const classes = [span ? "gp-field is-span" : "gp-field"];
  if (error) classes.push("is-miss");
  return (
    <label className={classes.join(" ")}>
      <span className="gp-field__label">
        {label}
        {required ? (
          <span className="gp-field__req" aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </span>
      {children}
      <span className="gp-field__foot">
        {hint ? <small>{hint}</small> : null}
        {error ? <em className="field-miss">{error}</em> : null}
      </span>
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
  integer?: boolean;
  span?: boolean;
  disabled?: boolean;
  required?: boolean;
};

/**
 * Campo que solo deja pasar números.
 *
 * Ignora letras y símbolos, permite un solo decimal y avisa en el campo
 * cuando lo escrito no sirve.
 * @param props - Rótulo, valor y manejador.
 * @returns Campo numérico con su error.
 */
export function NumberField({
  label,
  value,
  onChange,
  hint,
  error = "",
  placeholder,
  integer = false,
  span = false,
  disabled = false,
  required = false,
}: Readonly<NumberFieldProps>) {
  const clean = (raw: string): string => {
    const allowed = raw.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
    const parts = allowed.split(".");
    if (parts.length > 2) return `${parts.shift()}.${parts.join("")}`;
    const number = allowed === "" ? "" : Number(allowed);
    if (allowed !== "" && Number.isNaN(number)) return "";
    if (integer) return parts[0];
    return allowed;
  };

  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      span={span}
      required={required}
    >
      <input
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(clean(event.target.value))}
      />
    </Field>
  );
}

type BalanceProps = {
  alive: number;
  received: number;
};

/**
 * Barra de aves vivas frente a las recibidas.
 * @param props - Saldo vivo y aves recibidas.
 * @returns Barra con su porcentaje accesible.
 */
export function BalanceBar({ alive, received }: Readonly<BalanceProps>) {
  const percent = received > 0 ? Math.min(100, Math.max(0, Math.round((alive / received) * 100))) : 0;
  return (
    <span className="gp-balance">
      <span
        className="gp-balance__fill"
        style={{ width: `${percent}%` }}
        role="img"
        aria-label={`${percent}% de las aves recibidas siguen vivas`}
      />
    </span>
  );
}

type GuideProps = {
  title: string;
  lead?: string;
  steps: string[];
  example: string;
};

/**
 * Guía corta de uso con un ejemplo real.
 * @param props - Título, descripción, pasos y ejemplo.
 * @returns Aviso desplegable con los pasos y el ejemplo.
 */
export function Guide({ title, lead, steps, example }: Readonly<GuideProps>) {
  return (
    <details className="gp-guide">
      <summary>
        <span className="gp-guide__badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" strokeLinecap="round" />
            <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="gp-guide__text">
          <strong>{title}</strong>
          {lead ? <small>{lead}</small> : null}
        </span>
        <span className="gp-guide__cta">
          <span className="gp-guide__cta-closed">Ver guía</span>
          <span className="gp-guide__cta-open">Ocultar</span>
        </span>
      </summary>
      <ol className="gp-guide__steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="gp-guide__num">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="gp-guide__example">
        <strong>Ejemplo:</strong> {example}
      </p>
    </details>
  );
}

/**
 * Nota corta para explicar una regla del módulo.
 * @param props - Contenido de la nota.
 * @returns Párrafo secundario.
 */
export function Note({ children }: Readonly<{ children: ReactNode }>) {
  return <p className="gp-note">{children}</p>;
}

type ExtraProps = {
  title: string;
  children: ReactNode;
};

/**
 * Bloque plegado para datos que no hacen falta ver siempre.
 * @param props - Título y contenido.
 * @returns Detalle desplegable.
 */
export function ExtraBlock({ title, children }: Readonly<ExtraProps>) {
  return (
    <details className="gp-extra">
      <summary>{title}</summary>
      <div className="gp-extra__body">{children}</div>
    </details>
  );
}

type EmptyProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
};

/**
 * Mensaje para una lista sin registros.
 * @param props - Título, texto del vacío y acción sugerida.
 * @returns Aviso centrado con una salida clara.
 */
export function Empty({ title, action, children }: Readonly<EmptyProps>) {
  return (
    <div className="gp-empty" role="status">
      {title ? <strong className="gp-empty__title">{title}</strong> : null}
      <p className="gp-empty__text">{children}</p>
      {action ? <div className="gp-empty__action">{action}</div> : null}
    </div>
  );
}

type ActionProps = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
};

/**
 * Acción con icono y el nombre al pasar el cursor.
 * @param props - Texto, click e icono.
 * @returns Botón cuadrado con pista.
 */
export function ActionBtn({ label, onClick, danger = false, children }: Readonly<ActionProps>) {
  return (
    <button
      type="button"
      className={danger ? "gp-act is-danger" : "gp-act"}
      data-label={label}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m13.5 6.5 3 3" />
    </svg>
  );
}

export function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" aria-hidden="true">
      <path d="M5 7h14" />
      <path d="M10 7V5h4v2" />
      <path d="M8 7l.8 12h6.4L16 7" />
    </svg>
  );
}

export function IconLock() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconUnlock() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" />
    </svg>
  );
}
