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
import { digitsMessage, lettersMessage, mailMessage, passwordMessage, reviewField } from "../services/fieldRules.ts";
import { PasswordGuide } from "./PasswordGuide.tsx";

type Gaps = Record<string, string>;

/**
 * Envía el alta cuando todos los campos están completos.
 * @returns Formulario de registro.
 */
export function SignUpForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [identification, setIdentification] = useState("");
  const [phone, setPhone] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [gaps, setGaps] = useState<Gaps>({});
  const [pending, setPending] = useState(false);
  const notices = useNotices();

  const edit = (key: string, setValue: (value: string) => void) => (value: string) => {
    setValue(value);
    setGaps((current) => ({ ...current, [key]: "" }));
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
      notices.push(["Cuenta creada con éxito."], "ok");
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
        <TextField id="first-name" label="Primer nombre" icon="user" placeholder="Ana" value={firstName} autoComplete="given-name" message={gaps.firstName} onChange={edit("firstName", setFirstName)} />
        <TextField id="last-name" label="Primer apellido" icon="user" placeholder="García" value={lastName} autoComplete="family-name" message={gaps.lastName} onChange={edit("lastName", setLastName)} />
      </div>
      <TextField id="signup-id" label="N.º de identificación" icon="user" placeholder="1234567890" value={identification} autoComplete="off" message={gaps.identification} onChange={edit("identification", setIdentification)} />
      <div className="field-row">
        <TextField id="phone" label="Celular" icon="phone" placeholder="3001234567" value={phone} autoComplete="tel" message={gaps.phone} onChange={edit("phone", setPhone)} />
        <TextField id="correo" label="Correo" icon="mail" type="email" placeholder="ana@correo.com" value={correo} autoComplete="email" message={gaps.correo} onChange={edit("correo", setCorreo)} />
      </div>
      <TextField id="signup-password" label="Contraseña" icon="lock" type="password" value={password} autoComplete="new-password" message={gaps.password} onChange={edit("password", setPassword)} />
      {password ? <PasswordGuide value={password} /> : null}
      <button type="submit" className="solid" disabled={pending}>{pending ? "Creando" : "Crear cuenta"}</button>
      <NoticeStack items={notices.items} onClose={notices.close} />
    </form>
  );
}
