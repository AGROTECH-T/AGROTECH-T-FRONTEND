/**
 * Casillas del código de seis cifras.
 *
 * Propósito: capturar cada dígito y pasar al siguiente.
 * Contexto: pantalla de validación OTP.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useRef } from "react";

const BOX_IDS = ["otp-1", "otp-2", "otp-3", "otp-4", "otp-5", "otp-6"] as const;

type Props = {
  digits: string[];
  onChange: (digits: string[]) => void;
};

/**
 * Renderiza las seis casillas numéricas.
 * @param props - Dígitos actuales y cambio.
 * @returns Fila de casillas.
 */
export function CodeBoxes({ digits, onChange }: Readonly<Props>) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    boxes.current[0]?.focus();
  }, []);

  const write = (index: number, raw: string) => {
    const only = raw.replace(/\D/g, "");
    const next = [...digits];
    if (only.length > 1) {
      only.slice(0, digits.length).split("").forEach((char, offset) => {
        if (index + offset < digits.length) next[index + offset] = char;
      });
    } else {
      next[index] = only.slice(-1);
    }
    onChange(next);
    const missing = next.findIndex((item) => !item);
    boxes.current[missing === -1 ? digits.length - 1 : missing]?.focus();
  };

  return (
    <div className="otp-boxes">
      {BOX_IDS.map((id, index) => (
        <input
          key={id}
          ref={(node) => { boxes.current[index] = node; }}
          className={digits[index] ? "filled" : undefined}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Dígito ${index + 1} de ${digits.length}`}
          value={digits[index] ?? ""}
          onChange={(event) => write(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !digits[index] && index > 0) {
              boxes.current[index - 1]?.focus();
            }
          }}
        />
      ))}
    </div>
  );
}
