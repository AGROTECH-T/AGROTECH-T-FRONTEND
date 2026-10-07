/**
 * Formulario de inicio de sesión.
 *
 * Propósito: pedir documento y contraseña y abrir la sesión.
 * Contexto: POST /api/v1/auth/login/ y luego la cuenta autenticada.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { TextField } from "../../../components/ui/TextField.tsx";
import { fetchAccount, login } from "../services/account.ts";
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
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const enter = async () => {
    setPending(true);
    setError("");
    try {
      const body = loginPayload(identification, password);
      const session = await login(body.identification, body.password);
      saveToken(session.token);
      onSuccess(await fetchAccount(session.token));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo ingresar");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        void enter();
      }}
      aria-labelledby="signin-title"
    >
      <h2 id="signin-title">Ingresar</h2>
      {notice ? <p className="notice">{notice}</p> : null}
      <TextField id="login-id" label="Identificación" value={identification} autoComplete="username" onChange={setIdentification} />
      <TextField id="login-password" label="Contraseña" type="password" value={password} autoComplete="current-password" onChange={setPassword} />
      <button type="button" className="text-link" onClick={onForgot}>Olvidé mi contraseña</button>
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <button type="submit" className="solid" disabled={pending}>{pending ? "Ingresando" : "Ingresar"}</button>
    </form>
  );
}
