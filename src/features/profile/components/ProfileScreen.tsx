/**
 * Pantalla "Mi perfil".
 *
 * Propósito: consultar y editar la identidad y los datos de contacto.
 * Contexto: se abre desde el chip de la cuenta en el menú lateral.
 * @author Cristian Deysdayr Jimenez
 */

import { useState, type FormEvent } from "react";
import { accountInitial, accountName } from "../../../components/layout/index.ts";
import { FieldIcon } from "../../../components/ui/FieldIcon.tsx";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { TextField } from "../../../components/ui/TextField.tsx";
import { updateAccount } from "../../auth/services/account.ts";
import {
  digitsMessage,
  lettersMessage,
  mailMessage,
  reviewField,
} from "../../auth/services/fieldRules.ts";
import { readToken } from "../../auth/services/session.ts";
import type { Account, ProfileUpdate } from "../../auth/types/index.ts";
import { ProfileField } from "./ProfileField.tsx";

type Props = {
  account: Account;
  onAccountChange: (account: Account) => void;
};

type Gaps = Partial<Record<keyof ProfileUpdate, string>>;

/**
 * Copia los campos editables de una cuenta.
 * @param account - Cuenta autenticada.
 * @returns Borrador listo para el formulario.
 */
function draft(account: Account): ProfileUpdate {
  return {
    first_name: account.first_name,
    last_name: account.last_name,
    correo: account.correo,
    phone: account.phone,
  };
}

/**
 * Revisa cada campo editable y devuelve su aviso.
 * @param form - Datos escritos en el formulario.
 * @returns Mensajes por campo; vacío si todo es válido.
 */
function review(form: ProfileUpdate): Gaps {
  return {
    first_name: lettersMessage(form.first_name, "Ana"),
    last_name: lettersMessage(form.last_name, "García"),
    correo: mailMessage(form.correo),
    phone: digitsMessage(form.phone, "3001234567", 7, 15),
  };
}

/**
 * Identidad y datos de contacto, con edición de nombre, correo y celular.
 * @param props - Cuenta autenticada y notificación del cambio.
 * @returns Sección Mi perfil.
 */
export function ProfileScreen({ account, onAccountChange }: Readonly<Props>) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProfileUpdate>(() => draft(account));
  const [gaps, setGaps] = useState<Gaps>({});
  const notices = useNotices();

  const active = account.is_active;
  const statusClass = active ? "profile-status is-on" : "profile-status is-off";

  const edit = (key: keyof ProfileUpdate) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setGaps((current) => ({ ...current, [key]: "" }));
  };

  const start = () => {
    setForm(draft(account));
    setGaps({});
    setEditing(true);
  };

  const stop = () => {
    setGaps({});
    setEditing(false);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const next = review(form);
    setGaps(next);
    const failed = [
      reviewField("primer nombre", next.first_name ?? ""),
      reviewField("primer apellido", next.last_name ?? ""),
      reviewField("correo", next.correo ?? ""),
      reviewField("celular", next.phone ?? ""),
    ].filter(Boolean);
    if (failed.length) {
      notices.push(failed, "warn");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateAccount(readToken(), form);
      onAccountChange(updated);
      notices.push(["Perfil actualizado."], "ok");
      setEditing(false);
    } catch (cause) {
      notices.push([cause instanceof Error ? cause.message : "No se pudo guardar"], "warn");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel profile-page" aria-labelledby="perfil-title">
      <header className="profile-page__head">
        <h1 id="perfil-title" className="panel__title">
          Mi perfil
        </h1>
        <p className="panel__lead">Tus datos en AGROTECH-T.</p>
      </header>

      <div className="profile-layout">
        <article className="profile-identity">
          <span className="profile-identity__avatar" aria-hidden="true">
            {accountInitial(account)}
          </span>
          <h2 className="profile-identity__name">{accountName(account)}</h2>
          <p className="profile-identity__mail">{account.correo}</p>
          <span className={statusClass}>{active ? "Usuario activo" : "Usuario inactivo"}</span>
          {editing ? null : (
            <button type="button" className="profile-identity__edit" onClick={start}>
              Editar datos
            </button>
          )}
        </article>

        {editing ? (
          <form className="profile-form" noValidate onSubmit={(event) => void save(event)}>
            <header className="profile-section__head">
              <span className="profile-section__icon" aria-hidden="true">
                <FieldIcon name="user" />
              </span>
              <h2 id="perfil-editar" className="profile-section__title">
                Editar datos
              </h2>
            </header>
            <div className="profile-form__grid">
              <TextField
              id="perfil-nombres"
              label="Primer nombre"
                icon="user"
                value={form.first_name}
                autoComplete="given-name"
                message={gaps.first_name}
                onChange={edit("first_name")}
              />
              <TextField
              id="perfil-apellidos"
              label="Primer apellido"
                icon="user"
                value={form.last_name}
                autoComplete="family-name"
                message={gaps.last_name}
                onChange={edit("last_name")}
              />
              <TextField
                id="perfil-correo"
                label="Correo"
                type="email"
                icon="mail"
                value={form.correo}
                autoComplete="email"
                message={gaps.correo}
                onChange={edit("correo")}
              />
              <TextField
                id="perfil-celular"
                label="Celular"
                icon="phone"
                value={form.phone}
                autoComplete="tel"
                message={gaps.phone}
                onChange={edit("phone")}
              />
              <div className="field profile-form__locked">
                <label htmlFor="perfil-documento">Documento</label>
                <span className="field-box">
                  <FieldIcon name="id" />
                  <input
                    id="perfil-documento"
                    className="with-icon"
                    type="text"
                    value={account.identification}
                    readOnly
                  />
                </span>
                <p className="profile-form__hint">El documento no se puede cambiar.</p>
              </div>
            </div>
            <div className="profile-form__actions">
              <button type="button" className="profile-form__cancel" onClick={stop} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Guardando" : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <section className="profile-card" aria-labelledby="perfil-contacto">
            <header className="profile-section__head">
              <span className="profile-section__icon" aria-hidden="true">
                <FieldIcon name="id" />
              </span>
              <h2 id="perfil-contacto" className="profile-section__title">
                Datos de contacto
              </h2>
            </header>
            <ul className="profile-card__list">
              <ProfileField icon="id" label="Documento" value={account.identification} />
              <ProfileField icon="mail" label="Correo" value={account.correo} />
              <ProfileField icon="phone" label="Celular" value={account.phone} />
            </ul>
          </section>
        )}
      </div>

      <NoticeStack items={notices.items} onClose={notices.close} />
    </section>
  );
}
