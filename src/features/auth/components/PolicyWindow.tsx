/**
 * Texto de privacidad y cookies al crear la cuenta.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useRef } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";

type Part = "terminos" | "cookies";

type Props = {
  part: Part;
  onClose: () => void;
};

/**
 * Ventana con la política y el aviso de cookies.
 * @param props - Tramo visible al abrir y cierre.
 * @returns Modal con la X de la esquina.
 */
export function PolicyWindow({ part, onClose }: Readonly<Props>) {
  const cookiesRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (part === "cookies") cookiesRef.current?.scrollIntoView({ block: "start" });
  }, [part]);

  return (
    <FormWindow title="Política y privacidad" onClose={onClose}>
      <div className="form-window__body policy-text">
        <h3>Términos y condiciones</h3>
        <p>
          AGROTECH-T guarda tu nombre, apellido, identificación, celular y correo
          para crear la cuenta, entrar y recuperar el acceso.
        </p>
        <p>
          La contraseña no se guarda en claro: solo queda una huella. Con la
          cuenta trabajas tu finca: inventario, galpón y sensores.
        </p>
        <p>
          El correo se usa para el código de acceso y las invitaciones de la
          finca. Esos datos no se venden ni se ceden para publicidad.
        </p>
        <h3 ref={cookiesRef}>Cookies</h3>
        <p>
          La sesión se guarda en este navegador mientras la pestaña sigue
          abierta y se borra al cerrarla. No usamos cookies de publicidad ni de
          seguimiento.
        </p>
        <p>
          Algunas listas del inventario pueden quedar en este equipo para
          volver a abrirlas. Aceptar cookies es aceptar ese uso del navegador.
        </p>
      </div>
    </FormWindow>
  );
}
