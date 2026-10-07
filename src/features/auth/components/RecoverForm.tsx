/**
 * Recuperación de contraseña.
 *
 * Propósito: pedir el código y fijar una clave nueva.
 * Contexto: correo o WhatsApp, según el canal que tenga la cuenta.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { TextField } from "../../../components/ui/TextField.tsx";
import { postJson } from "../../../services/api/client.ts";

type Props = {
  onDone: () => void;
};

/**
 * Pide el OTP y, en el segundo paso, cambia la contraseña.
 * @param props - Vuelta al ingreso cuando el cambio termina.
 * @returns Formulario de recuperación.
 */
export function RecoverForm({ onDone }: Readonly<Props>) {
  const [identification, setIdentification] = useState("");
  const [method, setMethod] = useState<"correo" | "whatsapp">("correo");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const recover = async () => {
    setPending(true);
    setError("");
    try {
      if (sent) {
        await postJson("/api/v1/auth/password/reset/", { identification, code, password });
        onDone();
      } else {
        await postJson("/api/v1/auth/password/recovery/", { identification, method });
        setSent(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo recuperar la cuenta");
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="form"
      onSubmit={(event) => {
        event.preventDefault();
        void recover();
      }}
      aria-labelledby="recover-title"
    >
      <h2 id="recover-title">Recuperar acceso</h2>
      <TextField id="recover-id" label="Identificación" icon="user" value={identification} autoComplete="username" onChange={setIdentification} />
      {sent ? (
        <>
          <TextField id="code" label="Código" icon="lock" value={code} autoComplete="one-time-code" onChange={setCode} />
          <TextField id="new-password" label="Nueva contraseña" icon="lock" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
        </>
      ) : (
        <fieldset className="choices">
          <legend>Enviar código por</legend>
          <label><input type="radio" name="method" checked={method === "correo"} onChange={() => setMethod("correo")} /> Correo</label>
          <label><input type="radio" name="method" checked={method === "whatsapp"} onChange={() => setMethod("whatsapp")} /> WhatsApp</label>
        </fieldset>
      )}
      {error ? <p className="alert" role="alert">{error}</p> : null}
      <button type="submit" className="solid" disabled={pending}>{sent ? "Cambiar contraseña" : "Enviar código"}</button>
    </form>
  );
}
