/**
 * Piezas visuales de la matriz de roles.
 *
 * Propósito: tarjetas de rol y tabla de permisos.
 * Contexto: submódulo Roles y permisos de Configuración.
 * @author Cristian Deysdayr Jimenez
 */

import type { CatalogoRoles, Permiso, Rol, RolId } from "../types/index.ts";
import { ESTADO_LABEL, ROLES_ORDEN } from "../services/catalogo.ts";

/**
 * Tarjeta con el nombre, el resumen y las funciones de un rol.
 * @param props - Rol o actor a describir.
 * @returns Tarjeta informativa.
 */
export function RolCard({ rol }: Readonly<{ rol: Rol }>) {
  return (
    <article className="config-role">
      <h3 className="config-role__name">{rol.nombre}</h3>
      <p className="config-role__lead">{rol.resumen}</p>
      <ul className="config-role__list">
        {rol.funciones.map((funcion) => (
          <li key={funcion}>{funcion}</li>
        ))}
      </ul>
    </article>
  );
}

/**
 * Celda de la matriz con su estado y su detalle.
 * @param props - Permiso de un rol para una acción.
 * @returns Estado con la explicación correspondiente.
 */
function Celda({ permiso, rol }: Readonly<{ permiso: Permiso; rol: RolId }>) {
  const celda = permiso.por_rol[rol];
  return (
    <td>
      <span className={`config-chip is-${celda.estado}`}>{ESTADO_LABEL[celda.estado]}</span>
      <p className="config-detail">{celda.detalle}</p>
    </td>
  );
}

/**
 * Matriz de permisos por acción y rol.
 * @param props - Catálogo cargado desde la API.
 * @returns Tabla semántica y desplazable.
 */
export function RolesMatriz({ catalogo }: Readonly<{ catalogo: CatalogoRoles }>) {
  const nombres = new Map(catalogo.roles.map((rol) => [rol.id, rol.nombre]));
  return (
    <div className="config-table-wrap">
      <table className="config-table">
        <caption className="visually-hidden">Matriz de permisos por rol</caption>
        <thead>
          <tr>
            <th scope="col">Acción</th>
            {ROLES_ORDEN.map((rol) => (
              <th key={rol} scope="col">
                {nombres.get(rol)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {catalogo.permisos.map((permiso) => (
            <tr key={permiso.id}>
              <th scope="row" className="config-table__action">
                {permiso.nombre}
              </th>
              {ROLES_ORDEN.map((rol) => (
                <Celda key={rol} permiso={permiso} rol={rol} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
