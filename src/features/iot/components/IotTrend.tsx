import { useEffect, useState } from "react";
import type { IotReading, IotSensor } from "../services/iotApi.ts";
import {
  latestReadingsBySensor,
  readingValueText,
  smoothTrendPath,
  trendGeometry,
  trendSeries,
  type TrendPoint,
} from "../services/iotState.ts";
import { metricLabel } from "./iotFormat.ts";

const PLOT_W = 640;
const PLOT_H = 210;
const valueFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const clockFormatter = new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" });
const dayFormatter = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

type TrendProps = {
  readings: readonly IotReading[];
  sensorUid: string;
  unit: string;
};

function formatAxisTime(time: number, spanMs: number): string {
  const date = new Date(time);
  return spanMs > 36 * 60 * 60 * 1000 ? dayFormatter.format(date) : clockFormatter.format(date);
}

function sensorChipLabel(sensor: IotSensor, sensors: readonly IotSensor[]): string {
  const name = metricLabel(sensor.metric);
  const sameMetric = sensors.filter((item) => item.metric === sensor.metric).length;
  return sameMetric > 1 ? `${name} · canal ${sensor.channel}` : name;
}

/** Área con ejes de una serie ya filtrada. */
function EvolutionPlot({ series, gradientId }: { series: readonly TrendPoint[]; gradientId: string }) {
  const geometry = series.length > 1 ? trendGeometry(series, PLOT_W, PLOT_H, 8) : null;
  if (!geometry) {
    return <div className="iot-message">Se necesitan al menos dos mediciones válidas para trazar la evolución.</div>;
  }
  const line = smoothTrendPath(geometry.points);
  const first = geometry.points[0];
  const last = geometry.points[geometry.points.length - 1];
  const base = PLOT_H - 6;
  const area = `${line} L${last.x.toFixed(1)} ${base} L${first.x.toFixed(1)} ${base} Z`;
  const mid = (geometry.min + geometry.max) / 2;
  const upper = geometry.min + (geometry.max - geometry.min) * 0.75;
  const lower = geometry.min + (geometry.max - geometry.min) * 0.25;
  const ticks = [geometry.max, upper, mid, lower, geometry.min];
  const spanMs = series[series.length - 1].time - series[0].time;
  const marks = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  const times = [...new Set(marks)].map((index) => series[index].time);

  return (
    <div className="iot-evolution__plot">
      <div className="iot-evolution__yaxis" aria-hidden="true">
        {ticks.map((tick, index) => (
          <span key={index}>{valueFormatter.format(tick)}</span>
        ))}
      </div>
      <svg
        className="iot-evolution__chart"
        viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
        role="img"
        aria-label={`Evolución de ${series.length} mediciones entre ${valueFormatter.format(geometry.min)} y ${valueFormatter.format(geometry.max)}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--emerald)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--emerald)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick, index) => {
          const pad = 8;
          const inner = PLOT_H - 16;
          const span = geometry.max - geometry.min;
          const y = pad + (span === 0 ? inner / 2 : (1 - (tick - geometry.min) / span) * inner);
          return <line key={index} className="iot-evolution__grid" x1="0" x2={PLOT_W} y1={y} y2={y} />;
        })}
        <path fill={`url(#${gradientId})`} d={area} />
        <path className="iot-evolution__line" d={line} vectorEffect="non-scaling-stroke" />
        <circle className="iot-evolution__dot" cx={last.x} cy={last.y} r="4.5" />
      </svg>
      <div className="iot-evolution__xaxis">
        {times.map((time) => (
          <span key={time}>{formatAxisTime(time, spanMs)}</span>
        ))}
      </div>
    </div>
  );
}

/** Tendencia del historial para el sensor ya filtrado. */
export function IotTrend({ readings, sensorUid, unit }: TrendProps) {
  const series = trendSeries(readings, sensorUid);
  const excluded = readings.filter((reading) => reading.sensor_uid === sensorUid).length - series.length;
  const suffix = unit ? ` ${unit}` : "";

  return (
    <section className="iot-evolution" aria-labelledby="iot-trend-title">
      <div className="iot-evolution__head">
        <div>
          <p className="iot-evolution__kicker">Analítica</p>
          <h2 id="iot-trend-title">Evolución en el tiempo</h2>
          <p>
            Valores efectivos de esta página ({series.length}
            {suffix ? ` · ${unit}` : ""}).
            {excluded > 0 ? ` Se omiten ${excluded} nulas o invalidadas.` : ""}
          </p>
        </div>
      </div>
      <EvolutionPlot series={series} gradientId="iot-trend-fill" />
    </section>
  );
}

type EvolutionProps = {
  sensors: readonly IotSensor[];
  readings: readonly IotReading[];
};

/**
 * Gráfica de evolución del resumen, con una pastilla por sensor real.
 * Usa la muestra ya cargada; no inventa métricas.
 */
export function IotEvolution({ sensors, readings }: EvolutionProps) {
  const [uid, setUid] = useState("");
  const selected = sensors.find((sensor) => sensor.uid === uid) ?? sensors[0] ?? null;

  useEffect(() => {
    if (selected && selected.uid !== uid) setUid(selected.uid);
  }, [selected, uid]);

  if (!selected) return null;

  const series = trendSeries(readings, selected.uid);
  const latest = latestReadingsBySensor(readings).get(selected.uid);
  const label = sensorChipLabel(selected, sensors);

  return (
    <section className="iot-evolution" aria-labelledby="iot-evolution-title">
      <div className="iot-evolution__head">
        <div>
          <p className="iot-evolution__kicker">Analítica</p>
          <h2 id="iot-evolution-title">Evolución en el tiempo</h2>
          <p>Tendencia de las mediciones cargadas en el resumen.</p>
        </div>
        <div className="iot-evolution__pills" role="tablist" aria-label="Variable">
          {sensors.map((sensor) => {
            const active = sensor.uid === selected.uid;
            return (
              <button
                key={sensor.uid}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? "is-active" : ""}
                onClick={() => setUid(sensor.uid)}
              >
                {sensorChipLabel(sensor, sensors)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="iot-evolution__selected">
        <div>
          <span>Variable seleccionada</span>
          <strong>{latest ? readingValueText(latest) : "Sin mediciones"}</strong>
        </div>
        <span className="iot-evolution__key">
          <i aria-hidden="true" />
          {label}
        </span>
      </div>
      <EvolutionPlot series={series} gradientId={`iot-evo-${selected.uid.replace(/[^a-zA-Z0-9]/g, "")}`} />
    </section>
  );
}
