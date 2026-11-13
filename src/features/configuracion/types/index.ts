/**
 * Tipos del submódulo Roles y permisos.
 *
 * Propósito: describir el catálogo que entrega la API de Configuración.
 * Contexto: matriz funcional del módulo Farms y las personas de cada finca.
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
  modulo: string;
  por_rol: Record<RolId, CeldaPermiso>;
};

export type Regla = {
  numero: number;
  titulo: string;
  detalle: string;
};

export type PermisoAsignable = {
  id: string;
  nombre: string;
  modulo: string;
};

export type MembresiaAsignada = {
  farm_id: number;
  farm_name: string;
  role: RolId;
  permisos_efectivos?: PermisoAsignable[];
  permisos_directos?: PermisoAsignable[];
};

export type UsuarioAsignado = {
  id: number;
  nombre: string;
  identification: string;
  correo: string;
  activo: boolean;
  es_yo: boolean;
  membresias: MembresiaAsignada[];
};

export type FincaAsignable = {
  id: number;
  name: string;
};

export type AsignacionRoles = {
  puedo_asignar: boolean;
  fincas: FincaAsignable[];
  usuarios: UsuarioAsignado[];
};

export type NuevoUsuario = {
  first_name: string;
  last_name: string;
  identification: string;
  correo: string;
  phone: string;
  password: string;
  farm_ids: number[];
  role: RolId;
  permisos: string[];
};

export type CatalogoRoles = {
  roles: Rol[];
  actores: Rol[];
  permisos: Permiso[];
  asignables: PermisoAsignable[];
  reglas: Regla[];
  pendientes: string[];
  estados: EstadoPermiso[];
};
