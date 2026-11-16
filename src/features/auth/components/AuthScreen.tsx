/**
 * Pantalla de acceso.
 *
 * Propósito: componer el panel de cultivo y el formulario activo.
 * Contexto: ingreso, registro, recuperación y sesión.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (account) return;
    document.body.classList.add("is-auth");
    return () => document.body.classList.remove("is-auth");
  }, [account]);

  const leave = async () => {
    const token = readToken();
    if (token) await logout(token).catch(() => undefined);
    clearToken();
    setAccount(null);
    setMode("signin");
  };

  if (account) {
    return (
      <HomeScreen account={account} onAccountChange={setAccount} onLogout={() => void leave()} />
    );
  }

  let form = (
    <SignInForm
      notice={notice}
      onForgot={() => setMode("recover")}
      onSignUp={() => setMode("signup")}
      onSuccess={setAccount}
    />
  );
  if (mode === "signup") {
    form = (
      <SignUpForm onSignIn={() => setMode("signin")} onSuccess={setAccount} />
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
    <WelcomeSide mode={mode === "signup" ? "signup" : "signin"} />
  );

  return (
    <main className="shell">
      <div className="blob blob-a" aria-hidden="true" />
      <div className="blob blob-b" aria-hidden="true" />
      <div className={mode === "signup" ? "auth-card is-signup" : "auth-card is-signin"}>
        <div className="auth-slot auth-slot--form">{form}</div>
        <div className="auth-slot auth-slot--welcome">{welcome}</div>
      </div>
    </main>
  );
}
