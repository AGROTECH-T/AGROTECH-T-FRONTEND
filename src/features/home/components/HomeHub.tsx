/**
 * Hub posterior al ingreso.
 *
 * Propósito: saludar a la persona que inició sesión.
 * Contexto: sección Inicio del shell de escritorio.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../../auth/types/index.ts";

type Props = {
  account: Account;
};

/**
 * Bienvenida breve con el nombre de la cuenta.
 * @param props - Cuenta activa.
 * @returns Contenido de la sección Inicio.
 */
export function HomeHub({ account }: Readonly<Props>) {
  const pendiente = !account.is_superadmin && !account.is_administrador && account.modulos.length <= 1;
  return (
    <section className="panel" aria-labelledby="home-title">
      <header className="panel__header">
        <h1 id="home-title" className="panel__title">
          Hola, {account.first_name}
        </h1>
        {pendiente ? null : (
          <p className="panel__lead">
            {account.is_superadmin
              ? "Desde Configuración nombra a los administradores."
              : "Aquí tienes un resumen de tus fincas y actividades."}
          </p>
        )}
      </header>
    </section>
  );
}
