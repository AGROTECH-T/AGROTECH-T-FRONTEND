/**
 * Pantalla de acceso.
 *
 * Propósito: componer el panel de cultivo y el formulario activo, y decidir
 * la etapa: restauración, verificación, invitación, bienvenida o shell.
 * Contexto: ingreso, registro, recuperación y sesión. Al recargar recupera la
 * sesión de la pestaña con GET /auth/me (sessionRestore.ts) y la renueva
 * mientras hay actividad (sessionRenewal.ts). Si se llegó desde el enlace de
 * una invitación, conserva el token durante el login y la verificación y
 * muestra la aceptación antes que nada. Sin fincas ni invitación, muestra la
 * bienvenida del onboarding (F10.2).
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSection } from "../../../components/layout/index.ts";
import { listFarms } from "../../farms/services/farmsApi.ts";
import type { Farm } from "../../farms/types/index.ts";
import { HomeScreen } from "../../home/components/HomeScreen.tsx";
import {
  clearPendingInvitation,
  InvitationAcceptScreen,
  takePendingInvitation,
} from "../../invitations/index.ts";
import { completeFarmCreation, OnboardingScreen } from "../../onboarding/index.ts";
import { fetchAccount, logout, renewSession } from "../services/account.ts";
import { authStage, farmAccessFrom, type FarmAccess } from "../services/authStage.ts";
import { clearToken, readToken, saveToken } from "../services/session.ts";
import { createSessionRenewer, startActivityRenewal } from "../services/sessionRenewal.ts";
import { restoreSession, SESSION_ENDED_NOTICE } from "../services/sessionRestore.ts";
import type { Account, Mode } from "../types/index.ts";
import { EmailVerificationScreen } from "./EmailVerificationScreen.tsx";
import { RecoverForm } from "./RecoverForm.tsx";
import { SessionStatusView } from "./SessionStatusView.tsx";
import { SignInForm } from "./SignInForm.tsx";
import { SignUpForm } from "./SignUpForm.tsx";
import { WelcomeSide } from "./WelcomeSide.tsx";

export const INVITATION_LOGIN_NOTICE =
  "Inicia sesión con la cuenta del correo invitado para aceptar la invitación.";
export const FARM_CHECK_MESSAGE = "Estamos revisando tus fincas...";
export const FARM_CHECK_FAILED_MESSAGE =
  "No pudimos revisar tus fincas. Revisa tu conexión e inténtalo de nuevo.";

type Landing = { section: AppSection; farmId?: number };
/** restoring: comprobando el token de la pestaña; failed: no se pudo saber. */
type SessionCheck = "restoring" | "failed" | "done";

/** @returns Aviso de sesión terminada, recordando la invitación si la hay. */
export function sessionEndedNotice(hasInvitation: boolean): string {
  return hasInvitation ? `${SESSION_ENDED_NOTICE} ${INVITATION_LOGIN_NOTICE}` : SESSION_ENDED_NOTICE;
}

/**
 * Alterna los paneles y conserva la cuenta en memoria.
 * @returns Página principal de autenticación.
 */
export function AuthScreen() {
  const [invitation, setInvitation] = useState<string | null>(() => takePendingInvitation());
  const [session, setSession] = useState<SessionCheck>(() => (readToken() ? "restoring" : "done"));
  const [restoreError, setRestoreError] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [notice, setNotice] = useState(() => (invitation ? INVITATION_LOGIN_NOTICE : ""));
  const [account, setAccount] = useState<Account | null>(null);
  const [restored, setRestored] = useState(false);
  const [farmAccess, setFarmAccess] = useState<FarmAccess>("unknown");
  const [landing, setLanding] = useState<Landing | null>(null);
  const [justRegistered, setJustRegistered] = useState(false);
  // Contadores de solicitud: solo se aplica la respuesta más reciente
  // (StrictMode repite efectos; un cierre de sesión invalida lo pendiente).
  const restoreRun = useRef(0);
  const farmCheck = useRef(0);
  const formFirst = mode === "signup";
  const signedIn = account !== null;
  const hasInvitation = invitation !== null;

  const resetToAccess = useCallback((message: string) => {
    restoreRun.current += 1;
    farmCheck.current += 1;
    setAccount(null);
    setRestored(false);
    setFarmAccess("unknown");
    setLanding(null);
    setJustRegistered(false);
    setMode("signin");
    setNotice(message);
  }, []);

  // Restauración: un solo GET /auth/me por recarga; nunca abre otra sesión.
  useEffect(() => {
    if (session !== "restoring") return;
    const id = ++restoreRun.current;
    void restoreSession().then((result) => {
      if (restoreRun.current !== id) return;
      if (result.kind === "restored") {
        setAccount(result.account);
        setRestored(true);
        setSession("done");
      } else if (result.kind === "failed") {
        setRestoreError(result.message);
        setSession("failed");
      } else {
        if (result.kind === "expired") setNotice(sessionEndedNotice(hasInvitation));
        setSession("done");
      }
    });
  }, [session, hasInvitation]);

  // Renovación por actividad mientras hay cuenta; un 401 cierra la sesión local.
  useEffect(() => {
    if (!signedIn) return;
    const renewer = createSessionRenewer({
      readToken,
      saveToken,
      renew: renewSession,
      onExpired: () => {
        clearToken();
        resetToAccess(sessionEndedNotice(hasInvitation));
      },
    });
    return startActivityRenewal({ renewer, renewSoon: restored });
  }, [signedIn, restored, hasInvitation, resetToAccess]);

  const stage = authStage(account, invitation, farmAccess);

  // Acceso a fincas: decide entre bienvenida e inicio sin volver al onboarding
  // a quien ya tiene fincas.
  useEffect(() => {
    if (!account || stage !== "checking" || farmAccess !== "unknown") return;
    const id = ++farmCheck.current;
    listFarms()
      .then((farms) => {
        if (farmCheck.current === id) setFarmAccess(farmAccessFrom(farms, account));
      })
      .catch(() => {
        if (farmCheck.current === id) setFarmAccess("error");
      });
  }, [account, stage, farmAccess]);

  const leave = async () => {
    const token = readToken();
    resetToAccess(invitation ? INVITATION_LOGIN_NOTICE : "");
    if (token) await logout(token).catch(() => undefined);
    clearToken();
  };

  const signIn = (next: Account) => {
    farmCheck.current += 1;
    setRestored(false);
    setFarmAccess("unknown");
    setAccount(next);
  };

  const closeInvitation = useCallback((next: Landing | null) => {
    clearPendingInvitation();
    setInvitation(null);
    setLanding(next);
    // Con destino en Fincas la cuenta ya es miembro; sin destino se comprueba.
    if (next) setFarmAccess("some");
  }, []);

  const openAcceptedFarm = useCallback(
    (farmId: number) => closeInvitation({ section: "fincas", farmId }),
    [closeInvitation],
  );

  const finishFarmCreation = useCallback(
    (farm: Pick<Farm, "id">) => {
      if (!account) return;
      const current = account;
      const id = farmCheck.current;
      void completeFarmCreation(farm, current, () => fetchAccount(readToken())).then((result) => {
        // Si se cerró la sesión mientras tanto, no se reabre.
        if (farmCheck.current !== id) return;
        setAccount(result.account);
        setLanding(result.landing);
        setFarmAccess("some");
      });
    },
    [account],
  );

  // F10.3.5: tras unirse con un código se relee /auth/me y se abre la finca,
  // igual que tras crear la primera finca.
  const finishInvitationCode = useCallback(
    (farmId: number) => finishFarmCreation({ id: farmId }),
    [finishFarmCreation],
  );

  if (session === "restoring") {
    return (
      <SessionStatusView title="Un momento" message="Comprobando tu sesión..." tone="busy" />
    );
  }

  if (session === "failed") {
    return (
      <SessionStatusView
        title="No pudimos comprobar tu sesión"
        message={restoreError}
        tone="warn"
        actions={[
          { label: "Reintentar", onClick: () => setSession("restoring") },
          {
            label: "Iniciar sesión de nuevo",
            variant: "ghost",
            onClick: () => {
              const token = readToken();
              clearToken();
              if (token) void logout(token).catch(() => undefined);
              setSession("done");
            },
          },
        ]}
      />
    );
  }

  // Bloqueo de navegación: sin email_verified=true (GET /auth/me) no se entra.
  // El backend exige además el correo verificado para crear fincas y aceptar
  // invitaciones.
  if (account && stage === "verify") {
    return (
      <EmailVerificationScreen
        account={account}
        autoSend={justRegistered}
        onVerified={(verified) => {
          setJustRegistered(false);
          setAccount(verified);
        }}
        onLogout={() => void leave()}
      />
    );
  }

  if (account && invitation && stage === "invitation") {
    return (
      <InvitationAcceptScreen
        account={account}
        token={invitation}
        onAccepted={openAcceptedFarm}
        onGoToFarms={() => closeInvitation({ section: "fincas" })}
        onSwitchAccount={() => void leave()}
        onDiscard={() => closeInvitation(null)}
      />
    );
  }

  if (account && stage === "checking") {
    const failed = farmAccess === "error";
    return (
      <SessionStatusView
        title={failed ? "No pudimos revisar tus fincas" : "Un momento"}
        message={failed ? FARM_CHECK_FAILED_MESSAGE : FARM_CHECK_MESSAGE}
        tone={failed ? "warn" : "busy"}
        actions={
          failed
            ? [
                { label: "Reintentar", onClick: () => setFarmAccess("unknown") },
                { label: "Ir al inicio", variant: "ghost", onClick: () => setFarmAccess("dismissed") },
                { label: "Cerrar sesión", variant: "text-link", onClick: () => void leave() },
              ]
            : []
        }
      />
    );
  }

  if (account && stage === "welcome") {
    return (
      <OnboardingScreen
        account={account}
        onFarmCreated={finishFarmCreation}
        onInvitationAccepted={finishInvitationCode}
        onSkip={() => setFarmAccess("dismissed")}
        onLogout={() => void leave()}
      />
    );
  }

  if (account && stage === "home") {
    return (
      <HomeScreen
        account={account}
        onAccountChange={setAccount}
        onLogout={() => void leave()}
        initialSection={landing?.section}
        initialFarmId={landing?.farmId}
      />
    );
  }

  let form = (
    <SignInForm notice={notice} onForgot={() => setMode("recover")} onSuccess={signIn} />
  );
  if (mode === "signup") {
    form = (
      <SignUpForm
        onSuccess={(created) => {
          setJustRegistered(true);
          signIn(created);
        }}
      />
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
