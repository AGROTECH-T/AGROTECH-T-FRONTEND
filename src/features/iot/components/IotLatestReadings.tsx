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
import { formatIotDate } from "./iotFormat.ts";

const SPARK_W = 160;
const SPARK_H = 40;

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
  if (!geometry) return <span className="iot-spark iot-spark--empty">Sin tendencia</span>;
  return <svg className="iot-spark" viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" role="img" aria-label={`Tendencia de ${series.length} mediciones válidas`}>
    <path className="iot-trend__line" d={geometry.path} vectorEffect="non-scaling-stroke" />
  </svg>;
}

/** Latest reading available for each sensor, derived from the summary sample. */
export function IotLatestReadings({ sensors, readings, refreshedAt }: Props) {
  const latest = latestReadingsBySensor(readings);
  const minutes = Math.round(RECENT_ACTIVITY_WINDOW_MS / 60000);

  return <section aria-labelledby="iot-latest-title">
    <div className="iot-section-title">
      <div>
        <h2 id="iot-latest-title">Última lectura por sensor</h2>
        <p>Tomada de las {SUMMARY_READING_SAMPLE} mediciones más recientes de los últimos {SUMMARY_WINDOW_DAYS} días. La actividad es una estimación según la hora de recepción en el servidor (últimos {minutes} min), no un estado confirmado del dispositivo.</p>
      </div>
    </div>
    {sensors.length === 0
      ? <div className="iot-message">Esta finca no tiene sensores registrados.</div>
      : <div className="iot-sensor-grid">{sensors.map((sensor) => {
        const reading = latest.get(sensor.uid);
        if (!reading) {
          return <article className="iot-sensor-card" key={sensor.uid}>
            <header><strong>{sensor.metric}</strong><span className="iot-muted">{sensor.uid} · canal {sensor.channel}</span></header>
            <p className="iot-muted">Sin mediciones en la muestra consultada.</p>
          </article>;
        }
        const status = readingStatus(reading);
        const original = adjustedOriginalText(reading);
        const activity = activityEstimate(reading.server_received_at, refreshedAt);
        return <article className="iot-sensor-card" key={sensor.uid}>
          <header><strong>{sensor.metric}</strong><span className="iot-muted">{sensor.uid} · canal {sensor.channel}</span></header>
          <div className="iot-sensor-card__value">
            <span className={`iot-value iot-value--${status}`}>{readingValueText(reading)}</span>
            <span className={`iot-badge iot-badge--${status}`}>{READING_STATUS_LABEL[status]}</span>
          </div>
          {original ? <small className="iot-muted">Ajustada · original {original}</small> : null}
          <Sparkline readings={readings} sensorUid={sensor.uid} />
          <dl className="iot-sensor-card__times">
            <div><dt>Medición</dt><dd>{formatIotDate(reading.measured_at)}{reading.measured_at_approximate ? " (aprox.)" : ""}</dd></div>
            <div><dt>Recepción</dt><dd>{formatIotDate(reading.server_received_at)}</dd></div>
          </dl>
          <span className={`iot-activity iot-activity--${activity}`}>{ACTIVITY_ESTIMATE_LABEL[activity]}</span>
        </article>;
      })}</div>}
  </section>;
}
