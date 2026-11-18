/**
 * Pruebas del filtrado y paginado de cuentas del superadmin.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { describe, expect, it } from "vitest";
import {
  ADMIN_PAGE_SIZE,
  filtrarCuentas,
  paginaCuentas,
  type CuentaPlataforma,
} from "../../src/features/configuracion/services/administradores.ts";

const filas: CuentaPlataforma[] = [
  {
    id: 1,
    nombre: "Ana García",
    identification: "100200300",
    correo: "ana@correo.com",
    activo: true,
    is_administrador: false,
  },
  {
    id: 2,
    nombre: "Luis Mora",
    identification: "400500600",
    correo: "luis@correo.com",
    activo: true,
    is_administrador: true,
  },
];

describe("cuentas del superadmin", () => {
  it("busca por nombre o documento", () => {
    expect(filtrarCuentas(filas, "ana")).toHaveLength(1);
    expect(filtrarCuentas(filas, "400500")).toEqual([filas[1]]);
  });

  it("pagina de cinco en cinco", () => {
    expect(ADMIN_PAGE_SIZE).toBe(5);
    const muchas = Array.from({ length: 7 }, (_, index) => ({
      ...filas[0],
      id: index + 1,
      identification: String(1000 + index),
    }));
    expect(paginaCuentas(muchas, 1)).toHaveLength(5);
    expect(paginaCuentas(muchas, 2)).toHaveLength(2);
  });
});
