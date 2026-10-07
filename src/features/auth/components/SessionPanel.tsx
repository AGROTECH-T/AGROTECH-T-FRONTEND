/**
 * Estado autenticado.
 *
 * Propósito: confirmar quién ingresó y ofrecer el cierre de sesión.
 * Contexto: reemplaza el formulario cuando ya hay token vigente.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../types/index.ts";

type Props = {
  account: Account;
  onLogout: () => void;
};

/**
 * Saluda a la cuenta y cierra la sesión.
 * @param props - Cuenta visible y acción de salida.
 * @returns Panel de sesión.
 */
export function SessionPanel({ account, onLogout }: Readonly<Props>) {
  return (
    <section className="form" aria-labelledby="session-title">
      <p className="brand">Sesión activa</p>
      <h2 id="session-title">Hola, {account.first_name}</h2>
      <p className="hint">Documento {account.identification}</p>
      <button type="button" className="solid" onClick={onLogout}>Cerrar sesión</button>
    </section>
  );
}
