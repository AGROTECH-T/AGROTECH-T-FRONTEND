/**
 * Verificación obligatoria del correo.
 *
 * Propósito: pedir el código enviado al correo de la cuenta y confirmarlo
 * antes de permitir la entrada a AGROTECH-T.
 * Contexto: se muestra tras el registro (envía el código al montar) y en cada
 * ingreso mientras GET /auth/me devuelva email_verified=false. Reutiliza la
 * escena y las casillas OTP de la recuperación. El código vive solo en el
 * estado de React: nunca en almacenamiento ni en la consola.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useRef, useState } from "react";
import campo from "../../../assets/campo-rocio.png";
import "../../../styles/email-verification.css";
import { readToken } from "../services/session.ts";
import {
  confirmEmailVerification,
  fetchAccount,
  requestEmailVerification,
} from "../services/account.ts";
import {
  CODE_LENGTH,
  codeFromDigits,
  confirmAndReload,
  INCOMPLETE_CODE_MESSAGE,
  RESEND_COOLDOWN_SECONDS,
  requestCode,
  singleFlight,
  type VerificationApi,
  type VerificationError,
} from "../services/verification.ts";
import type { Account } from "../types/index.ts";
import { CodeBoxes } from "./CodeBoxes.tsx";

const defaultApi: VerificationApi = {
  request: requestEmailVerification,
  confirm: confirmEmailVerification,
  fetchAccount,
};

const emptyDigits = () => new Array<string>(CODE_LENGTH).fill("");

type ViewProps = {
  account: Account;
  digits: string[];
  sending: boolean;
  confirming: boolean;
  sent: boolean;
  cooldown: number;
  error: VerificationError | null;
  onDigits: (digits: string[]) => void;
  onConfirm: () => void;
  onResend: () => void;
  onLogout: () => void;
};

/**
 * Vista sin efectos (útil para pruebas estáticas).
 * @param props - Estado visible y acciones.
 * @returns Escena de verificación.
 */
export function EmailVerificationView({
  account,
  digits,
  sending,
  confirming,
  sent,
  cooldown,
  error,
  onDigits,
  onConfirm,
  onResend,
  onLogout,
}: Readonly<ViewProps>) {
  const busy = sending || confirming;
  let resendLabel = sent ? "¿No te llegó el código? Reenviar" : "Enviar código";
  if (sending) resendLabel = "Enviando...";
  else if (cooldown > 0) resendLabel = `Reenviar en ${cooldown} s`;

  return (
    <section className="otp-scene" aria-labelledby="verify-title">
      <img src={campo} alt="" />
      {["uno", "dos", "tres", "cuatro", "cinco"].map((item) => (
        <span key={item} className="otp-fly" />
      ))}
      <form
        className="otp-card verify-card"
        noValidate
        aria-busy={busy}
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <h2 id="verify-title">Verifica tu correo</h2>
        <p>
          {sent
            ? "Enviamos un código de seis cifras a"
            : "Para entrar a AGROTECH-T debes verificar el correo"}
        </p>
        <p className="verify-mail">{account.correo}</p>
        <CodeBoxes digits={digits} onChange={onDigits} />
        {confirming ? (
          <output className="otp-wait">
            <span className="otp-spin" />
            <p>Comprobando el código</p>
          </output>
        ) : null}
        {error ? (
          <p className="verify-error" role="alert">
            {error.message}
          </p>
        ) : null}
        <button type="submit" className="solid" disabled={busy}>
          {confirming ? "Verificando..." : "Verificar correo"}
        </button>
        <button
          type="button"
          className="otp-resend"
          disabled={busy || cooldown > 0}
          onClick={onResend}
        >
          {resendLabel}
        </button>
        <button type="button" className="verify-logout" disabled={confirming} onClick={onLogout}>
          Cerrar sesión
        </button>
      </form>
    </section>
  );
}

type Props = {
  account: Account;
  /** true tras el registro: envía el primer código al montar. */
  autoSend: boolean;
  /** Llamadas HTTP (inyectables en pruebas). */
  api?: VerificationApi;
  onVerified: (account: Account) => void;
  onLogout: () => void;
};

/**
 * Controla el envío, el reenvío y la confirmación del código.
 * @param props - Cuenta sin verificar, envío inicial y salidas.
 * @returns Escena de verificación.
 */
export function EmailVerificationScreen({
  account,
  autoSend,
  api = defaultApi,
  onVerified,
  onLogout,
}: Readonly<Props>) {
  const [digits, setDigits] = useState<string[]>(emptyDigits);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<VerificationError | null>(null);
  const autoSent = useRef(false);
  const alive = useRef(true);
  const send = useRef(singleFlight(() => requestCode(api, readToken())));
  const confirm = useRef(singleFlight((code: string) => confirmAndReload(api, readToken(), code)));

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = globalThis.setTimeout(() => setCooldown((value) => Math.max(value - 1, 0)), 1000);
    return () => globalThis.clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    if (sending || confirming || cooldown > 0) return;
    setSending(true);
    setError(null);
    const result = await send.current();
    if (!alive.current) return;
    setSending(false);
    if (result.status === "sent") {
      setSent(true);
      setDigits(emptyDigits());
      setCooldown(RESEND_COOLDOWN_SECONDS);
      return;
    }
    setError(result.error);
    if (result.error.wait) setCooldown(result.error.wait);
  };

  useEffect(() => {
    if (!autoSend || autoSent.current) return;
    autoSent.current = true;
    void resend();
  }, [autoSend]);

  const submit = async () => {
    if (confirming || sending) return;
    const code = codeFromDigits(digits);
    if (!code) {
      setError({ kind: "incomplete_code", message: INCOMPLETE_CODE_MESSAGE });
      return;
    }
    setConfirming(true);
    setError(null);
    const result = await confirm.current(code);
    if (!alive.current) return;
    setConfirming(false);
    if (result.status === "verified") {
      setDigits(emptyDigits());
      onVerified(result.account);
      return;
    }
    if (result.error.kind === "invalid_code" || result.error.kind === "expired_code") {
      setDigits(emptyDigits());
    }
    setError(result.error);
  };

  return (
    <EmailVerificationView
      account={account}
      digits={digits}
      sending={sending}
      confirming={confirming}
      sent={sent}
      cooldown={cooldown}
      error={error}
      onDigits={(next) => {
        setDigits(next);
        if (error?.kind === "incomplete_code") setError(null);
      }}
      onConfirm={() => void submit()}
      onResend={() => void resend()}
      onLogout={onLogout}
    />
  );
}
