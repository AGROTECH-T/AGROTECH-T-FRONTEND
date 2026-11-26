import type { IotReading } from "../services/iotApi.ts";
import { smoothTrendPath, trendGeometry, trendSeries } from "../services/iotState.ts";

const WIDTH = 640;
const HEIGHT = 170;
const valueFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const timeFormatter = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" });

type Props = {
  readings: readonly IotReading[];
  sensorUid: string;
  unit: string;
};

/** Simple SVG trend of the valid effective values present in the loaded page. */
export function IotTrend({ readings, sensorUid, unit }: Props) {
  const series = trendSeries(readings, sensorUid);
  const excluded = readings.filter((reading) => reading.sensor_uid === sensorUid).length - series.length;
  const geometry = trendGeometry(series, WIDTH, HEIGHT, 12);
  const suffix = unit ? ` ${unit}` : "";

  return <section className="iot-trend" aria-labelledby="iot-trend-title">
    <div className="iot-section-title">
      <div>
        <h2 id="iot-trend-title">Tendencia</h2>
        <p>Valores efectivos válidos de las mediciones cargadas en esta página ({series.length}).{excluded > 0 ? ` Se omiten ${excluded} nulas o invalidadas.` : ""}</p>
      </div>
    </div>
    {geometry && series.length > 1 ? <>
      <svg className="iot-trend__chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Tendencia de ${series.length} mediciones entre ${valueFormatter.format(geometry.min)} y ${valueFormatter.format(geometry.max)}${suffix}`}>
        <defs>
          <linearGradient id="iot-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--leaf)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--leaf)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path fill="url(#iot-trend-fill)" d={`${smoothTrendPath(geometry.points)} L${geometry.points[geometry.points.length - 1].x.toFixed(1)} ${HEIGHT - 8} L${geometry.points[0].x.toFixed(1)} ${HEIGHT - 8} Z`} />
        <path className="iot-trend__line" d={smoothTrendPath(geometry.points)} vectorEffect="non-scaling-stroke" />
        <circle className="iot-trend__dot" cx={geometry.points[geometry.points.length - 1].x} cy={geometry.points[geometry.points.length - 1].y} r="4.5" />
      </svg>
      <div className="iot-trend__legend">
        <span>{timeFormatter.format(series[0].time)}</span>
        <span>Mín. {valueFormatter.format(geometry.min)}{suffix} · Máx. {valueFormatter.format(geometry.max)}{suffix}</span>
        <span>{timeFormatter.format(series[series.length - 1].time)}</span>
      </div>
    </> : <div className="iot-message">Se necesitan al menos dos mediciones válidas para trazar la tendencia.</div>}
  </section>;
}
