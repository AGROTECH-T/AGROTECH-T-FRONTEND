/**
 * Pantalla de acceso.
 *
 * Propósito: componer el panel de cultivo y el formulario activo.
 * Contexto: ingreso, registro, recuperación y sesión.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { logout } from "../services/account.ts";
import { clearToken, readToken } from "../services/session.ts";
import type { Account, Mode } from "../types/index.ts";
import { HomeScreen } from "../../home/components/HomeScreen.tsx";
import { RecoverForm } from "./RecoverForm.tsx";
import { SignInForm } from "./SignInForm.tsx";
import { SignUpForm } from "./SignUpForm.tsx";
import { WelcomeSide } from "./WelcomeSide.tsx";

/**
 * Alterna los paneles y conserva la cuenta en memoria.
 * @returns Página principal de autenticación.
 */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("signin");
  const [notice, setNotice] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const formFirst = mode !== "signup";

  const leave = async () => {
    const token = readToken();
    if (token) await logout(token).catch(() => undefined);
    clearToken();
    setAccount(null);
    setMode("signin");
  };

  if (account) {
    return <HomeScreen onLogout={() => void leave()} />;
  }

  let form = (
    <SignInForm notice={notice} onForgot={() => setMode("recover")} onSuccess={setAccount} />
  );
  if (mode === "signup") {
    form = (
      <SignUpForm />
    );
  } else if (mode === "recover") {
    form = (
      <RecoverForm
        onBack={() => setMode("signin")}
        onDone={() => {
          setNotice("Contraseña actualizada.");
          setMode("signin");
        }}
      />
    );
  }

  const welcome = (
    <WelcomeSide
      mode={mode === "signup" ? "signup" : "signin"}
      onSwitch={() => setMode(mode === "signup" ? "signin" : "signup")}
    />
  );

  return (
    <main className={formFirst ? "shell signin" : "shell signup"}>
      <div className="blob blob-a" aria-hidden="true" />
      <div className="blob blob-b" aria-hidden="true" />
      {formFirst ? form : welcome}
      {formFirst ? welcome : form}
    </main>
  );
}
