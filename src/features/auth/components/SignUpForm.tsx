/**
 * Formulario de registro.
 *
 * Propósito: crear la cuenta con documento y un canal de recuperación.
 * Contexto: POST /api/v1/accounts/.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { TextField } from "../../../components/ui/TextField.tsx";
import { postJson } from "../../../services/api/client.ts";

type Props = {
  onCreated: () => void;
};

/**
 * Envía el alta y avisa cuando la cuenta queda creada.
 * @param props - Callback al recibir 201.
 * @returns Formulario de registro.
 */
export function SignUpForm({ onCreated }: Readonly<Props>) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identification, setIdentification] = useState("");
  const [phone, setPhone] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const register = async () => {
    setPending(true);
    setError("");
    try {
      await postJson("/api/v1/accounts/", {
        first_name: firstName,
        last_name: lastName,
        identification,
        phone,
        correo,
        password,
      });
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la cuenta");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="form signup"
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
        <TextField id="first-name" label="Primer nombre" icon="user" value={firstName} autoComplete="given-name" onChange={setFirstName} />
        <TextField id="last-name" label="Primer apellido" icon="user" value={lastName} autoComplete="family-name" onChange={setLastName} />
      </div>
      <TextField id="signup-id" label="N.º de identificación" icon="user" value={identification} autoComplete="off" onChange={setIdentification} />
      <div className="field-row">
        <TextField id="phone" label="Celular" icon="phone" value={phone} autoComplete="tel" onChange={setPhone} />
        <TextField id="correo" label="Correo" icon="mail" type="email" value={correo} autoComplete="email" onChange={setCorreo} />
      </div>
      <TextField id="signup-password" label="Contraseña" icon="lock" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
      <p className="hint">8 caracteres, con mayúscula, minúscula, número y un signo. Celular o correo, al menos uno.</p>
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <button type="submit" className="solid" disabled={pending}>{pending ? "Creando" : "Crear cuenta"}</button>
    </form>
  );
}
