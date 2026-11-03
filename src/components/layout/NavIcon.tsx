/**
 * Iconos del menú lateral.
 *
 * Propósito: dibujar casa, caja e usuario con trazo verde.
 * Contexto: sidebar del shell autenticado.
 * @author Cristian Deysdayr Jimenez
 */

type Name = "home" | "land" | "box" | "gear";

type Props = {
  name: Name;
};

/**
 * Icono lineal del ítem de navegación.
 * @param props - Nombre del glifo.
 * @returns SVG decorativo.
 */
export function NavIcon({ name }: Readonly<Props>) {
  return (
    <svg className="side-nav__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      {name === "home" ? (
        <path d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
      ) : null}
      {name === "land" ? (
        <>
          <path d="M3 19h18" />
          <path d="M5 19 9 9l3 5 3-7 4 12" />
        </>
      ) : null}
      {name === "box" ? (
        <>
          <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" />
          <path d="M12 12v9M12 12 20 7.5M12 12 4 7.5" />
        </>
      ) : null}
      {name === "gear" ? (
        <>
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" />
        </>
      ) : null}
    </svg>
  );
}
