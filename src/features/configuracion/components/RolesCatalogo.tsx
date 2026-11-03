/**
 * Contenido cargado del catálogo de roles.
 *
 * Propósito: pintar roles, actores, matriz, reglas y pendientes.
 * Contexto: submódulo Roles y permisos ya resuelto.
 * @author Cristian Deysdayr Jimenez
 */

import type { CatalogoRoles } from "../types/index.ts";
import { RolCard, RolesMatriz } from "./RolesMatriz.tsx";

type Props = {
  catalogo: CatalogoRoles;
};

/**
 * Secciones del catálogo funcional.
 * @param props - Catálogo recibido de la API.
 * @returns Bloques informativos de Configuración.
 */
export function RolesCatalogo({ catalogo }: Readonly<Props>) {
  return (
    <div className="config-content">
      <section aria-labelledby="config-roles-title">
        <h2 id="config-roles-title" className="config-section__title">
          Roles de finca
        </h2>
        <div className="config-roles">
          {catalogo.roles.map((rol) => (
            <RolCard key={rol.id} rol={rol} />
          ))}
        </div>
      </section>

      <section aria-labelledby="config-actores-title">
        <h2 id="config-actores-title" className="config-section__title">
          Actores especiales
        </h2>
        <div className="config-roles">
          {catalogo.actores.map((actor) => (
            <RolCard key={actor.id} rol={actor} />
          ))}
        </div>
      </section>

      <section className="config-section" aria-labelledby="config-matriz-title">
        <h2 id="config-matriz-title" className="config-section__title">
          Matriz general de permisos
        </h2>
        <p className="config-note">
          Sí concede el permiso; condicionado depende del módulo o del estado de la finca;
          pendiente requiere una definición antes de implementarse.
        </p>
        <RolesMatriz catalogo={catalogo} />
      </section>

      <section className="config-section" aria-labelledby="config-reglas-title">
        <h2 id="config-reglas-title" className="config-section__title">
          Reglas transversales de autorización
        </h2>
        <ol className="config-rules">
          {catalogo.reglas.map((regla) => (
            <li key={regla.numero}>
              <strong>{regla.titulo}.</strong> {regla.detalle}
            </li>
          ))}
        </ol>
      </section>

      <aside className="config-pending" aria-labelledby="config-pendientes-title">
        <h2 id="config-pendientes-title" className="config-section__title">
          Pendientes por definir
        </h2>
        <p className="config-note">
          Antes de convertir la matriz en una especificación definitiva.
        </p>
        <ul>
          {catalogo.pendientes.map((pendiente) => (
            <li key={pendiente}>{pendiente}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
