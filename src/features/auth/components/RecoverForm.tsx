/**
 * Recuperación de contraseña.
 *
 * Propósito: pedir el código y fijar una clave nueva.
 * Contexto: correo, WhatsApp o mensaje de texto. Solo uno a la vez.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { BackButton } from "../../../components/ui/BackButton.tsx";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { TextField } from "../../../components/ui/TextField.tsx";
import { postJson } from "../../../services/api/client.ts";
import { ACCOUNT_MAX, digitsMessage, passwordMessage, reviewField, typedMessage } from "../services/fieldRules.ts";
import { CodeStage } from "./CodeStage.tsx";

type Props = {
  onDone: () => void;
  onBack?: () => void;
};

/**
 * Pide el OTP y abre la validación cuando el envío sale.
 * @param props - Vuelta al ingreso cuando el cambio termina.
 * @returns Formulario de recuperación o la escena del código.
 */
export function RecoverForm({ onDone, onBack }: Readonly<Props>) {
  const [identification, setIdentification] = useState("");
  const [method, setMethod] = useState<"correo" | "whatsapp" | "sms">("correo");
  const [sent, setSent] = useState(false);
  const [gap, setGap] = useState("");
  const [pending, setPending] = useState(false);
  const notices = useNotices();

  const sendCode = async () => {
    const message = digitsMessage(identification, "1234567890", 5, 15);
    setGap(message);
    if (message) {
      notices.push([reviewField("identificación", message)], "warn");
      return false;
    }
    setPending(true);
    try {
      await postJson("/api/v1/auth/password/recovery/", { identification, method });
      setSent(true);
      return true;
    } catch (cause) {
      notices.push([cause instanceof Error ? cause.message : "No se pudo recuperar la cuenta"], "warn");
      return false;
    } finally {
      setPending(false);
    }
  };

  const check = async (code: string) => {
    setPending(true);
    try {
      await postJson("/api/v1/auth/password/confirm/", { identification, code });
      return true;
    } catch (cause) {
      notices.push([cause instanceof Error ? cause.message : "Código inválido"], "warn");
      return false;
    } finally {
      setPending(false);
    }
  };

  const confirm = async (code: string, password: string) => {
    const failed = [
      reviewField("código", digitsMessage(code, "123456", 6, 6)),
      reviewField("contraseña", passwordMessage(password)),
    ].filter(Boolean);
    if (failed.length) {
      notices.push(failed, "warn");
      return;
    }
    setPending(true);
    try {
      await postJson("/api/v1/auth/password/reset/", { identification, code, password });
      onDone();
    } catch (cause) {
      notices.push([cause instanceof Error ? cause.message : "No se pudo recuperar la cuenta"], "warn");
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <>
        <CodeStage
          pending={pending}
          onBack={() => setSent(false)}
          onResend={sendCode}
          onCheck={check}
          onConfirm={(code, password) => void confirm(code, password)}
        />
        <NoticeStack items={notices.items} onClose={notices.close} />
      </>
    );
  }

  return (
    <form
      className="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void sendCode();
      }}
      aria-labelledby="recover-title"
    >
      {onBack ? <BackButton onClick={onBack} /> : null}
      <h2 id="recover-title">Recuperar acceso</h2>
      <TextField id="recover-id" label="N.º de identificación" icon="user" placeholder="1234567890" max={ACCOUNT_MAX.identification} value={identification} autoComplete="username" message={gap} onChange={(value) => { setIdentification(value); setGap(typedMessage("identification", value)); }} />
      <fieldset className="choices">
        <legend>Enviar código por</legend>
        <label><input type="radio" name="method" checked={method === "correo"} onChange={() => setMethod("correo")} /> Correo</label>
        <label><input type="radio" name="method" checked={method === "whatsapp"} onChange={() => setMethod("whatsapp")} /> WhatsApp</label>
        <label><input type="radio" name="method" checked={method === "sms"} onChange={() => setMethod("sms")} /> Mensaje de texto</label>
      </fieldset>
      <button type="submit" className="solid" disabled={pending}>Enviar código</button>
      <NoticeStack items={notices.items} onClose={notices.close} />
    </form>
  );
}
