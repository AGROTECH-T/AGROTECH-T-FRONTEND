/**
 * Panel de última lectura por sensor (Resumen IoT).
 *
 * Propósito: tarjetas tipo dashboard por sensor con valor, estado, tendencia y paginación.
 * Contexto: solo presentación; canales, UIDs y lecturas no se alteran.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useMemo, useState } from "react";
import type { IotReading, IotSensor } from "../services/iotApi.ts";
import {
  ACTIVITY_ESTIMATE_LABEL,
  activityEstimate,
  adjustedOriginalText,
  latestReadingsBySensor,
  READING_STATUS_LABEL,
  readingStatus,
  readingValueText,
  RECENT_ACTIVITY_WINDOW_MS,
  SUMMARY_READING_SAMPLE,
  SUMMARY_WINDOW_DAYS,
  trendGeometry,
  trendSeries,
} from "../services/iotState.ts";
import { formatIotDate, metricLabel } from "./iotFormat.ts";

const SPARK_W = 200;
const SPARK_H = 36;
/** Sensores visibles por página en el resumen. */
export const LATEST_SENSORS_PAGE_SIZE = 20;

type Props = {
  sensors: readonly IotSensor[];
  readings: readonly IotReading[];
  /** Moment the readings were received by this page; reference for the activity estimate. */
  refreshedAt: number;
};

/** Small SVG sparkline of the valid effective values present in the sample. */
function Sparkline({ readings, sensorUid }: { readings: readonly IotReading[]; sensorUid: string }) {
  const series = trendSeries(readings, sensorUid);
  const geometry = series.length > 1 ? trendGeometry(series, SPARK_W, SPARK_H, 4) : null;
  if (!geometry) return <span className="iot-spark iot-spark--empty">Sin tendencia aún</span>;
  const first = geometry.points[0];
  const last = geometry.points[geometry.points.length - 1];
  const area = `${geometry.path} L${last.x.toFixed(1)} ${SPARK_H - 1} L${first.x.toFixed(1)} ${SPARK_H - 1} Z`;
  return (
    <svg
      className="iot-spark"
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Tendencia de ${series.length} mediciones válidas`}
    >
      <path className="iot-trend__area" d={area} />
      <path className="iot-trend__line" d={geometry.path} vectorEffect="non-scaling-stroke" />
      <circle className="iot-trend__dot" cx={last.x} cy={last.y} r="3.2" />
    </svg>
  );
}

function MetricIcon({ metric }: { metric: string }) {
  if (metric === "relative_humidity" || metric === "moisture") {
    return (
      <span className="iot-sensor-card__icon iot-sensor-card__icon--humidity" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3c3.5 5 6 8.2 6 11a6 6 0 1 1-12 0c0-2.8 2.5-6 6-11Z" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="iot-sensor-card__icon iot-sensor-card__icon--temp" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10 14.5V6a2 2 0 1 1 4 0v8.5a3.5 3.5 0 1 1-4 0Z" strokeLinejoin="round" />
        <path d="M12 17.5v-6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function EmptySensorIcon() {
  return (
    <span className="iot-sensor-card__empty-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 12a7 7 0 0 1 14 0" strokeLinecap="round" />
        <path d="M8 12a4 4 0 0 1 8 0" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function metricTone(metric: string): "humidity" | "temp" | "default" {
  if (metric === "relative_humidity" || metric === "moisture") return "humidity";
  if (metric === "temperature") return "temp";
  return "default";
}

/**
 * Latest reading available for each sensor, derived from the summary sample.
 */
export function IotLatestReadings({ sensors, readings, refreshedAt }: Props) {
  const latest = useMemo(() => latestReadingsBySensor(readings), [readings]);
  const minutes = Math.round(RECENT_ACTIVITY_WINDOW_MS / 60000);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(sensors.length / LATEST_SENSORS_PAGE_SIZE));

  const liveCount = useMemo(() => {
    let count = 0;
    for (const sensor of sensors) {
      const reading = latest.get(sensor.uid);
      if (!reading) continue;
      if (activityEstimate(reading.server_received_at, refreshedAt) === "recent") count += 1;
    }
    return count;
  }, [sensors, latest, refreshedAt]);

  useEffect(() => {
    setPage(1);
  }, [sensors]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageSensors = useMemo(() => {
    const start = (page - 1) * LATEST_SENSORS_PAGE_SIZE;
    return sensors.slice(start, start + LATEST_SENSORS_PAGE_SIZE);
  }, [sensors, page]);

  return (
    <section className="iot-latest" aria-labelledby="iot-latest-title">
      <div className="iot-dash-head">
        <div className="iot-section-title__main">
          <span className="iot-section-title__badge" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 19V5" strokeLinecap="round" />
              <path d="M4 19h16" strokeLinecap="round" />
              <path d="M8 15v-4" strokeLinecap="round" />
              <path d="M12 15V8" strokeLinecap="round" />
              <path d="M16 15v-7" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <h2 id="iot-latest-title">Panel de sensores</h2>
            <p>
              Última lectura de cada sensor, tomada de las {SUMMARY_READING_SAMPLE} mediciones más
              recientes ({SUMMARY_WINDOW_DAYS} días). La actividad es una estimación según la
              recepción en servidor (últimos {minutes} min).
            </p>
          </div>
        </div>
        <div className="iot-dash-head__chips">
          <span className="iot-section-chip">{sensors.length} sensores</span>
          <span className="iot-section-chip iot-section-chip--live">{liveCount} con actividad reciente</span>
          <span className="iot-section-chip">Últimos {SUMMARY_WINDOW_DAYS} días</span>
        </div>
      </div>

      {sensors.length === 0 ? (
        <div className="iot-message">Esta finca no tiene sensores registrados.</div>
      ) : (
        <>
          <div className="iot-sensor-grid">
            {pageSensors.map((sensor) => {
              const tone = metricTone(sensor.metric);
              const reading = latest.get(sensor.uid);
              if (!reading) {
                return (
                  <article
                    className={`iot-sensor-card iot-sensor-card--empty iot-sensor-card--${tone}`}
                    key={sensor.uid}
                  >
                    <header className="iot-sensor-card__head">
                      <MetricIcon metric={sensor.metric} />
                      <div>
                        <strong>{metricLabel(sensor.metric)}</strong>
                        <span className="iot-muted">
                          Canal {sensor.channel}
                          {sensor.unit ? ` · ${sensor.unit}` : ""}
                        </span>
                      </div>
                    </header>
                    <div className="iot-sensor-card__empty">
                      <EmptySensorIcon />
                      <p>
                        <strong>Sin mediciones</strong>
                        <span>Aún no llegan datos de este sensor</span>
                      </p>
                    </div>
                    <footer className="iot-sensor-card__foot">
                      <code>{sensor.uid}</code>
                    </footer>
                  </article>
                );
              }
              const status = readingStatus(reading);
              const original = adjustedOriginalText(reading);
              const activity = activityEstimate(reading.server_received_at, refreshedAt);
              return (
                <article
                  className={`iot-sensor-card iot-sensor-card--${tone} iot-sensor-card--${activity}`}
                  key={sensor.uid}
                >
                  <header className="iot-sensor-card__head">
                    <MetricIcon metric={sensor.metric} />
                    <div className="iot-sensor-card__titles">
                      <strong>{metricLabel(sensor.metric)}</strong>
                      <span className="iot-muted">
                        Canal {sensor.channel}
                        {sensor.unit ? ` · ${sensor.unit}` : ""}
                      </span>
                    </div>
                    <span className={`iot-badge iot-badge--${status}`}>
                      {READING_STATUS_LABEL[status]}
                    </span>
                  </header>

                  <div className="iot-sensor-card__hero">
                    <span className={`iot-value iot-value--${status}`}>{readingValueText(reading)}</span>
                    {original ? <small className="iot-muted">Ajustada · original {original}</small> : null}
                  </div>

                  <div className="iot-sensor-card__chart">
                    <Sparkline readings={readings} sensorUid={sensor.uid} />
                  </div>

                  <dl className="iot-sensor-card__times">
                    <div>
                      <dt>Medición</dt>
                      <dd>
                        {formatIotDate(reading.measured_at)}
                        {reading.measured_at_approximate ? " (aprox.)" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>Recepción</dt>
                      <dd>{formatIotDate(reading.server_received_at)}</dd>
                    </div>
                  </dl>

                  <div className={`iot-activity iot-activity--${activity}`} role="status">
                    <span className="iot-activity__dot" aria-hidden="true" />
                    <span>{ACTIVITY_ESTIMATE_LABEL[activity]}</span>
                  </div>

                  <footer className="iot-sensor-card__foot">
                    <code>{sensor.uid}</code>
                  </footer>
                </article>
              );
            })}
          </div>
          <nav className="iot-pagination" aria-label="Páginas de sensores">
            <span>
              Página {page} de {pageCount} · {sensors.length}{" "}
              {sensors.length === 1 ? "sensor" : "sensores"}
            </span>
            <div>
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Anterior
              </button>
              <button
                type="button"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => current + 1)}
              >
                Siguiente
              </button>
            </div>
          </nav>
        </>
      )}
    </section>
  );
}
