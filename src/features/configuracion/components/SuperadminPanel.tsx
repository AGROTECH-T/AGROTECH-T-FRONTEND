/**
 * Panel del superadmin.
 *
 * Propósito: crear administradores y nombrar o quitar cuentas registradas.
 * Contexto: esas cuentas pasan a tener todos los permisos de la plataforma.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useMemo, useState } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import { TextField } from "../../../components/ui/TextField.tsx";
import { ConfirmModal } from "../../inventario/components/ConfirmModal.tsx";
import { PasswordGuide } from "../../auth/components/PasswordGuide.tsx";
import {
  ACCOUNT_MAX,
  digitsMessage,
  lettersMessage,
  mailMessage,
  passwordMessage,
  reviewField,
  typedMessage,
  type AccountKind,
} from "../../auth/services/fieldRules.ts";
import {
  ADMIN_PAGE_SIZE,
  crearAdministrador,
  fetchAdministradores,
  filtrarCuentas,
  paginaCuentas,
  promoverAdministrador,
  quitarAdministrador,
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

type Confirmacion =
  | { tipo: "promover"; cuenta: CuentaPlataforma }
  | { tipo: "quitar"; cuenta: CuentaPlataforma }
  | null;

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
  const [confirmacion, setConfirmacion] = useState<Confirmacion>(null);
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

  function cambiar(campo: keyof NuevoAdministrador, kind: AccountKind, valor: string) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setHuecos((actual) => ({ ...actual, [campo]: typedMessage(kind, valor) }));
  }

  async function promover(cuenta: CuentaPlataforma) {
    setGuardando(true);
    setError("");
    try {
      const ficha = await promoverAdministrador(cuenta.id);
      setPendientes((lista) => lista.filter((item) => item.id !== cuenta.id));
      setAdministradores((lista) => [...lista, ficha].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      notices.push([`${ficha.nombre} ya es administrador.`], "ok");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "No se pudo nombrar al administrador";
      setError(text);
      notices.push([text], "warn");
    } finally {
      setGuardando(false);
      setConfirmacion(null);
    }
  }

  async function quitar(cuenta: CuentaPlataforma) {
    setGuardando(true);
    setError("");
    try {
      const ficha = await quitarAdministrador(cuenta.id);
      setAdministradores((lista) => lista.filter((item) => item.id !== cuenta.id));
      setPendientes((lista) =>
        [...lista, ficha].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      );
      notices.push([`Se quitó el permiso de administrador a ${ficha.nombre}.`], "ok");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "No se pudo quitar el administrador";
      setError(text);
      notices.push([text], "warn");
    } finally {
      setGuardando(false);
      setConfirmacion(null);
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
      notices.push([`Administrador ${ficha.nombre} creado.`], "ok");
    } catch (cause) {
      const text = cause instanceof Error ? cause.message : "No se pudo crear el administrador";
      setError(text);
      notices.push([text], "warn");
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
              <TextField id="admin-nombre" label="Primer nombre" icon="user" placeholder="Ana" max={ACCOUNT_MAX.name} value={datos.first_name} autoComplete="given-name" message={huecos.first_name} onChange={(valor) => cambiar("first_name", "name", valor)} />
              <TextField id="admin-apellido" label="Primer apellido" icon="user" placeholder="García" max={ACCOUNT_MAX.lastName} value={datos.last_name} autoComplete="family-name" message={huecos.last_name} onChange={(valor) => cambiar("last_name", "lastName", valor)} />
            </div>
            <TextField id="admin-documento" label="N.º de identificación" icon="user" placeholder="1234567890" max={ACCOUNT_MAX.identification} value={datos.identification} autoComplete="off" message={huecos.identification} onChange={(valor) => cambiar("identification", "identification", valor)} />
            <div className="field-row">
              <TextField id="admin-celular" label="Celular" icon="phone" placeholder="3001234567" max={ACCOUNT_MAX.phone} value={datos.phone} autoComplete="tel" message={huecos.phone} onChange={(valor) => cambiar("phone", "phone", valor)} />
              <TextField id="admin-correo" label="Correo" icon="mail" type="email" placeholder="ana@correo.com" max={ACCOUNT_MAX.mail} value={datos.correo} autoComplete="email" message={huecos.correo} onChange={(valor) => cambiar("correo", "mail", valor)} />
            </div>
            <TextField id="admin-clave" label="Contraseña" icon="lock" type="password" max={ACCOUNT_MAX.password} value={datos.password} autoComplete="new-password" message={huecos.password} onChange={(valor) => cambiar("password", "password", valor)} />
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
        accionPromover
        onPromover={(cuenta) => setConfirmacion({ tipo: "promover", cuenta })}
        ocupado={guardando}
      />
      <TablaCuentas
        titulo="Administradores"
        vacio="Todavía no has nombrado administradores."
        filas={administradores}
        accionQuitar
        onQuitar={(cuenta) => setConfirmacion({ tipo: "quitar", cuenta })}
        ocupado={guardando}
      />

      {confirmacion?.tipo === "promover" ? (
        <ConfirmModal
          text={`¿Nombrar administrador a ${confirmacion.cuenta.nombre}? Podrá crear fincas, trabajadores y usar todos los módulos.`}
          confirmLabel="Sí, nombrar"
          closeLabel="No, volver"
          onConfirm={() => void promover(confirmacion.cuenta)}
          onClose={() => setConfirmacion(null)}
        />
      ) : null}

      {confirmacion?.tipo === "quitar" ? (
        <ConfirmModal
          text={`¿Quitar el permiso de administrador a ${confirmacion.cuenta.nombre}? Dejará de poder crear fincas y trabajadores.`}
          confirmLabel="Sí, quitar"
          closeLabel="No, volver"
          onConfirm={() => void quitar(confirmacion.cuenta)}
          onClose={() => setConfirmacion(null)}
        />
      ) : null}
    </section>
  );
}

type TablaProps = {
  titulo: string;
  vacio: string;
  filas: CuentaPlataforma[];
  accionPromover?: boolean;
  accionQuitar?: boolean;
  onPromover?: (cuenta: CuentaPlataforma) => void;
  onQuitar?: (cuenta: CuentaPlataforma) => void;
  ocupado: boolean;
};

/**
 * Tabla con búsqueda y páginas de 5.
 * @param props - Filas y acciones.
 * @returns Bloque de cuentas.
 */
function TablaCuentas({
  titulo,
  vacio,
  filas,
  accionPromover = false,
  accionQuitar = false,
  onPromover,
  onQuitar,
  ocupado,
}: Readonly<TablaProps>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtradas = useMemo(() => filtrarCuentas(filas, query), [filas, query]);
  const pages = Math.max(1, Math.ceil(filtradas.length / ADMIN_PAGE_SIZE));
  const visibles = useMemo(() => paginaCuentas(filtradas, Math.min(page, pages)), [filtradas, page, pages]);
  const conAccion = accionPromover || accionQuitar;

  useEffect(() => {
    setPage(1);
  }, [query, filas.length]);

  return (
    <div className="config-people__block">
      <header className="config-people__block-head">
        <h2>{titulo}</h2>
        <label className="config-people__search">
          <span className="visually-hidden">Buscar en {titulo}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o documento"
          />
        </label>
      </header>

      {filtradas.length === 0 ? (
        <p className="config-people__empty">{query.trim() ? "Nadie coincide con esa búsqueda." : vacio}</p>
      ) : (
        <>
          <div className="config-people__table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Documento</th>
                  <th scope="col">Estado</th>
                  {conAccion ? <th scope="col">Acción</th> : null}
                </tr>
              </thead>
              <tbody>
                {visibles.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">
                      <strong>{item.nombre}</strong>
                      <span>{item.correo || "Sin correo"}</span>
                    </th>
                    <td>{item.identification}</td>
                    <td className={item.activo ? "is-on" : "is-off"}>{item.activo ? "Activo" : "Inactivo"}</td>
                    {conAccion ? (
                      <td>
                        {accionPromover && onPromover ? (
                          <button
                            type="button"
                            className="config-people__link"
                            disabled={ocupado}
                            onClick={() => onPromover(item)}
                          >
                            Nombrar administrador
                          </button>
                        ) : null}
                        {accionQuitar && onQuitar ? (
                          <button
                            type="button"
                            className="config-people__link is-danger"
                            disabled={ocupado}
                            onClick={() => onQuitar(item)}
                          >
                            Quitar administrador
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <nav className="config-people__pager" aria-label={`Páginas de ${titulo}`}>
              <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
                Anterior
              </button>
              <span>
                Página {page} de {pages} · {filtradas.length} cuentas
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={page >= pages}
                onClick={() => setPage((n) => n + 1)}
              >
                Siguiente
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
