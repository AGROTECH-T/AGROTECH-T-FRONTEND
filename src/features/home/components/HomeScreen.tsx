/**
 * Pantalla posterior al ingreso.
 *
 * Propósito: ofrecer únicamente el cierre de sesión.
 * Contexto: al entrar no se muestran módulos internos.
 * @author Cristian Deysdayr Jimenez
 */

type Props = {
  onLogout: () => void;
};

/**
 * Muestra el botón para salir de la cuenta.
 * @param props - Acción de cierre de sesión.
 * @returns Página con el cierre de sesión.
 */
export function HomeScreen({ onLogout }: Readonly<Props>) {
  return (
    <main className="home">
      <button type="button" className="logout" onClick={onLogout}>Cerrar sesión</button>
    </main>
  );
}
