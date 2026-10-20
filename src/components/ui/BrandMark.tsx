/**
 * Marca visual AGROTECH-T.
 *
 * Propósito: mostrar el icono vectorizado del favicon en la UI.
 * Contexto: shell autenticado; no se usa en formularios de acceso.
 * @author Cristian Deysdayr Jimenez
 */

type Props = {
  className?: string;
};

/**
 * Imagen de marca a partir del icono de acceso.
 * @param props - Clase opcional del contenedor visual.
 * @returns Figura decorativa sin texto alternativo.
 */
export function BrandMark({ className = "" }: Readonly<Props>) {
  const classes = className ? `brand-mark ${className}` : "brand-mark";
  return (
    <img
      className={classes}
      src="/icon-192.png"
      alt=""
      width={56}
      height={56}
      decoding="async"
      aria-hidden="true"
    />
  );
}
