const dateFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });
const timeFormatter = new Intl.DateTimeFormat("es-CO", { timeStyle: "medium" });

/** Etiquetas visibles de métricas (el API sigue enviando el código en inglés). */
const METRIC_LABELS: Record<string, string> = {
  temperature: "Temperatura",
  relative_humidity: "Humedad relativa",
  moisture: "Humedad del suelo",
};

/**
 * Nombre de métrica en español para pantallas.
 * @param metric - Código del sensor/lectura (p. ej. temperature).
 */
export function metricLabel(metric: string): string {
  const known = METRIC_LABELS[metric];
  if (known) return known;
  return metric.replaceAll("_", " ");
}

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
