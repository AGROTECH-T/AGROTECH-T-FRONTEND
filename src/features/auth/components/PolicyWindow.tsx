/**
 * Texto legal de términos, privacidad y cookies.
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
 * Ventana con la política. La X cierra.
 * @param props - Tramo al que se abre y cierre.
 * @returns Modal de política y privacidad.
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
          AGROTECH-T trata datos personales para darte la cuenta y operar la
          finca. Este texto explica qué se recoge, para qué y qué puedes pedir.
          Crear la cuenta exige aceptar estos términos: sin ese dato el
          servicio no puede identificarte ni guardar tu trabajo.
        </p>
        <p>
          Se recogen el primer nombre, el primer apellido, el número de
          identificación, el celular y el correo. La contraseña no se guarda
          tal como la escribes: solo queda una huella. También se guarda lo
          que registres en la finca: inventarios, movimientos, galpones, lotes,
          bitácora y las lecturas de los sensores de esa finca. Si invitas a
          otra persona, se usa el correo y el rol que indiques.
        </p>
        <p>
          Esos datos sirven para crear la cuenta, comprobar que eres tú al
          entrar, enviarte el código de acceso o de recuperación, y para que
          inventario, galpón y sensores queden ligados a tu finca. El correo
          también se usa para las invitaciones. No se venden ni se ceden para
          publicidad.
        </p>
        <p>
          El registro es voluntario. La base del tratamiento es tu autorización
          al marcar el cuadro, necesaria para ejecutar el servicio, conforme a
          la Ley 1581 de 2012 de protección de datos personales en Colombia.
          Puedes conocer, actualizar y corregir tu nombre, celular y correo
          desde el perfil. La identificación no se cambia, porque identifica la
          cuenta. Puedes pedir la supresión de la cuenta o revocar esta
          autorización al administrador de AGROTECH-T. Los datos se conservan
          mientras la cuenta siga activa y el tiempo necesario para la
          trazabilidad de la finca.
        </p>
        <p>
          El servicio se aloja para mostrar la aplicación y guardar la
          información. El acceso usa una sesión de esta pestaña. No compartas
          tu contraseña: quien la tenga entra como tú.
        </p>

        <h3 ref={cookiesRef}>Cookies</h3>
        <p>
          AGROTECH-T no usa cookies de seguimiento ni de publicidad. No se
          instala nada de redes de anuncios para medir tu navegación.
        </p>
        <p>
          Lo necesario para funcionar queda en este navegador. La sesión se
          guarda en la pestaña y se borra al cerrarla. Las listas de inventario
          que armes en este equipo pueden quedar guardadas aquí para volver a
          abrirlas. Este aviso también recuerda, en este navegador, que ya lo
          viste, para no volver a mostrarlo.
        </p>
        <p>
          Las letras y el sitio se cargan desde el propio servicio. Cerrar con
          Entendido o con la X solo oculta este aviso. No cambia los datos de
          tu cuenta ni reemplaza la aceptación de los términos al registrarte.
        </p>
      </div>
    </FormWindow>
  );
}
