/**
 * Reglas del onboarding (F10.2, F10.3.5).
 *
 * Propósito: decidir qué opción de la bienvenida está disponible, cerrar la
 * creación de la primera finca y la unión por código de invitación.
 * Contexto: el backend decide si la cuenta puede crear fincas
 * (`can_create_farms` o `can_create_first_farm` en GET /auth/me) y lo vuelve a
 * exigir en POST /farms/. «Entrar como invitado» usa el formulario común de
 * códigos (features/invitations), que previsualiza y acepta contra el backend.
 * @author Cristian Deysdayr Jimenez
 */

import type { Account } from "../../auth/types/index.ts";
import type { Farm } from "../../farms/types/index.ts";
import {
  CODE_EMPTY_MESSAGE,
  CODE_MAX_LENGTH,
  normalizeInvitationCode,
} from "../../invitations/services/codeFlow.ts";

export type OnboardingStep = "choose" | "create" | "guest" | "created" | "joined";

export const WELCOME_TITLE = "¡Bienvenido a AGROTECH-T!";
export const WELCOME_QUESTION = "¿Qué quieres hacer el día de hoy?";
export const GUEST_TITLE = "Entrar como invitado";
export const GUEST_PROMPT = "Introduce el código que recibiste en tu correo electrónico.";
export const GUEST_EMPTY_MESSAGE = CODE_EMPTY_MESSAGE;
export const GUEST_LINK_HINT =
  "Si tu invitación llegó con un enlace, ábrelo desde el correo con esta misma cuenta.";
export const CREATE_BLOCKED_MESSAGE =
  "Tu cuenta no puede crear fincas en este momento: la creación de la primera finca ya " +
  "se usó o se retiró el permiso de crear fincas. Si alguien te invitó a una finca, " +
  "entra como invitado.";
export const UNVERIFIED_BLOCKED_MESSAGE = "Verifica tu correo para crear fincas.";
/** Insignia del panel de bienvenida: solo se muestra con email_verified=true. */
export const VERIFIED_BADGE = "Correo verificado";
export const ACCOUNT_LABEL = "Cuenta con la que entraste";

/** Tarjeta de acción de la bienvenida y el paso que abre. */
export type OnboardingOption = {
  option: "create" | "guest";
  step: Extract<OnboardingStep, "create" | "guest">;
  title: string;
  text: string;
  action: string;
};

export const ONBOARDING_OPTIONS: readonly OnboardingOption[] = [
  {
    option: "create",
    step: "create",
    title: "Crear una finca",
    text: "Registra tu finca y administra tu espacio de trabajo.",
    action: "Crear mi finca",
  },
  {
    option: "guest",
    step: "guest",
    title: "Entrar como invitado",
    text: "Únete a una finca con la invitación que recibiste.",
    action: "Tengo una invitación",
  },
];

/** @returns Nombre completo de la cuenta o, si falta, su identificación. */
export function accountName(account: Pick<Account, "first_name" | "last_name" | "identification">): string {
  return `${account.first_name ?? ""} ${account.last_name ?? ""}`.trim() || account.identification;
}

/** @returns true si el paso muestra el pie («Ir al inicio», «Cerrar sesión»). */
export function showsFooter(step: OnboardingStep): boolean {
  return step !== "created" && step !== "joined";
}
export const GUEST_CODE_MAX_LENGTH = CODE_MAX_LENGTH;
/** Espera antes de abrir la finca recién creada, para leer la confirmación. */
export const FARM_REDIRECT_DELAY_MS = 1500;

type CreationFlags = Pick<Account, "can_create_farms" | "can_create_first_farm" | "email_verified">;

/** @returns true si el backend confirma que la cuenta puede crear una finca ahora. */
export function canCreateFarm(account: CreationFlags): boolean {
  if (!account.email_verified) return false;
  return account.can_create_farms === true || account.can_create_first_farm === true;
}

/** @returns Motivo por el que no se muestra el formulario, o "" si se puede crear. */
export function createBlockedReason(account: CreationFlags): string {
  if (canCreateFarm(account)) return "";
  return account.email_verified ? CREATE_BLOCKED_MESSAGE : UNVERIFIED_BLOCKED_MESSAGE;
}

/** Quita espacios y unifica mayúsculas (la misma regla que el formulario de códigos). */
export const normalizeGuestCode = normalizeInvitationCode;

/** Finca a la que la cuenta acaba de unirse con un código. */
export type JoinedFarm = { farmId: number; message: string };

/** @returns Confirmación visible tras crear la finca. */
export function farmCreatedMessage(farm: Pick<Farm, "name">): string {
  return `Finca «${farm.name}» creada. Ya eres su administrador.`;
}

export type FarmCreatedLanding = { section: "fincas"; farmId: number };

/**
 * Cierra la creación: vuelve a leer /auth/me (la capacidad cambió en el
 * servidor) y prepara la apertura de la finca. Si la relectura falla, se
 * conserva la cuenta anterior; el backend sigue decidiendo en cada petición.
 * @param farm - Finca creada (respuesta 201).
 * @param account - Cuenta en memoria.
 * @param refresh - Lectura de /auth/me.
 */
export async function completeFarmCreation(
  farm: Pick<Farm, "id">,
  account: Account,
  refresh: () => Promise<Account>,
): Promise<{ account: Account; landing: FarmCreatedLanding; refreshed: boolean }> {
  const landing: FarmCreatedLanding = { section: "fincas", farmId: farm.id };
  try {
    return { account: await refresh(), landing, refreshed: true };
  } catch {
    return { account, landing, refreshed: false };
  }
}
