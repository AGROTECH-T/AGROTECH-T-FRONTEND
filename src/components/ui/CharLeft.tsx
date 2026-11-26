/**
 * Caracteres que todavía caben en un campo.
 *
 * Propósito: ir restando mientras se escribe y marcar el tope.
 * Contexto: cualquier dato con un máximo real de la API.
 * @author Cristian Deysdayr Jimenez
 */

type Props = {
  value: string;
  max: number;
  id?: string;
};

/**
 * Corta el texto al máximo.
 * @param value - Lo que acaba de escribir la persona.
 * @param max - Tope del campo.
 * @returns El texto que sí cabe.
 */
export function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

/**
 * Muestra cuántos caracteres faltan.
 * @param props - Texto actual y máximo del campo.
 * @returns El conteo, en vivo.
 */
export function CharLeft({ value, max, id }: Readonly<Props>) {
  const left = Math.max(0, max - value.length);
  const tone = left === 0 ? "char-left is-empty" : "char-left";
  return (
    <p className={tone} id={id} aria-live="polite">
      {left} restantes
    </p>
  );
}
