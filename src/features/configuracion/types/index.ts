/**
 * Tipos del submódulo Roles y permisos.
 *
 * Propósito: describir el catálogo que entrega la API de Configuración.
 * Contexto: matriz funcional del módulo Farms, sin membresías todavía.
 * @author Cristian Deysdayr Jimenez
 */

export type EstadoPermiso =
  | "permitido"
  | "no_permitido"
  | "condicionado"
  | "pendiente"
  | "no_requiere";

export type RolId = "administrador" | "operador" | "consulta";

export type Rol = {
  id: string;
  nombre: string;
  resumen: string;
  funciones: string[];
};

export type CeldaPermiso = {
  estado: EstadoPermiso;
  detalle: string;
};

export type Permiso = {
  id: string;
  nombre: string;
  por_rol: Record<RolId, CeldaPermiso>;
};

export type Regla = {
  numero: number;
  titulo: string;
  detalle: string;
};

export type CatalogoRoles = {
  roles: Rol[];
  actores: Rol[];
  permisos: Permiso[];
  reglas: Regla[];
  pendientes: string[];
  estados: EstadoPermiso[];
};
