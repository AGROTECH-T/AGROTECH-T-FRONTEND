/**
 * Bienvenida y primeros pasos (F10.2, F10.3.5).
 *
 * Propósito: ofrecer "Crear una finca" y "Entrar como invitado" a una cuenta
 * verificada que aún no tiene fincas.
 * Distribución: dos paneles (cuenta a la izquierda; opciones o paso abierto a
 * la derecha) sobre el paisaje de fondo. Las opciones usan los mismos navicons
 * del sistema (finca) y el de carta para invitación.
 * Contexto: crear usa el mismo formulario y endpoint que Fincas; el backend
 * vuelve a validar la autorización. Entrar como invitado usa el formulario
 * común de códigos: previsualiza finca, rol y vencimiento, pide confirmación y
 * acepta con el backend; después se relee la cuenta y se abre la finca.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import "../../../styles/invitation-accept.css";
import "../../../styles/onboarding.css";
import fincaIcon from "../../../assets/icons/finca.png";
import invitacionIcon from "../../../assets/icons/invitacion.png";
import { BrandMark } from "../../../components/ui/BrandMark.tsx";
import { FieldIcon } from "../../../components/ui/FieldIcon.tsx";
import type { Account } from "../../auth/types/index.ts";
import { FarmCreateForm } from "../../farms/components/FarmCreateForm.tsx";
import type { Farm } from "../../farms/types/index.ts";
import { InvitationCodeForm } from "../../invitations/components/InvitationCodeForm.tsx";
import { joinedMessage, type CodeApi } from "../../invitations/services/codeFlow.ts";
import type { InvitationAcceptResult, InvitationCodePreview } from "../../invitations/types/index.ts";
import {
  ACCOUNT_LABEL,
  accountName,
  BRAND_TAGLINE,
  createBlockedReason,
  FARM_REDIRECT_DELAY_MS,
  farmCreatedMessage,
  GUEST_LINK_HINT,
  GUEST_PROMPT,
  GUEST_TITLE,
  type JoinedFarm,
  ONBOARDING_OPTIONS,
  type OnboardingOption,
  type OnboardingStep,
  showsFooter,
  VERIFIED_BADGE,
  WELCOME_QUESTION,
  WELCOME_TITLE,
} from "../services/onboarding.ts";

type Actions = {
  onChoose: (step: OnboardingStep) => void;
  onCreated: (farm: Farm) => void;
  onOpenFarm: (farm: Farm) => void;
  onGuestJoined: (result: InvitationAcceptResult, preview: InvitationCodePreview) => void;
  onOpenJoined: (farmId: number) => void;
  onSkip: () => void;
  onLogout: () => void;
};

type ViewProps = Actions & {
  account: Account;
  step: OnboardingStep;
  createdFarm: Farm | null;
  joinedFarm: JoinedFarm | null;
  /** Llamada de creación (inyectable en pruebas). */
  create?: (name: string) => Promise<Farm>;
  /** Llamadas de preview y accept por código (inyectables en pruebas). */
  codeApi?: CodeApi;
};

/** Comprobación de la insignia (SVG local; no forma parte de los iconos compartidos). */
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.3 2.6 2.6 5-5.4" />
    </svg>
  );
}

/** Punto de lista decorativo. */
function PointCheck() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.18" />
      <path d="m6.2 10.2 2.4 2.4 5.2-5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HomeMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M7 10.5V19h10v-8.5" />
    </svg>
  );
}

function LogoutMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path d="M14 12H21" />
      <path d="m18 8 4 4-4 4" />
    </svg>
  );
}

/** Panel izquierdo: marca, correo verificado, saludo y cuenta real (GET /auth/me). */
function IntroPanel({ account }: Readonly<Pick<ViewProps, "account">>) {
  return (
    <section className="panel onboard-intro" aria-labelledby="onboard-title">
      <div className="onboard-brand">
        <BrandMark className="onboard-logo" />
        <div className="onboard-brand__copy">
          <p className="brand">AGROTECH-T</p>
          <p className="onboard-brand__tag">{BRAND_TAGLINE}</p>
        </div>
      </div>
      {account.email_verified ? (
        <div className="onboard-status">
          <span className="onboard-status__bar" aria-hidden="true">
            <span className="onboard-status__fill" />
          </span>
          <p className="onboard-verified" data-verified="">
            <CheckIcon />
            <span>{VERIFIED_BADGE}</span>
          </p>
        </div>
      ) : null}
      <header className="onboard-heading">
        <h2 id="onboard-title">{WELCOME_TITLE}</h2>
        <p>{WELCOME_QUESTION}</p>
      </header>
      <div className="onboard-account" role="group" aria-label={ACCOUNT_LABEL}>
        <span className="onboard-account__mark" aria-hidden="true">
          <FieldIcon name="user" />
        </span>
        <span className="onboard-account__text">
          <span className="onboard-account__name">{accountName(account)}</span>
          <span className="onboard-account__mail">{account.correo}</span>
        </span>
        <span className="onboard-account__chevron" aria-hidden="true">
          ›
        </span>
      </div>
    </section>
  );
}

/** Navicon de cada opción (mismo set que el menú / listado de fincas). */
const OPTION_ICON: Record<OnboardingOption["option"], string> = {
  create: fincaIcon,
  guest: invitacionIcon,
};

/** Tarjeta de acción: un solo control enfocable (el botón), sin controles anidados. */
function ActionCard({
  item,
  onChoose,
}: Readonly<{ item: OnboardingOption } & Pick<Actions, "onChoose">>) {
  const titleId = `onboard-${item.option}-title`;
  const textId = `onboard-${item.option}-text`;
  return (
    <article className="onboard-option" aria-labelledby={titleId}>
      <span className="onboard-option__glow" aria-hidden="true">
        <span className="onboard-option__mark">
          <img src={OPTION_ICON[item.option]} alt="" width={40} height={40} decoding="async" />
        </span>
      </span>
      <div className="onboard-option__body">
        <h3 id={titleId} className="onboard-option__title">
          {item.title}
        </h3>
        <p id={textId} className="onboard-option__text">
          {item.text}
        </p>
        <ul className="onboard-option__points">
          {item.points.map((point) => (
            <li key={point}>
              <PointCheck />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="solid onboard-option__action"
          data-option={item.option}
          aria-describedby={`${titleId} ${textId}`}
          onClick={() => onChoose(item.step)}
        >
          <span>{item.action}</span>
          <span className="onboard-option__arrow" aria-hidden="true">
            →
          </span>
        </button>
      </div>
    </article>
  );
}

function ChooseStep({ onChoose }: Readonly<Pick<Actions, "onChoose">>) {
  return (
    <div className="onboard-options" role="group" aria-label="Opciones de inicio">
      {ONBOARDING_OPTIONS.map((item) => (
        <ActionCard key={item.option} item={item} onChoose={onChoose} />
      ))}
    </div>
  );
}

function CreateStep({
  account,
  create,
  onChoose,
  onCreated,
}: Readonly<Pick<ViewProps, "account" | "create" | "onChoose" | "onCreated">>) {
  const blocked = createBlockedReason(account);
  if (blocked) {
    return (
      <div className="onboard-step" data-step="create-blocked">
        <p className="invite-message is-warn" role="alert">
          {blocked}
        </p>
        <div className="invite-actions">
          <button type="button" className="solid" onClick={() => onChoose("guest")}>
            Entrar como invitado
          </button>
          <button type="button" className="ghost" onClick={() => onChoose("choose")}>
            Volver
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="onboard-step" data-step="create">
      <FarmCreateForm
        title="Crea tu primera finca"
        cancelLabel="Volver"
        create={create}
        onCreated={onCreated}
        onCancel={() => onChoose("choose")}
      />
      <p className="hint">Quedarás como administrador de la finca que crees.</p>
    </div>
  );
}

function GuestStep({
  codeApi,
  onChoose,
  onGuestJoined,
}: Readonly<Pick<ViewProps, "codeApi" | "onChoose" | "onGuestJoined">>) {
  return (
    <div className="onboard-step" data-step="guest">
      <InvitationCodeForm
        title={GUEST_TITLE}
        intro={GUEST_PROMPT}
        hint={GUEST_LINK_HINT}
        cancelLabel="Volver"
        api={codeApi}
        onCancel={() => onChoose("choose")}
        onAccepted={onGuestJoined}
      />
    </div>
  );
}

/**
 * Vista sin efectos de la bienvenida (útil para pruebas estáticas).
 * Dos paneles: a la izquierda la cuenta; a la derecha las opciones o el paso
 * abierto (crear, invitado, finca creada, unido).
 * @param props - Cuenta, paso actual y acciones.
 * @returns Pantalla de bienvenida.
 */
export function OnboardingView(props: Readonly<ViewProps>) {
  const { account, step, createdFarm, joinedFarm, onOpenFarm, onOpenJoined, onSkip, onLogout } = props;
  return (
    <main className="shell onboard-shell">
      <div className="blob blob-a" aria-hidden="true" />
      <div className="blob blob-b" aria-hidden="true" />
      <div className="onboard-layout" data-step={step}>
        <IntroPanel account={account} />
        <section className="panel onboard-actions" aria-label="Primeros pasos" data-step={step}>
          {step === "choose" ? <ChooseStep onChoose={props.onChoose} /> : null}
          {step === "create" ? <CreateStep {...props} /> : null}
          {step === "guest" ? <GuestStep {...props} /> : null}
          {step === "created" && createdFarm ? (
            <div className="onboard-step" data-step="created">
              <p className="invite-message is-ok" role="status">
                {farmCreatedMessage(createdFarm)}
              </p>
              <div className="invite-actions">
                <button type="button" className="solid" onClick={() => onOpenFarm(createdFarm)}>
                  Abrir mi finca
                </button>
              </div>
            </div>
          ) : null}
          {step === "joined" && joinedFarm ? (
            <div className="onboard-step" data-step="joined">
              <p className="invite-message is-ok" role="status">
                {joinedFarm.message}
              </p>
              <div className="invite-actions">
                <button type="button" className="solid" onClick={() => onOpenJoined(joinedFarm.farmId)}>
                  Abrir la finca
                </button>
              </div>
            </div>
          ) : null}
        </section>
        {showsFooter(step) ? (
          <nav className="onboard-footer" aria-label="Salidas">
            <button type="button" className="onboard-footer__link" onClick={onSkip}>
              <HomeMiniIcon />
              Ir al inicio
            </button>
            <button type="button" className="onboard-footer__link" onClick={onLogout}>
              <LogoutMiniIcon />
              Cerrar sesión
            </button>
          </nav>
        ) : null}
      </div>
    </main>
  );
}

type Props = {
  account: Account;
  /** Se llama una sola vez con la finca creada, tras mostrar la confirmación. */
  onFarmCreated: (farm: Farm) => void;
  /** Se llama una sola vez con la finca a la que se unió con un código. */
  onInvitationAccepted: (farmId: number) => void;
  onSkip: () => void;
  onLogout: () => void;
  create?: (name: string) => Promise<Farm>;
  codeApi?: CodeApi;
};

/**
 * Controla los pasos de la bienvenida.
 * @param props - Cuenta, salidas tras crear o unirse, omitir y cerrar sesión.
 * @returns Pantalla de bienvenida.
 */
export function OnboardingScreen({
  account,
  onFarmCreated,
  onInvitationAccepted,
  onSkip,
  onLogout,
  create,
  codeApi,
}: Readonly<Props>) {
  const [step, setStep] = useState<OnboardingStep>("choose");
  const [createdFarm, setCreatedFarm] = useState<Farm | null>(null);
  const [joinedFarm, setJoinedFarm] = useState<JoinedFarm | null>(null);
  const [leftWithJoined, setLeftWithJoined] = useState(false);

  useEffect(() => {
    if (!createdFarm) return;
    const timer = setTimeout(() => onFarmCreated(createdFarm), FARM_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [createdFarm, onFarmCreated]);

  const openJoined = (farmId: number) => {
    // El botón y la espera automática no deben abrir la finca dos veces.
    if (leftWithJoined) return;
    setLeftWithJoined(true);
    onInvitationAccepted(farmId);
  };

  useEffect(() => {
    if (!joinedFarm || leftWithJoined) return;
    const timer = setTimeout(() => openJoined(joinedFarm.farmId), FARM_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  });

  return (
    <OnboardingView
      account={account}
      step={step}
      createdFarm={createdFarm}
      joinedFarm={joinedFarm}
      create={create}
      codeApi={codeApi}
      onChoose={setStep}
      onCreated={(farm) => {
        setCreatedFarm(farm);
        setStep("created");
      }}
      onOpenFarm={onFarmCreated}
      onGuestJoined={(result, preview) => {
        setJoinedFarm({ farmId: result.farm_id, message: joinedMessage(preview, result) });
        setStep("joined");
      }}
      onOpenJoined={openJoined}
      onSkip={onSkip}
      onLogout={onLogout}
    />
  );
}
