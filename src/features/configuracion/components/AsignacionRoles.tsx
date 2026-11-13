/**
 * Listado de personas y acceso a sus permisos.
 *
 * Propósito: buscar usuarios, crearlos y abrir Ver permisos.
 * Contexto: Roles y permisos de Configuración.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useMemo, useState } from "react";
import { ROL_NOMBRE } from "../services/catalogo.ts";
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
      <p className="config-note">
        Crea una finca para poder crear trabajadores y asignarles rol.
      </p>
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

  return (
    <section className="config-people" aria-labelledby="config-people-title">
      <p id="config-people-title" className="config-note">
        Elige una persona para ver y editar su rol y sus permisos adicionales.
        Solo el administrador de la finca puede hacerlo.
      </p>
      {vista === "lista" && error ? <p className="config-assign__error">{error}</p> : null}
      <div className="config-people__bar">
        <button type="button" className="btn-primary config-people__create" onClick={() => setVista("crear")}>
          Crear usuario
        </button>
        <label>
          Buscar
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Nombre, documento o correo"
          />
        </label>
      </div>
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
      <div className="config-people__table">
        <table>
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Documento</th>
              <th scope="col">Roles</th>
              <th scope="col">Estado</th>
              <th scope="col">Acción</th>
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
                <td>{rolesDe(item)}</td>
                <td className={item.activo ? "is-on" : "is-off"}>{item.activo ? "Activo" : "Inactivo"}</td>
                <td>
                  <button type="button" className="config-people__link" disabled={guardando} onClick={() => void abrir(item.id)}>
                    Ver permisos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function rolesDe(persona: UsuarioAsignado): string {
  const nombres = persona.membresias.map((item) => `${ROL_NOMBRE[item.role]} · ${item.farm_name}`);
  return nombres.join(", ") || "Sin rol";
}
