/**
 * Regreso a la pantalla anterior.
 *
 * Propósito: un solo botón Volver atrás, del mismo tamaño en toda la app.
 * @author Cristian Deysdayr Jimenez
 */

type Props = {
  onClick: () => void;
  disabled?: boolean;
};

/**
 * Botón secundario con flecha.
 * @param props - Acción y si está bloqueado.
 * @returns Botón Volver atrás.
 */
export function BackButton({ onClick, disabled = false }: Readonly<Props>) {
  return (
    <button type="button" className="btn-secondary screen-back" onClick={onClick} disabled={disabled}>
      <svg className="screen-back__arrow" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M14.5 5.5 8 12l6.5 6.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Volver atrás
    </button>
  );
}
