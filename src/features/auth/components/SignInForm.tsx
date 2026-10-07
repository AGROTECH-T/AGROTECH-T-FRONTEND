/**
 * Formulario de inicio de sesión.
 *
 * Propósito: pedir documento y contraseña y abrir la sesión.
 * Contexto: POST /api/v1/auth/login/ y luego la cuenta autenticada.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { FieldIcon } from "../../../components/ui/FieldIcon.tsx";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { TextField } from "../../../components/ui/TextField.tsx";
import { fetchAccount, login } from "../services/account.ts";
import { digitsMessage, loginPasswordMessage, reviewField } from "../services/fieldRules.ts";
import { loginPayload } from "../services/payload.ts";
import { saveToken } from "../services/session.ts";
import type { Account } from "../types/index.ts";

type Props = {
  notice: string;
  onForgot: () => void;
  onSuccess: (account: Account) => void;
};

/**
 * Controla el ingreso y muestra el error del backend.
 * @param props - Aviso previo, olvido de clave y sesión creada.
 * @returns Formulario de acceso.
 */
export function SignInForm({ notice, onForgot, onSuccess }: Readonly<Props>) {
  const [identification, setIdentification] = useState("");
  const [password, setPassword] = useState("");
  const [gaps, setGaps] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const notices = useNotices();

  useEffect(() => {
    if (notice) notices.push([notice], "ok");
  }, [notice]);

  const edit = (key: string, setValue: (value: string) => void) => (value: string) => {
    setValue(value);
    setGaps((current) => ({ ...current, [key]: "" }));
  };

  const enter = async () => {
    const next = {
      identification: digitsMessage(identification, "1234567890", 5, 15),
      password: loginPasswordMessage(password),
    };
    setGaps(next);
    const failed = [
      reviewField("identificación", next.identification),
      reviewField("contraseña", next.password),
    ].filter(Boolean);
    if (failed.length) {
      notices.push(failed, "warn");
      return;
    }
    setPending(true);
    try {
      const body = loginPayload(identification, password);
      const session = await login(body.identification, body.password);
      saveToken(session.token);
      onSuccess(await fetchAccount(session.token));
    } catch (cause) {
      notices.push([cause instanceof Error ? cause.message : "No se pudo ingresar"], "warn");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void enter();
      }}
      aria-labelledby="signin-title"
    >
      <div className="form-mark" aria-hidden="true">
        <FieldIcon name="lock" />
      </div>
      <header className="form-intro">
        <h2 id="signin-title">Ingresar</h2>
        <p>Qué bueno verte de nuevo.</p>
      </header>
      <TextField id="login-id" label="N.º de identificación" icon="user" placeholder="1234567890" value={identification} autoComplete="username" message={gaps.identification} onChange={edit("identification", setIdentification)} />
      <TextField id="login-password" label="Contraseña" icon="lock" type="password" value={password} autoComplete="current-password" message={gaps.password} onChange={edit("password", setPassword)} />
      <button type="button" className="text-link" onClick={onForgot}>Olvidé mi contraseña</button>
      <button type="submit" className="solid" disabled={pending}>{pending ? "Ingresando" : "Entrar a mi finca →"}</button>
      <NoticeStack items={notices.items} onClose={notices.close} />
    </form>
  );
}
