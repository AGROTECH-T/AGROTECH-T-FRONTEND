/**
 * Panel del superadmin.
 *
 * Propósito: crear administradores y nombrar cuentas que ya se registraron.
 * Contexto: esas cuentas pasan a tener todos los permisos de la plataforma.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { TextField } from "../../../components/ui/TextField.tsx";
import { PasswordGuide } from "../../auth/components/PasswordGuide.tsx";
import {
  digitsMessage,
  lettersMessage,
  mailMessage,
  passwordMessage,
  reviewField,
} from "../../auth/services/fieldRules.ts";
import {
  crearAdministrador,
  fetchAdministradores,
  promoverAdministrador,
  type CuentaPlataforma,
  type NuevoAdministrador,
} from "../services/administradores.ts";

const VACIO: NuevoAdministrador = {
  first_name: "",
  last_name: "",
  identification: "",
  correo: "",
  phone: "",
  password: "",
};

/**
 * Listado de pendientes, administradores y alta.
 * @returns Panel de nombramiento.
 */
export function SuperadminPanel() {
  const [pendientes, setPendientes] = useState<CuentaPlataforma[]>([]);
  const [administradores, setAdministradores] = useState<CuentaPlataforma[]>([]);
  const [crear, setCrear] = useState(false);
  const [datos, setDatos] = useState<NuevoAdministrador>(VACIO);
  const [huecos, setHuecos] = useState(VACIO);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const notices = useNotices();

  useEffect(() => {
    let activo = true;
    fetchAdministradores()
      .then((data) => {
        if (!activo) return;
        setPendientes(data.pendientes);
        setAdministradores(data.administradores);
      })
      .catch((cause: unknown) => {
        if (activo) setError(cause instanceof Error ? cause.message : "No se pudo cargar");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  function cambiar(campo: keyof NuevoAdministrador, valor: string) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setHuecos((actual) => ({ ...actual, [campo]: "" }));
  }

  async function promover(userId: number) {
    setGuardando(true);
    setError("");
    try {
      const ficha = await promoverAdministrador(userId);
      setPendientes((lista) => lista.filter((item) => item.id !== userId));
      setAdministradores((lista) => [...lista, ficha].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo nombrar al administrador");
    } finally {
      setGuardando(false);
    }
  }

  async function enviar() {
    const next = {
      first_name: lettersMessage(datos.first_name, "Ana"),
      last_name: lettersMessage(datos.last_name, "García"),
      identification: digitsMessage(datos.identification, "1234567890", 5, 15),
      phone: datos.phone ? digitsMessage(datos.phone, "3001234567", 7, 15) : "",
      correo: mailMessage(datos.correo),
      password: passwordMessage(datos.password),
    };
    setHuecos(next);
    const failed = [
      reviewField("primer nombre", next.first_name),
      reviewField("primer apellido", next.last_name),
      reviewField("identificación", next.identification),
      reviewField("correo", next.correo),
      reviewField("contraseña", next.password),
      next.phone ? reviewField("celular", next.phone) : "",
    ].filter(Boolean);
    if (failed.length) {
      notices.push(failed, "warn");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const ficha = await crearAdministrador(datos);
      setAdministradores((lista) => [...lista, ficha].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setDatos(VACIO);
      setCrear(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el administrador");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="config-state">Cargando cuentas...</p>;

  return (
    <section className="config-people" aria-labelledby="superadmin-title">
      <NoticeStack items={notices.items} onClose={notices.close} />
      <p id="superadmin-title" className="config-note">
        El administrador que nombres puede crear fincas, trabajadores y usar todos los módulos.
      </p>
      {error ? <p className="config-assign__error">{error}</p> : null}
      <div className="config-people__bar">
        <button type="button" className="btn-primary config-people__create" onClick={() => setCrear(true)}>
          Crear administrador
        </button>
      </div>

      {crear ? (
        <FormWindow title="Crear administrador" onClose={() => setCrear(false)}>
          <form
            className="form signup config-account"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void enviar();
            }}
          >
            <header className="form-intro">
              <h2>Crear administrador</h2>
              <p>Queda con todos los permisos para crear fincas y trabajadores.</p>
            </header>
            <div className="field-row">
              <TextField id="admin-nombre" label="Primer nombre" icon="user" placeholder="Ana" value={datos.first_name} autoComplete="given-name" message={huecos.first_name} onChange={(valor) => cambiar("first_name", valor)} />
              <TextField id="admin-apellido" label="Primer apellido" icon="user" placeholder="García" value={datos.last_name} autoComplete="family-name" message={huecos.last_name} onChange={(valor) => cambiar("last_name", valor)} />
            </div>
            <TextField id="admin-documento" label="N.º de identificación" icon="user" placeholder="1234567890" value={datos.identification} autoComplete="off" message={huecos.identification} onChange={(valor) => cambiar("identification", valor)} />
            <div className="field-row">
              <TextField id="admin-celular" label="Celular" icon="phone" placeholder="3001234567" value={datos.phone} autoComplete="tel" message={huecos.phone} onChange={(valor) => cambiar("phone", valor)} />
              <TextField id="admin-correo" label="Correo" icon="mail" type="email" placeholder="ana@correo.com" value={datos.correo} autoComplete="email" message={huecos.correo} onChange={(valor) => cambiar("correo", valor)} />
            </div>
            <TextField id="admin-clave" label="Contraseña" icon="lock" type="password" value={datos.password} autoComplete="new-password" message={huecos.password} onChange={(valor) => cambiar("password", valor)} />
            {datos.password ? <PasswordGuide value={datos.password} /> : null}
            <button type="submit" className="btn-primary" disabled={guardando}>
              Guardar administrador
            </button>
          </form>
        </FormWindow>
      ) : null}

      <TablaCuentas
        titulo="Cuentas en espera"
        vacio="Nadie está esperando. Las personas que se registren aparecen aquí."
        filas={pendientes}
        accion="Nombrar administrador"
        onAccion={promover}
        ocupado={guardando}
      />
      <TablaCuentas
        titulo="Administradores"
        vacio="Todavía no has nombrado administradores."
        filas={administradores}
        ocupado={guardando}
      />
    </section>
  );
}

type TablaProps = {
  titulo: string;
  vacio: string;
  filas: CuentaPlataforma[];
  accion?: string;
  onAccion?: (id: number) => void;
  ocupado: boolean;
};

function TablaCuentas({ titulo, vacio, filas, accion, onAccion, ocupado }: Readonly<TablaProps>) {
  return (
    <div className="config-people__table">
      <h2 className="config-note">{titulo}</h2>
      {filas.length === 0 ? <p className="config-note">{vacio}</p> : null}
      {filas.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Documento</th>
              <th scope="col">Estado</th>
              {accion ? <th scope="col">Acción</th> : null}
            </tr>
          </thead>
          <tbody>
            {filas.map((item) => (
              <tr key={item.id}>
                <th scope="row">
                  <strong>{item.nombre}</strong>
                  <span>{item.correo || "Sin correo"}</span>
                </th>
                <td>{item.identification}</td>
                <td className={item.activo ? "is-on" : "is-off"}>{item.activo ? "Activo" : "Inactivo"}</td>
                {accion && onAccion ? (
                  <td>
                    <button
                      type="button"
                      className="config-people__link"
                      disabled={ocupado}
                      onClick={() => onAccion(item.id)}
                    >
                      {accion}
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
