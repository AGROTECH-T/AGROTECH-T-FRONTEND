/**
 * Sección de cuenta.
 *
 * Propósito: cerrar sesión desde el menú Usuario.
 * Contexto: shell autenticado de escritorio.
 * @author Cristian Deysdayr Jimenez
 */

type Props = {
  onLogout: () => void;
};

/**
 * Acciones de la cuenta activa.
 * @param props - Callback de cierre de sesión.
 * @returns Panel de usuario.
 */
export function UserPanel({ onLogout }: Readonly<Props>) {
  return (
    <section className="panel" aria-labelledby="user-title">
      <header className="panel__header">
        <h1 id="user-title" className="panel__title">Usuario</h1>
        <p className="panel__lead">Gestiona tu sesión en AGROTECH-T.</p>
      </header>
      <button type="button" className="btn-danger" onClick={onLogout}>
        Cerrar sesión
      </button>
    </section>
  );
}
