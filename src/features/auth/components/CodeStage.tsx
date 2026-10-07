/**
 * Validación visual del código.
 *
 * Propósito: comprobar las seis cifras y después pedir la clave.
 * Contexto: el código vigente caduca a los cinco minutos.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useRef, useState } from "react";
import campo from "../../../assets/campo-rocio.png";
import { TextField } from "../../../components/ui/TextField.tsx";
import { CodeBoxes } from "./CodeBoxes.tsx";
import { PasswordGuide } from "./PasswordGuide.tsx";

const LENGTH = 6;
const LIFE = 300;
const RESEND = 10;
type Phase = "code" | "checking" | "verified" | "password";

type Props = {
  pending: boolean;
  onBack: () => void;
  onResend: () => Promise<boolean>;
  onCheck: (code: string) => Promise<boolean>;
  onConfirm: (code: string, password: string) => void;
};

/**
 * Comprueba el código y, si es válido, abre la contraseña nueva.
 * @param props - Reenvío, validación, confirmación y vuelta atrás.
 * @returns Escena de validación.
 */
export function CodeStage({ pending, onBack, onResend, onCheck, onConfirm }: Readonly<Props>) {
  const [digits, setDigits] = useState<string[]>(() => Array(LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [phase, setPhase] = useState<Phase>("code");
  const [resendIn, setResendIn] = useState(RESEND);
  const [left, setLeft] = useState(LIFE);
  const alive = useRef(true);
  const code = digits.join("");

  useEffect(() => {
    const timer = globalThis.setInterval(() => {
      setResendIn((value) => Math.max(value - 1, 0));
      setLeft((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => {
      alive.current = false;
      globalThis.clearInterval(timer);
    };
  }, []);

  const review = async (value: string) => {
    setPhase("checking");
    const started = Date.now();
    const ok = await onCheck(value);
    const pause = 800 - (Date.now() - started);
    if (pause > 0) await new Promise((resolve) => globalThis.setTimeout(resolve, pause));
    if (!alive.current) return;
    if (!ok) {
      setDigits(Array(LENGTH).fill(""));
      setPhase("code");
      return;
    }
    setPhase("verified");
    globalThis.setTimeout(() => {
      if (alive.current) setPhase("password");
    }, 900);
  };

  const publish = (next: string[]) => {
    setDigits(next);
    if (next.every(Boolean) && phase === "code" && left > 0) void review(next.join(""));
  };

  const resend = async () => {
    if (resendIn > 0 || pending || phase !== "code") return;
    const ok = await onResend();
    if (!ok) return;
    setDigits(Array(LENGTH).fill(""));
    setPhase("code");
    setResendIn(RESEND);
    setLeft(LIFE);
  };

  const goBack = () => {
    if (phase === "password") {
      setPassword("");
      setDigits(Array(LENGTH).fill(""));
      setPhase("code");
      return;
    }
    if (phase === "code") onBack();
  };

  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;

  return (
    <section className="otp-scene" aria-labelledby="otp-title">
      <img src={campo} alt="" />
      {["uno", "dos", "tres", "cuatro", "cinco"].map((item) => <span key={item} className="otp-fly" />)}
      <form className="otp-card" noValidate onSubmit={(event) => { event.preventDefault(); if (phase === "password") onConfirm(code, password); }}>
        {phase === "code" || phase === "password" ? (
          <button type="button" className="otp-back" onClick={goBack}>← Volver atrás</button>
        ) : null}
        <h2 id="otp-title">Valida tu código</h2>
        <p>{left > 0 ? `Caduca en ${clock}. Si pides otro, este deja de servir.` : "Este código caducó. Pide uno nuevo."}</p>
        {phase === "code" ? <CodeBoxes digits={digits} onChange={publish} /> : null}
        {phase === "checking" ? <div className="otp-wait" role="status"><span className="otp-spin" /><p>Comprobando el código</p></div> : null}
        {phase === "verified" || phase === "password" ? <div className="otp-success" role="status"><span className="otp-mark">✓</span><p>Código verificado</p></div> : null}
        {phase === "code" ? (
          <button type="button" className="otp-resend" disabled={resendIn > 0 || pending} onClick={() => void resend()}>
            {resendIn > 0 ? `Reenviar en ${resendIn} s` : "¿No te llegó el código? Reenviar"}
          </button>
        ) : null}
        {phase === "password" ? (
          <div className="otp-next">
            <TextField id="new-password" label="Nueva contraseña" icon="lock" type="password" value={password} autoComplete="new-password" onChange={setPassword} />
            {password ? <PasswordGuide value={password} /> : null}
            <button type="submit" className="solid" disabled={pending}>Cambiar contraseña</button>
          </div>
        ) : null}
      </form>
    </section>
  );
}
