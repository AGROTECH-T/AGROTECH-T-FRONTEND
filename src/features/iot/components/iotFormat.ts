const dateFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const timeFormatter = new Intl.DateTimeFormat("es-CO", { timeStyle: "medium" });

/** Local date and time of an ISO timestamp; "—" when absent. */
export function formatIotDate(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "Fecha no válida" : dateFormatter.format(parsed);
}

/** Local clock time of an epoch in milliseconds. */
export function formatIotTime(value: number): string {
  return timeFormatter.format(value);
}
