/**
 * Formulario de registro.
 *
 * Propósito: crear la cuenta con documento, celular y correo.
 * Contexto: POST /api/v1/accounts/.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { TextField } from "../../../components/ui/TextField.tsx";
import { postJson } from "../../../services/api/client.ts";
import { fetchAccount, login } from "../services/account.ts";
import { ACCOUNT_MAX, digitsMessage, lettersMessage, mailMessage, passwordMessage, reviewField, typedMessage, type AccountKind } from "../services/fieldRules.ts";
import { loginPayload } from "../services/payload.ts";
import { saveToken } from "../services/session.ts";
import type { Account } from "../types/index.ts";
import { PasswordGuide } from "./PasswordGuide.tsx";
import { PolicyWindow } from "./PolicyWindow.tsx";

type Gaps = Record<string, string>;

type Props = {
  onSignIn: () => void;
  onSuccess: (account: Account) => void;
};

/**
 * Envía el alta y abre la sesión cuando todos los campos están completos.
 * @param props - Vuelta al ingreso y sesión creada al terminar el registro.
 * @returns Formulario de registro.
 */
export function SignUpForm({ onSignIn, onSuccess }: Readonly<Props>) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identification, setIdentification] = useState("");
  const [phone, setPhone] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [gaps, setGaps] = useState<Gaps>({});
  const [pending, setPending] = useState(false);
  const [terms, setTerms] = useState(false);
  const [policy, setPolicy] = useState(false);
  const notices = useNotices();

  const edit = (key: string, kind: AccountKind, setValue: (value: string) => void) => (value: string) => {
    setValue(value);
    setGaps((current) => ({ ...current, [key]: typedMessage(kind, value) }));
  };

  const register = async () => {
    const next = {
      firstName: lettersMessage(firstName, "Ana"),
      lastName: lettersMessage(lastName, "García"),
      identification: digitsMessage(identification, "1234567890", 5, 15),
      phone: digitsMessage(phone, "3001234567", 7, 15),
      correo: mailMessage(correo),
      password: passwordMessage(password),
    };
    setGaps(next);
    const failed = [
      reviewField("primer nombre", next.firstName),
      reviewField("primer apellido", next.lastName),
      reviewField("identificación", next.identification),
      reviewField("celular", next.phone),
      reviewField("correo", next.correo),
      reviewField("contraseña", next.password),
    ].filter(Boolean);
    if (!terms) failed.push("Acepta los términos y condiciones para crear la cuenta.");
    if (failed.length) {
      notices.push(failed, "warn");
      return;
    }
    setPending(true);
    try {
      await postJson("/api/v1/accounts/", {
        first_name: firstName,
        last_name: lastName,
        identification,
        phone,
        correo,
        password,
      });
      const body = loginPayload(identification, password);
      const session = await login(body.identification, body.password);
      saveToken(session.token);
      onSuccess(await fetchAccount(session.token));
    } catch (cause) {
      notices.push([cause instanceof Error ? cause.message : "No se pudo crear la cuenta"], "warn");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="form signup"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void register();
      }}
      aria-labelledby="signup-title"
    >
      <header className="form-intro">
        <h2 id="signup-title">Crear cuenta</h2>
        <p>Unos datos y ya puedes entrar a tu finca.</p>
      </header>
      <div className="field-row">
        <TextField id="first-name" label="Primer nombre" icon="user" placeholder="Ana" max={ACCOUNT_MAX.name} value={firstName} autoComplete="given-name" message={gaps.firstName} onChange={edit("firstName", "name", setFirstName)} />
        <TextField id="last-name" label="Primer apellido" icon="user" placeholder="García" max={ACCOUNT_MAX.lastName} value={lastName} autoComplete="family-name" message={gaps.lastName} onChange={edit("lastName", "lastName", setLastName)} />
      </div>
      <TextField id="signup-id" label="N.º de identificación" icon="user" placeholder="1234567890" max={ACCOUNT_MAX.identification} value={identification} autoComplete="off" message={gaps.identification} onChange={edit("identification", "identification", setIdentification)} />
      <div className="field-row">
        <TextField id="phone" label="Celular" icon="phone" placeholder="3001234567" max={ACCOUNT_MAX.phone} value={phone} autoComplete="tel" message={gaps.phone} onChange={edit("phone", "phone", setPhone)} />
        <TextField id="correo" label="Correo" icon="mail" type="email" placeholder="ana@correo.com" max={ACCOUNT_MAX.mail} value={correo} autoComplete="email" message={gaps.correo} onChange={edit("correo", "mail", setCorreo)} />
      </div>
      <TextField id="signup-password" label="Contraseña" icon="lock" type="password" max={ACCOUNT_MAX.password} value={password} autoComplete="new-password" message={gaps.password} onChange={edit("password", "password", setPassword)} />
      {password ? <PasswordGuide value={password} /> : null}
      <div className="signup-consent">
        <label>
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
          />
          <span>Acepto los</span>
        </label>
        <button type="button" onClick={() => setPolicy(true)}>
          términos y condiciones
        </button>
        <span className="signup-required" title="Obligatorio">
          *<span className="visually-hidden"> obligatorio</span>
        </span>
      </div>
      <button type="submit" className="solid" disabled={pending}>
        {pending ? "Creando" : "+ Crear cuenta"}
      </button>
      <button type="button" className="auth-switch" onClick={onSignIn}>
        <svg className="auth-switch__arrow" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M14.5 5.5 8 12l6.5 6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Ingresar con mi cuenta
      </button>
      <NoticeStack items={notices.items} onClose={notices.close} />
      {policy ? <PolicyWindow part="terminos" onClose={() => setPolicy(false)} /> : null}
    </form>
  );
}
