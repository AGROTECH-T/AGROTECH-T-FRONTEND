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
  onEdit?: () => void;
};

type PanelProps = {
  account: Account;
  onCancel: () => void;
  onLogout: () => void;
  onEdit?: () => void;
};

/**
 * Tarjeta de la cuenta: datos, cancelar y cerrar sesión.
 * En celular y tablet también lleva Editar.
 * @param props - Cuenta y acciones del panel.
 * @returns Panel de la cuenta.
 */
export function AccountPanel({ account, onCancel, onLogout, onEdit }: Readonly<PanelProps>) {
  const actions = onEdit ? "profile-menu__actions has-edit" : "profile-menu__actions";
  return (
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
      <div className={actions}>
        {onEdit ? (
          <button type="button" className="profile-menu__cancel profile-menu__edit" role="menuitem" onClick={onEdit}>
            Editar
          </button>
        ) : null}
        <button type="button" className="profile-menu__cancel" role="menuitem" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="profile-menu__logout" role="menuitem" onClick={onLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/**
 * Abre la tarjeta de la cuenta junto a la campana.
 * @param props - Cuenta, estado abierto y acciones.
 * @returns Chip disparador y panel de perfil.
 */
export function ProfileMenu({ account, open, onToggle, onLogout, onEdit }: Readonly<Props>) {
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
        <AccountPanel account={account} onCancel={onToggle} onLogout={onLogout} onEdit={onEdit} />
      ) : null}
    </div>
  );
}
