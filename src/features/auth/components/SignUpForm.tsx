/**
 * Formulario de registro.
 *
 * Propósito: crear la cuenta con documento y un canal de recuperación.
 * Contexto: POST /api/v1/accounts/.
 * @author Cristian Deysdayr Jimenez
 */

import { useState, type SubmitEvent } from "react";
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

  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
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
    <form className="form" onSubmit={submit} aria-labelledby="signup-title">
      <h2 id="signup-title">Crear cuenta</h2>
      <TextField id="first-name" label="Nombre" value={firstName} autoComplete="given-name" onChange={setFirstName} />
      <TextField id="last-name" label="Apellido" value={lastName} autoComplete="family-name" onChange={setLastName} />
      <TextField id="signup-id" label="Identificación" value={identification} autoComplete="off" onChange={setIdentification} />
      <TextField id="phone" label="Celular" value={phone} autoComplete="tel" onChange={setPhone} />
      <TextField id="correo" label="Correo" type="email" value={correo} autoComplete="email" onChange={setCorreo} />
      <TextField id="signup-password" label="Contraseña" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
      <p className="hint">Usa 8 caracteres, mayúscula, minúscula, número y un signo. Celular o correo, al menos uno.</p>
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <button type="submit" className="solid" disabled={pending}>{pending ? "Creando" : "Crear cuenta"}</button>
    </form>
  );
}
