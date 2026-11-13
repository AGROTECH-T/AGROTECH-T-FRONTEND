/**
 * Formulario para crear una cuenta de finca.
 *
 * Propósito: pedir los datos básicos, el rol y los permisos extra.
 * Contexto: lo abre el administrador desde Roles y permisos.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useMemo, useState } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { TextField } from "../../../components/ui/TextField.tsx";
import { PasswordGuide } from "../../auth/components/PasswordGuide.tsx";
import { digitsMessage, lettersMessage, mailMessage, passwordMessage, reviewField } from "../../auth/services/fieldRules.ts";
import { ROL_NOMBRE, ROLES_ORDEN } from "../services/catalogo.ts";
import type { CatalogoRoles, FincaAsignable, NuevoUsuario, RolId } from "../types/index.ts";

type Props = {
  fincas: FincaAsignable[];
  catalogo: CatalogoRoles | null;
  guardando: boolean;
  error?: string;
  onCancelar: () => void;
  onCrear: (datos: NuevoUsuario) => void;
};

type Huecos = {
  first_name: string;
  last_name: string;
  identification: string;
  phone: string;
  correo: string;
  password: string;
};

const VACIO: NuevoUsuario = {
  first_name: "",
  last_name: "",
  identification: "",
  correo: "",
  phone: "",
  password: "",
  farm_ids: [],
  role: "operador",
  permisos: [],
};

const SIN_HUECOS: Huecos = {
  first_name: "",
  last_name: "",
  identification: "",
  phone: "",
  correo: "",
  password: "",
};

/**
 * Formulario de alta con rol y permisos adicionales.
 * @param props - Fincas del administrador y catálogo de permisos.
 * @returns Formulario de creación.
 */
export function FormularioUsuario({ fincas, catalogo, guardando, error = "", onCancelar, onCrear }: Readonly<Props>) {
  const [datos, setDatos] = useState<NuevoUsuario>(VACIO);
  const [huecos, setHuecos] = useState<Huecos>(SIN_HUECOS);
  const notices = useNotices();

  const extras = useMemo(
    () => (catalogo?.asignables ?? []).filter((permiso) => !rolYaPermite(catalogo, datos.role, permiso.id)),
    [catalogo, datos.role],
  );

  useEffect(() => {
    if (error) notices.push([error], "warn");
  }, [error]);

  function cambiar(campo: keyof Huecos, valor: string) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setHuecos((actual) => ({ ...actual, [campo]: "" }));
  }

  function alternarPermiso(id: string) {
    setDatos((actual) => ({
      ...actual,
      permisos: actual.permisos.includes(id)
        ? actual.permisos.filter((item) => item !== id)
        : [...actual.permisos, id],
    }));
  }

  function alternarFinca(id: number) {
    setDatos((actual) => ({
      ...actual,
      farm_ids: actual.farm_ids.includes(id)
        ? actual.farm_ids.filter((item) => item !== id)
        : [...actual.farm_ids, id],
    }));
  }

  function cambiarRol(role: RolId) {
    setDatos((actual) => ({
      ...actual,
      role,
      permisos: actual.permisos.filter((id) => !rolYaPermite(catalogo, role, id)),
    }));
  }

  function enviar() {
    const next: Huecos = {
      first_name: lettersMessage(datos.first_name, "Ana"),
      last_name: lettersMessage(datos.last_name, "García"),
      identification: digitsMessage(datos.identification, "1234567890", 5, 15),
      phone: digitsMessage(datos.phone, "3001234567", 7, 15),
      correo: mailMessage(datos.correo),
      password: passwordMessage(datos.password),
    };
    setHuecos(next);
    const failed = [
      reviewField("primer nombre", next.first_name),
      reviewField("primer apellido", next.last_name),
      reviewField("identificación", next.identification),
      reviewField("celular", next.phone),
      reviewField("correo", next.correo),
      reviewField("contraseña", next.password),
    ].filter(Boolean);
    if (failed.length || !datos.farm_ids.length) {
      notices.push(failed.length ? failed : ["Elige al menos una finca."], "warn");
      return;
    }
    onCrear(datos);
  }

  return (
    <FormWindow title="Crear usuario" onClose={onCancelar}>
      <form
        className="form signup config-account"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          enviar();
        }}
        aria-labelledby="nuevo-usuario-title"
      >
        <header className="form-intro">
          <h2 id="nuevo-usuario-title">Crear usuario</h2>
          <p>Los mismos datos de una cuenta, más la finca y el rol.</p>
        </header>
        <div className="field-row">
          <TextField id="nuevo-nombre" label="Primer nombre" icon="user" placeholder="Ana" value={datos.first_name} autoComplete="given-name" message={huecos.first_name} onChange={(valor) => cambiar("first_name", valor)} />
          <TextField id="nuevo-apellido" label="Primer apellido" icon="user" placeholder="García" value={datos.last_name} autoComplete="family-name" message={huecos.last_name} onChange={(valor) => cambiar("last_name", valor)} />
        </div>
        <TextField id="nuevo-documento" label="N.º de identificación" icon="user" placeholder="1234567890" value={datos.identification} autoComplete="off" message={huecos.identification} onChange={(valor) => cambiar("identification", valor)} />
        <div className="field-row">
          <TextField id="nuevo-celular" label="Celular" icon="phone" placeholder="3001234567" value={datos.phone} autoComplete="tel" message={huecos.phone} onChange={(valor) => cambiar("phone", valor)} />
          <TextField id="nuevo-correo" label="Correo" icon="mail" type="email" placeholder="ana@correo.com" value={datos.correo} autoComplete="email" message={huecos.correo} onChange={(valor) => cambiar("correo", valor)} />
        </div>
        <TextField id="nuevo-clave" label="Contraseña" icon="lock" type="password" value={datos.password} autoComplete="new-password" message={huecos.password} onChange={(valor) => cambiar("password", valor)} />
        {datos.password ? <PasswordGuide value={datos.password} /> : null}

        <fieldset className="config-account__extras">
          <legend>Fincas</legend>
          <div>
            {fincas.map((finca) => (
              <FilaAsignar
                key={finca.id}
                nombre={finca.name}
                activo={datos.farm_ids.includes(finca.id)}
                onClick={() => alternarFinca(finca.id)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="choices config-account__roles">
          <legend>Rol</legend>
          <div>
            {ROLES_ORDEN.map((role) => (
              <button
                key={role}
                type="button"
                className={datos.role === role ? "is-on" : undefined}
                onClick={() => cambiarRol(role)}
              >
                {ROL_NOMBRE[role]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="config-account__extras">
          <legend>Permisos adicionales</legend>
          {extras.length ? (
            <div>
              {extras.map((permiso) => (
                <FilaAsignar
                  key={permiso.id}
                  nombre={permiso.nombre}
                  activo={datos.permisos.includes(permiso.id)}
                  onClick={() => alternarPermiso(permiso.id)}
                />
              ))}
            </div>
          ) : (
            <p>Este rol ya cubre los permisos que se pueden sumar.</p>
          )}
        </fieldset>

        <button type="submit" className="solid" disabled={guardando}>
          {guardando ? "Creando" : "Crear usuario"}
        </button>
        <button type="button" className="text-link" onClick={onCancelar}>Cancelar</button>
        <NoticeStack items={notices.items} onClose={notices.close} />
      </form>
    </FormWindow>
  );
}

function FilaAsignar({ nombre, activo, onClick }: Readonly<{ nombre: string; activo: boolean; onClick: () => void }>) {
  return (
    <button type="button" className={activo ? "config-pick is-on" : "config-pick"} aria-pressed={activo} onClick={onClick}>
      <span>{nombre}</span>
      <span className="config-pick__action">Asignar</span>
    </button>
  );
}

function rolYaPermite(catalogo: CatalogoRoles | null, role: RolId, permisoId: string): boolean {
  const permiso = catalogo?.permisos.find((item) => item.id === permisoId);
  return permiso?.por_rol[role].estado === "permitido";
}
