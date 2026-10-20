/**
 * Iconos del menú lateral.
 *
 * Propósito: dibujar casa, caja e usuario con trazo verde.
 * Contexto: sidebar del shell autenticado.
 * @author Cristian Deysdayr Jimenez
 */

type Name = "home" | "box";

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
      {name === "box" ? (
        <>
          <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" />
          <path d="M12 12v9M12 12 20 7.5M12 12 4 7.5" />
        </>
      ) : null}
    </svg>
  );
}
