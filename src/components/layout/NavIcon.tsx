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

type Name = "home" | "land" | "box" | "bird" | "iot" | "gear";

type Props = {
  name: Name;
};

const PICTURES: Record<Exclude<Name, "iot">, string> = {
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
  if (name === "iot") {
    return (
      <svg className="side-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4m0 12v4M2 12h4m12 0h4M5 5l2.8 2.8m8.4 8.4L19 19m0-14-2.8 2.8m-8.4 8.4L5 19" />
      </svg>
    );
  }
  return <img className="side-nav__icon" src={PICTURES[name]} alt="" />;
}
