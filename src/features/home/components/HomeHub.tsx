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
  return (
    <section className="panel" aria-labelledby="home-title">
      <header className="panel__header">
        <h1 id="home-title" className="panel__title">
          Hola, {account.first_name}
        </h1>
        <p className="panel__lead">Aquí tienes un resumen de tus fincas y actividades.</p>
      </header>
    </section>
  );
}
