/**
 * Detalle de roles y permisos de una persona.
 *
 * Propósito: cambiar el rol, sumar o quitar permisos extra y el estado.
 * Contexto: se abre con Ver permisos.
 * @author Cristian Deysdayr Jimenez
 */

import { BackButton } from "../../../components/ui/BackButton.tsx";
import { inicialesPersona, ROL_NOMBRE, ROLES_ORDEN } from "../services/catalogo.ts";
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
    <div className="config-ficha">
      <BackButton onClick={onVolver} />

      <article className="config-ficha__who">
        <span className="config-person__avatar" aria-hidden="true">
          {inicialesPersona(persona.nombre)}
        </span>
        <div className="config-ficha__identity">
          <h2>{persona.nombre}</h2>
          <p>
            {persona.correo || "Sin correo"} · Documento {persona.identification}
          </p>
        </div>
        <div className="config-ficha__tools">
          <span className={persona.activo ? "config-status is-on" : "config-status is-off"}>
            {persona.activo ? "Activo" : "Inactivo"}
          </span>
          {persona.es_yo ? (
            <p className="config-ficha__lock">
              Puedes cambiar tu rol. No puedes inactivar tu cuenta ni editar tus
              permisos extra.
            </p>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              disabled={guardando}
              onClick={() => onEstado(!persona.activo)}
            >
              {persona.activo ? "Inactivar" : "Activar"}
            </button>
          )}
        </div>
      </article>

      {persona.membresias.length ? (
        persona.membresias.map((membresia) => {
          const directos = membresia.permisos_directos ?? [];
          const efectivos = membresia.permisos_efectivos ?? [];
          const yaTiene = new Set(efectivos.map((permiso) => permiso.id));
          const extras = new Set(directos.map((permiso) => permiso.id));
          const paraSumar = (catalogo?.asignables ?? []).filter((permiso) => !yaTiene.has(permiso.id));
          return (
            <article key={membresia.farm_id} className="config-ficha__farm">
              <header className="config-ficha__farm-head">
                <p>Finca</p>
                <h3>{membresia.farm_name}</h3>
              </header>

              <section className="config-ficha__block">
                <h4>Rol</h4>
                <p>
                  Un rol por finca. Si eliges otro, reemplaza el actual
                  {persona.es_yo
                    ? ". Debe quedar al menos un administrador activo."
                    : "."}
                </p>
                <div className="config-seg" role="group" aria-label={`Rol en ${membresia.farm_name}`}>
                  {ROLES_ORDEN.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={membresia.role === role ? "is-on" : undefined}
                      disabled={guardando}
                      onClick={() => onRol(membresia.farm_id, role)}
                    >
                      {ROL_NOMBRE[role]}
                    </button>
                  ))}
                </div>
              </section>

              <section className="config-ficha__block">
                <h4>Qué puede hacer</h4>
                <p>Lo que da el rol, más lo extra que le hayas sumado.</p>
                {efectivos.length ? (
                  <ul className="config-chips">
                    {efectivos.map((permiso) => (
                      <li key={permiso.id} className={extras.has(permiso.id) ? "is-extra" : undefined}>
                        {permiso.nombre}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="config-ficha__void">Este rol no tiene permisos listados.</p>
                )}
              </section>

              <section className="config-ficha__block">
                <h4>Permisos extra</h4>
                <p>Se suman al rol. Puedes añadir o quitar.</p>
                {directos.length ? (
                  <ul className="config-chips">
                    {directos.map((permiso) => (
                      <li key={permiso.id} className="is-extra">
                        {permiso.nombre}
                        <button
                          type="button"
                          aria-label={`Quitar ${permiso.nombre}`}
                          disabled={persona.es_yo || guardando}
                          onClick={() => onQuitar(membresia.farm_id, permiso.id)}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="config-ficha__void">Ninguno por ahora.</p>
                )}
                {paraSumar.length ? (
                  <div className="config-ficha__add">
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
                  <p className="config-ficha__void">Nada más por sumar.</p>
                )}
              </section>
            </article>
          );
        })
      ) : (
        <div className="config-empty">
          <h2>Sin finca asignada</h2>
          <p>Esta persona todavía no tiene rol en ninguna de tus fincas.</p>
        </div>
      )}
    </div>
  );
}
