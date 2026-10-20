/**
 * Menú de perfil de la cuenta.
 *
 * Propósito: ver todos los datos de la persona y cerrar sesión.
 * Contexto: barra superior del shell autenticado.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../../features/auth/types/index.ts";
import { AccountChip, accountInitial, accountName } from "./AccountChip.tsx";

type Props = {
  account: Account;
  open: boolean;
  onToggle: () => void;
  onLogout: () => void;
};

/**
 * Abre el panel con los datos de la cuenta activa.
 * @param props - Cuenta, estado abierto y acciones.
 * @returns Chip disparador y panel de perfil.
 */
export function ProfileMenu({ account, open, onToggle, onLogout }: Readonly<Props>) {
  return (
    <div className="profile-menu">
      <button
        type="button"
        className="profile-menu__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={onToggle}
      >
        <AccountChip account={account} withChevron />
      </button>
      {open ? (
        <div className="profile-menu__panel" role="menu">
          <header className="profile-menu__header">
            <span className="profile-menu__avatar is-large" aria-hidden="true">
              {accountInitial(account)}
            </span>
            <p className="profile-menu__title">{accountName(account)}</p>
            <p className="profile-menu__meta">Usuario</p>
          </header>
          <dl className="profile-menu__data">
            <div className="profile-menu__row">
              <dt>Identificación</dt>
              <dd>{account.identification}</dd>
            </div>
            <div className="profile-menu__row">
              <dt>Correo</dt>
              <dd>{account.correo}</dd>
            </div>
            <div className="profile-menu__row">
              <dt>Celular</dt>
              <dd>{account.phone}</dd>
            </div>
          </dl>
          <div className="profile-menu__actions">
            <button type="button" className="profile-menu__cancel" role="menuitem" onClick={onToggle}>
              Cancelar
            </button>
            <button
              type="button"
              className="profile-menu__logout"
              role="menuitem"
              onClick={onLogout}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
