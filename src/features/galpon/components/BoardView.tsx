/**
 * Vista de indicadores.
 *
 * Propósito: resumir el lote en cifras de mortalidad, peso y alimento.
 * Contexto: lo estimado se muestra como estimado; no se inventa precisión.
 * @author Cristian Deysdayr Jimenez
 */

import type { Lot } from "../types/index.ts";
import {
  Empty,
  GalponCard,
  GalponStat,
  numberText,
  Note,
  stageLabel,
} from "./galponUi.tsx";

type Props = {
  lot: Lot;
};

/**
 * Indicadores del lote.
 * @param props - Lote con su resumen.
 * @returns Tablero del lote.
 */
export function BoardView({ lot }: Readonly<Props>) {
  const summary = lot.summary;
  const mortalityPercent =
    summary && summary.received > 0
      ? Math.round((summary.mortality / summary.received) * 1000) / 10
      : 0;

  return (
    <GalponCard title="Indicadores del lote" subtitle="Mortalidad, peso y alimento." wide>
      {summary == null ? (
        <Empty>Todavía no hay cifras para este lote.</Empty>
      ) : (
        <div className="gp-board-stack">
          <div className="gp-stats gp-stats--inner">
            <GalponStat
              label="Mortalidad"
              value={summary.mortality}
              hint={`${numberText(mortalityPercent, 1)}% de las recibidas`}
              tone={summary.mortality > 0 ? "warn" : "idle"}
            />
            <GalponStat label="Salidas" value={summary.exits} />
            <GalponStat label="Aisladas" value={summary.isolated} />
            <GalponStat
              label="Aves por m²"
              value={summary.birds_per_m2 ? numberText(summary.birds_per_m2, 2) : "—"}
            />
          </div>

          <div className="gp-board">
            <section className="gp-board__block">
              <h3>Peso y alimento</h3>
              <dl className="gp-board__facts">
                <div>
                  <dt>Último peso</dt>
                  <dd>
                    {summary.last_weight ? `${numberText(summary.last_weight)} kg` : "Sin pesaje"}
                    {summary.weight_is_sample ? " (muestra)" : ""}
                  </dd>
                </div>
                <div>
                  <dt>Cambio de peso</dt>
                  <dd>
                    {summary.weight_change ? `${numberText(summary.weight_change)} kg` : "—"}
                  </dd>
                </div>
                <div>
                  <dt>Alimento medido</dt>
                  <dd>{numberText(summary.feed.measured_kg)} kg</dd>
                </div>
                <div>
                  <dt>Lecturas de agua</dt>
                  <dd>{summary.water_points.length}</dd>
                </div>
                <div>
                  <dt>Manejos de cama</dt>
                  <dd>{summary.bedding_notes}</dd>
                </div>
                <div>
                  <dt>Conversión</dt>
                  <dd>{summary.conversion ? numberText(summary.conversion) : "No se calcula"}</dd>
                </div>
              </dl>
              {summary.conversion_note ? <Note>{summary.conversion_note}</Note> : null}

              {Object.keys(summary.feed.by_stage).length > 0 ? (
                <ul className="gp-board__feed">
                  {Object.entries(summary.feed.by_stage).map(([stage, values]) => (
                    <li key={stage}>
                      <strong>{stageLabel(stage)}</strong>
                      <span>
                        Medido {numberText(values.medido)} · Estimado {numberText(values.estimado)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className="gp-board__block">
              <h3>Pendientes</h3>
              {summary.pending.length === 0 ? (
                <p className="gp-board__ok">Sin tareas pendientes para hoy.</p>
              ) : (
                <ul className="gp-board__pending">
                  {summary.pending.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </GalponCard>
  );
}
