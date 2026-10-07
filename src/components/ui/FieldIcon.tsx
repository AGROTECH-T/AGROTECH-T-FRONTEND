/**
 * Iconos lineales de los campos.
 *
 * Propósito: marcar persona, correo, teléfono y contraseña.
 * Contexto: formularios de acceso, en la paleta verde.
 * @author Cristian Deysdayr Jimenez
 */

type Name = "user" | "mail" | "phone" | "lock";

type Props = {
  name: Name;
};

/**
 * Dibuja un icono de trazo, sin texto alternativo.
 * @param props - Nombre del icono.
 * @returns Gráfico decorativo.
 */
export function FieldIcon({ name }: Readonly<Props>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      {name === "user" ? (
        <>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19.2c1.2-2.8 3.5-4.2 6.5-4.2s5.3 1.4 6.5 4.2" />
        </>
      ) : null}
      {name === "mail" ? (
        <>
          <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </>
      ) : null}
      {name === "phone" ? (
        <path d="M8 3.8h2.2l1.2 3-1.6 1a12 12 0 0 0 5.4 5.4l1-1.6 3 1.2V15a2 2 0 0 1-2.2 2A14.2 14.2 0 0 1 6 6a2 2 0 0 1 2-2.2Z" />
      ) : null}
      {name === "lock" ? (
        <>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
        </>
      ) : null}
    </svg>
  );
}
