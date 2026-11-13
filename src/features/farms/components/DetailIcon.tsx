/**
 * Íconos del detalle de finca.
 *
 * Propósito: trazos simples para pestañas y tarjetas del detalle.
 * Contexto: SVG local, decorativo (aria-hidden); hereda el color del texto.
 * @author Cristian Deysdayr Jimenez
 */

export type DetailIconName =
  | "grid"
  | "users"
  | "mail"
  | "history"
  | "gear"
  | "id"
  | "calendar"
  | "refresh"
  | "pulse"
  | "pencil"
  | "power"
  | "logout"
  | "arrow-left"
  | "arrow-right";

const PATHS: Record<DetailIconName, string[]> = {
  grid: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  users: [
    "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
    "M3 20a6 6 0 0 1 12 0",
    "M16 4.5a3.5 3.5 0 0 1 0 6.5",
    "M18 14.5a6 6 0 0 1 3 5.5",
  ],
  mail: ["M3.5 6h17v12h-17z", "m4 7 8 6 8-6"],
  history: ["M3.5 12a8.5 8.5 0 1 0 2.5-6", "M3.5 4v4h4", "M12 8v4l3 2"],
  gear: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    "M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z",
  ],
  id: ["M3.5 5.5h17v13h-17z", "M8.5 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z", "M5.5 16a3 3 0 0 1 6 0", "M14 10h4", "M14 14h4"],
  calendar: ["M4 6h16v14H4z", "M4 10h16", "M8 3.5v4", "M16 3.5v4"],
  refresh: ["M20 11a8 8 0 0 0-14.5-4.5", "M4 4v4h4", "M4 13a8 8 0 0 0 14.5 4.5", "M20 20v-4h-4"],
  pulse: ["M3 12h4l2.5-6 5 12 2.5-6h4"],
  pencil: ["M4 20h4L19 9l-4-4L4 16z", "m13.5 6.5 4 4"],
  power: ["M12 3v8", "M7 6.3a7.5 7.5 0 1 0 10 0"],
  logout: ["M14 4h5v16h-5", "M10 8l-4 4 4 4", "M6 12h10"],
  "arrow-left": ["M19 12H5", "m11 6-6 6 6 6"],
  "arrow-right": ["M5 12h14", "m13 6 6 6-6 6"],
};

/** Ícono decorativo de 24×24 con trazo. */
export function DetailIcon({ name }: Readonly<{ name: DetailIconName }>) {
  return (
    <svg
      className="detail-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
