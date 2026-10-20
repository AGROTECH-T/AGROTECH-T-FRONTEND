/**
 * Chip de identidad de la cuenta.
 *
 * Propósito: mostrar avatar, nombre y rol.
 * Contexto: reutilizado por la barra superior y el pie del menú lateral.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../../features/auth/types/index.ts";

type Props = {
  account: Account;
  withChevron?: boolean;
};

/** @returns La inicial de la persona en mayúscula. */
export function accountInitial(account: Account): string {
  return (account.first_name.trim().charAt(0) || "?").toUpperCase();
}

/** @returns El nombre completo de la persona. */
export function accountName(account: Account): string {
  return `${account.first_name} ${account.last_name}`.trim();
}

/**
 * Identidad compacta de la cuenta activa.
 * @param props - Cuenta y opción de flecha desplegable.
 * @returns Avatar con nombre y rol.
 */
export function AccountChip({ account, withChevron = false }: Readonly<Props>) {
  return (
    <span className="account-chip">
      <span className="account-chip__avatar" aria-hidden="true">
        {accountInitial(account)}
      </span>
      <span className="account-chip__who">
        <span className="account-chip__name">{accountName(account)}</span>
        <span className="account-chip__role">Usuario</span>
      </span>
      {withChevron ? (
        <svg
          className="account-chip__caret"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      ) : null}
    </span>
  );
}
