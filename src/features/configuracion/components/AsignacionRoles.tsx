/**
 * Listado de personas y acceso a sus permisos.
 *
 * Propósito: buscar usuarios, crearlos y abrir Ver permisos.
 * Contexto: Roles y permisos de Configuración.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useMemo, useState } from "react";
import { inicialesPersona, ROL_NOMBRE } from "../services/catalogo.ts";
import {
  agregarPermiso,
  cambiarEstado,
  cambiarRol,
  crearUsuario,
  fetchAsignacion,
  fetchPersona,
  fetchRolesPermisos,
  quitarPermiso,
} from "../services/rolesPermisos.ts";
import type { CatalogoRoles, FincaAsignable, NuevoUsuario, RolId, UsuarioAsignado } from "../types/index.ts";
import { DetallePermisos } from "./DetallePermisos.tsx";
import { FormularioUsuario } from "./FormularioUsuario.tsx";

type Vista = "lista" | "detalle" | "crear";

/**
 * Pantalla de usuarios, alta y detalle de permisos.
 * @returns Roles y permisos.
 */
export function AsignacionRoles() {
  const [usuarios, setUsuarios] = useState<UsuarioAsignado[]>([]);
  const [fincas, setFincas] = useState<FincaAsignable[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoRoles | null>(null);
  const [puedo, setPuedo] = useState(true);
  const [vista, setVista] = useState<Vista>("lista");
  const [persona, setPersona] = useState<UsuarioAsignado | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    Promise.all([fetchAsignacion(), fetchRolesPermisos()])
      .then(([personas, roles]) => {
        if (!activo) return;
        setPuedo(personas.puedo_asignar);
        setUsuarios(personas.usuarios);
        setFincas(personas.fincas ?? []);
        setCatalogo(roles);
      })
      .catch((cause: unknown) => {
        if (activo) setError(cause instanceof Error ? cause.message : "No se pudo cargar las personas");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return usuarios;
    return usuarios.filter((item) =>
      `${item.nombre} ${item.identification} ${item.correo}`.toLowerCase().includes(texto),
    );
  }, [busqueda, usuarios]);

  async function abrir(userId: number) {
    setGuardando(true);
    setError("");
    try {
      setPersona(await fetchPersona(userId));
      setVista("detalle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo abrir los permisos");
    } finally {
      setGuardando(false);
    }
  }

  async function guardar(accion: () => Promise<UsuarioAsignado>, avisoError: string) {
    setGuardando(true);
    setError("");
    try {
      const actualizada = await accion();
      setPersona(actualizada);
      setUsuarios((lista) => lista.map((item) => (item.id === actualizada.id ? { ...item, ...actualizada } : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : avisoError);
    } finally {
      setGuardando(false);
    }
  }

  async function crear(datos: NuevoUsuario) {
    setGuardando(true);
    setError("");
    try {
      const creada = await crearUsuario(datos);
      setUsuarios((lista) => [...lista, creada].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
      setVista("lista");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el usuario");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="config-state">Cargando personas...</p>;
  if (!puedo) {
    return (
      <div className="config-empty">
        <h2>Falta una finca</h2>
        <p>Crea una finca para poder crear trabajadores y asignarles rol.</p>
      </div>
    );
  }

  if (vista === "detalle" && persona) {
    return (
      <section>
        {error ? <p className="config-assign__error">{error}</p> : null}
        <DetallePermisos
          persona={persona}
          catalogo={catalogo}
          guardando={guardando}
          onVolver={() => {
            setError("");
            setVista("lista");
          }}
          onRol={(farmId, role: RolId) => void guardar(() => cambiarRol(persona.id, farmId, role), "No se pudo cambiar el rol")}
          onEstado={(activo) => void guardar(() => cambiarEstado(persona.id, activo), "No se pudo cambiar el estado")}
          onAgregar={(farmId, permission) => void guardar(() => agregarPermiso(persona.id, farmId, permission), "No se pudo añadir el permiso")}
          onQuitar={(farmId, permission) => void guardar(() => quitarPermiso(persona.id, farmId, permission), "No se pudo quitar el permiso")}
        />
      </section>
    );
  }

  const sinResultados = visibles.length === 0;
  const buscando = busqueda.trim().length > 0;

  return (
    <section className="config-crew" aria-label="Personas de tus fincas">
      <div className="config-crew__toolbar">
        <label className="config-crew__search">
          Buscar persona
          <input
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Nombre, documento o correo"
          />
        </label>
        <button type="button" className="btn-primary config-crew__create" onClick={() => setVista("crear")}>
          Crear usuario
        </button>
      </div>
      {error ? <p className="config-assign__error">{error}</p> : null}

      {catalogo?.roles.length ? (
        <ul className="config-role-hints">
          {catalogo.roles.map((rol) => (
            <li key={rol.id}>
              <h3>{rol.nombre}</h3>
              <p>{rol.resumen}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {vista === "crear" ? (
        <FormularioUsuario
          fincas={fincas}
          catalogo={catalogo}
          guardando={guardando}
          error={error}
          onCancelar={() => {
            setError("");
            setVista("lista");
          }}
          onCrear={(datos) => void crear(datos)}
        />
      ) : null}

      {sinResultados ? (
        <div className="config-empty">
          <h2>{buscando ? "Nadie coincide" : "Aún no hay usuarios"}</h2>
          <p>
            {buscando
              ? "Prueba con otro nombre, documento o correo."
              : "Crea el primero para asignarle un rol en tus fincas."}
          </p>
        </div>
      ) : (
        <ul className="config-crew__grid">
          {visibles.map((item) => (
            <li key={item.id}>
              <article className="config-person">
                <header className="config-person__head">
                  <span className="config-person__avatar" aria-hidden="true">
                    {inicialesPersona(item.nombre)}
                  </span>
                  <div className="config-person__who">
                    <h3>{item.nombre}</h3>
                    <p>{item.correo || "Sin correo"}</p>
                  </div>
                  <span className={item.activo ? "config-status is-on" : "config-status is-off"}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </span>
                </header>
                <dl className="config-person__facts">
                  <div>
                    <dt>Documento</dt>
                    <dd>{item.identification}</dd>
                  </div>
                  <div>
                    <dt>Roles</dt>
                    <dd>
                      {item.membresias.length ? (
                        <ul className="config-person__roles">
                          {item.membresias.map((membresia) => (
                            <li key={membresia.farm_id}>
                              <strong>{ROL_NOMBRE[membresia.role]}</strong>
                              <span>{membresia.farm_name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "Sin rol"
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="config-person__actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={guardando}
                    onClick={() => void abrir(item.id)}
                  >
                    Ver permisos
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
