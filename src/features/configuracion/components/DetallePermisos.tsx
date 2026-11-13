/**
 * Detalle de roles y permisos de una persona.
 *
 * Propósito: cambiar el rol, sumar o quitar permisos extra y el estado.
 * Contexto: se abre con Ver permisos.
 * @author Cristian Deysdayr Jimenez
 */

import { ROL_NOMBRE, ROLES_ORDEN } from "../services/catalogo.ts";
import type { CatalogoRoles, RolId, UsuarioAsignado } from "../types/index.ts";

type Props = {
  persona: UsuarioAsignado;
  catalogo: CatalogoRoles | null;
  guardando: boolean;
  onVolver: () => void;
  onRol: (farmId: number, role: RolId) => void;
  onEstado: (activo: boolean) => void;
  onAgregar: (farmId: number, permission: string) => void;
  onQuitar: (farmId: number, permission: string) => void;
};

/**
 * Ficha de la persona con sus roles y permisos por finca.
 * @param props - Persona, catálogo y acciones.
 * @returns Detalle de permisos.
 */
export function DetallePermisos({
  persona,
  catalogo,
  guardando,
  onVolver,
  onRol,
  onEstado,
  onAgregar,
  onQuitar,
}: Readonly<Props>) {
  return (
    <div className="config-detail">
      <button type="button" className="btn-secondary" onClick={onVolver}>Volver</button>
      <article className="config-detail__card">
        <h2>{persona.nombre}</h2>
        <p>{persona.correo || "Sin correo"}</p>
        <p>Documento {persona.identification} · {persona.activo ? "Activo" : "Inactivo"}</p>
        {persona.es_yo ? (
          <p>No puedes modificar tus propios roles ni permisos.</p>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            disabled={guardando}
            onClick={() => onEstado(!persona.activo)}
          >
            {persona.activo ? "Inactivar usuario" : "Activar usuario"}
          </button>
        )}
      </article>

      {persona.membresias.map((membresia) => {
        const directos = membresia.permisos_directos ?? [];
        const efectivos = membresia.permisos_efectivos ?? [];
        const yaTiene = new Set(efectivos.map((permiso) => permiso.id));
        const paraSumar = (catalogo?.asignables ?? []).filter((permiso) => !yaTiene.has(permiso.id));
        return (
          <article key={membresia.farm_id} className="config-detail__card">
            <h3>{membresia.farm_name}</h3>
            <h4>Rol asignado</h4>
            <p>Elegir otro rol reemplaza el actual en esta finca.</p>
            <div className="config-detail__roles">
              {ROLES_ORDEN.map((role) => (
                <button
                  key={role}
                  type="button"
                  className={membresia.role === role ? "btn-primary" : "btn-secondary"}
                  disabled={persona.es_yo || guardando}
                  onClick={() => onRol(membresia.farm_id, role)}
                >
                  {ROL_NOMBRE[role]}
                </button>
              ))}
            </div>

            <h4>Permisos del rol y adicionales</h4>
            <div className="config-detail__tags">
              {efectivos.map((permiso) => (
                <span key={permiso.id}>{permiso.nombre}</span>
              ))}
            </div>

            <h4>Permisos adicionales</h4>
            <p>Se suman al rol. Puedes añadir o quitar.</p>
            <div className="config-detail__tags">
              {directos.length ? directos.map((permiso) => (
                <span key={permiso.id}>
                  {permiso.nombre}
                  <button
                    type="button"
                    aria-label={`Quitar ${permiso.nombre}`}
                    disabled={persona.es_yo || guardando}
                    onClick={() => onQuitar(membresia.farm_id, permiso.id)}
                  >
                    ×
                  </button>
                </span>
              )) : <p>Ninguno.</p>}
            </div>
            {paraSumar.length ? (
              <div className="config-account__extras">
                {paraSumar.map((permiso) => (
                  <button
                    key={permiso.id}
                    type="button"
                    className="config-pick"
                    disabled={persona.es_yo || guardando}
                    onClick={() => onAgregar(membresia.farm_id, permiso.id)}
                  >
                    <span>{permiso.nombre}</span>
                    <span className="config-pick__action">Asignar</span>
                  </button>
                ))}
              </div>
            ) : (
              <p>Nada más por sumar.</p>
            )}
          </article>
        );
      })}
    </div>
  );
}
