/**
 * Contratos de la API de cuentas.
 *
 * Propósito: nombrar los datos que viajan entre pantalla y backend.
 * Contexto: registro, sesión y recuperación de AGROTECH-T.
 * @author Cristian Deysdayr Jimenez
 */

export type Mode = "signin" | "signup" | "recover";

export type Account = {
  id: number;
  first_name: string;
  last_name: string;
  identification: string;
  phone: string;
  correo: string;
  is_active: boolean;
  /** Solo lectura: lo decide el backend (GET /api/v1/auth/me/). */
  email_verified: boolean;
  /** Capacidad global de crear fincas (F6, solo lectura). */
  can_create_farms?: boolean;
  /** Puede crear su primera finca por la excepción de onboarding (F10.2, solo lectura). */
  can_create_first_farm?: boolean;
  /** Administra alguna finca, activa o no: habilita "Abrir por identificador". */
  can_open_inactive_farms?: boolean;
};

/** Respuesta de POST /api/v1/auth/email/verification/ (wait = vigencia en segundos). */
export type VerificationRequestResult = {
  ok: boolean;
  wait: number;
};

export type ProfileUpdate = {
  first_name: string;
  last_name: string;
  correo: string;
  phone: string;
};

export type LoginResult = {
  token: string;
};

export type OkResult = {
  ok: boolean;
  wait?: number;
};
