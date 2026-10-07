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
};

export type LoginResult = {
  token: string;
};

export type OkResult = {
  ok: boolean;
  wait?: number;
};
