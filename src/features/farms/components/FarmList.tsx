/**
 * Listado de fincas propias.
 *
 * Propósito: mostrar cada finca como tarjeta (nombre, rol, estado y fecha) y
 * abrir su detalle.
 * Distribución: cuadrícula de tarjetas verticales con una franja de surcos,
 * el ícono superpuesto y un único botón «Abrir finca».
 * Contexto: pantalla Fincas del shell.
 * @author Cristian Deysdayr Jimenez
 */

import fincaArt from "../../../assets/onboard-finca.webp";
import { shortDate } from "../services/farmFilter.ts";
import { roleLabel } from "../services/roleLabel.ts";
import type { Farm } from "../types/index.ts";

type Props = {
  farms: Farm[];
  onSelect: (farm: Farm) => void;
};

function FarmCard({ farm, onSelect }: Readonly<{ farm: Farm; onSelect: (farm: Farm) => void }>) {
  const titleId = `farm-card-${farm.id}-title`;
  const active = farm.is_active !== false;
  const date = active ? shortDate(farm.created_at) : shortDate(farm.deactivated_at);
  return (
    <article className="farm-card" data-active={active ? "true" : "false"} aria-labelledby={titleId}>
      <div className="farm-card__band" aria-hidden="true">
        <span className="farm-card__mark">
          <img src={fincaArt} alt="" width={32} height={32} decoding="async" />
        </span>
      </div>
      <div className="farm-card__body">
        <div className="farm-card__head">
          <h3 id={titleId} className="farm-card__name">
            {farm.name}
          </h3>
          <span className="farm-card__role" data-role={farm.role}>
            {roleLabel(farm.role)}
          </span>
        </div>
        <p className="farm-card__meta">
          <span className="farm-card__dot" aria-hidden="true" />
          {active ? "Activa" : "Desactivada"}
        </p>
        {date ? (
          <p className="farm-card__meta">{active ? `Creada el ${date}` : `Desde el ${date}`}</p>
        ) : null}
        <button
          type="button"
          className="farm-card__open"
          aria-describedby={titleId}
          onClick={() => onSelect(farm)}
        >
          {active ? "Abrir finca" : "Ver detalle"}
        </button>
      </div>
    </article>
  );
}

/**
 * Cuadrícula del listado.
 * @param props - Fincas y callback de selección.
 * @returns Lista semántica.
 */
export function FarmList({ farms, onSelect }: Readonly<Props>) {
  return (
    <ul className="farm-grid">
      {farms.map((farm) => (
        <li key={farm.id}>
          <FarmCard farm={farm} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  );
}
