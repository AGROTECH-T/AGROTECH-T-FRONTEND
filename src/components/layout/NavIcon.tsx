/**
 * Iconos del menú lateral.
 *
 * Propósito: mostrar cada sección con su imagen.
 * Contexto: sidebar del shell autenticado.
 * @author Cristian Deysdayr Jimenez
 */

import configuracionIcon from "../../assets/icons/configuracion.png";
import fincaIcon from "../../assets/icons/finca.png";
import galponIcon from "../../assets/icons/galpon.png";
import inicioIcon from "../../assets/icons/inicio.png";
import inventarioIcon from "../../assets/icons/inventario.png";

type Name = "home" | "land" | "box" | "bird" | "gear";

type Props = {
  name: Name;
};

const PICTURES: Record<Name, string> = {
  home: inicioIcon,
  land: fincaIcon,
  box: inventarioIcon,
  bird: galponIcon,
  gear: configuracionIcon,
};

/**
 * Icono del ítem de navegación.
 * @param props - Nombre del glifo.
 * @returns Imagen decorativa.
 */
export function NavIcon({ name }: Readonly<Props>) {
  return <img className="side-nav__icon" src={PICTURES[name]} alt="" />;
}
