/**
 * Listado de fincas propias.
 *
 * Propósito: mostrar nombre, rol y abrir el detalle.
 * Contexto: pantalla Fincas del shell.
 * @author Cristian Deysdayr Jimenez
 */

import { roleLabel } from "../services/roleLabel.ts";
import type { Farm } from "../types/index.ts";

type Props = {
  farms: Farm[];
  onSelect: (farm: Farm) => void;
};

/**
 * Filas clicables del listado.
 * @param props - Fincas y callback de selección.
 * @returns Lista semántica.
 */
export function FarmList({ farms, onSelect }: Readonly<Props>) {
  return (
    <ul className="farm-list">
      {farms.map((farm) => (
        <li key={farm.id}>
          <button type="button" className="farm-row" onClick={() => onSelect(farm)}>
            <span className="farm-row__name">{farm.name}</span>
            <span className="farm-row__role">{roleLabel(farm.role)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
