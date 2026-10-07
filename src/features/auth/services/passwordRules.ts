/**
 * Reglas de una contraseña segura.
 *
 * Propósito: marcar cada requisito mientras la persona escribe.
 * Contexto: las mismas categorías que exige el backend de cuentas.
 * @author Cristian Deysdayr Jimenez
 */

export type PasswordRule = {
  id: string;
  label: string;
  met: boolean;
};

const SIGN = /[^\p{L}\p{N}]/u;

/**
 * Evalúa longitud, mayúscula, minúscula, número y signo.
 * @param value - Contraseña en edición.
 * @returns Las cinco reglas, en el orden en que se muestran.
 */
export function passwordRules(value: string): PasswordRule[] {
  const chars = [...value];
  const upper = chars.some((char) => char !== char.toLowerCase() && char === char.toUpperCase());
  const lower = chars.some((char) => char !== char.toUpperCase() && char === char.toLowerCase());
  const digit = chars.some((char) => char >= "0" && char <= "9");
  return [
    { id: "length", label: "8 caracteres", met: value.length >= 8 && value.length <= 72 },
    { id: "upper", label: "Una mayúscula", met: upper },
    { id: "lower", label: "Una minúscula", met: lower },
    { id: "digit", label: "Un número", met: digit },
    { id: "sign", label: "Un signo", met: SIGN.test(value) },
  ];
}
