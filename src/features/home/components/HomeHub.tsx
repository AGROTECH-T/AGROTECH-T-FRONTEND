/**
 * Hub posterior al ingreso.
 *
 * Propósito: saludar a la persona que inició sesión.
 * Contexto: sección Inicio del shell de escritorio.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../../auth/types/index.ts";
import { homeGreeting, homeTitle } from "../services/homeWelcome.ts";

type Props = {
  account: Account;
};

/**
 * Bienvenida con el nombre y el apellido de la cuenta.
 * @param props - Cuenta activa.
 * @returns Contenido de la sección Inicio.
 */
export function HomeHub({ account }: Readonly<Props>) {
  return (
    <section className="panel panel--home" aria-labelledby="home-title">
      <header className="panel__header">
        <p className="panel__kicker">{homeGreeting()}</p>
        <h1 id="home-title" className="panel__title">
          {homeTitle(account)}
        </h1>
      </header>
    </section>
  );
}
