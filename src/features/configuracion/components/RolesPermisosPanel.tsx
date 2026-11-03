/**
 * Submódulo Roles y permisos.
 *
 * Propósito: cargar el catálogo y mostrar estados de espera o error.
 * Contexto: contenido de Configuración; refleja la definición Farms.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useState } from "react";
import type { CatalogoRoles } from "../types/index.ts";
import { fetchRolesPermisos } from "../services/rolesPermisos.ts";
import { RolesCatalogo } from "./RolesCatalogo.tsx";

/**
 * Contenido del submódulo con carga, error y catálogo.
 * @returns Roles, actores, matriz, reglas y pendientes.
 */
export function RolesPermisosPanel() {
  const [catalogo, setCatalogo] = useState<CatalogoRoles | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setCatalogo(await fetchRolesPermisos());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="config-state" role="status">
        Cargando roles y permisos...
      </p>
    );
  }

  if (error || !catalogo) {
    return (
      <div className="config-state" role="alert">
        <p>{error || "No se pudo cargar el catálogo"}</p>
        <button type="button" className="btn-primary" onClick={() => void load()}>
          Reintentar
        </button>
      </div>
    );
  }

  return <RolesCatalogo catalogo={catalogo} />;
}
