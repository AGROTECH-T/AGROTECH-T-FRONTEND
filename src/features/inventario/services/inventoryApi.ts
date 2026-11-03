/**
 * Cliente HTTP del inventario.
 *
 * Propósito: catálogo del sistema, insumos y movimientos por finca.
 * @author Cristian Deysdayr Jimenez
 */

import { getJson, postJson } from "../../../services/api/client.ts";
import { readToken } from "../../auth/services/session.ts";
import type {
  InventoryCatalog,
  Movement,
  Product,
  ProductDraft,
} from "../types/index.ts";

const CATALOG_PATH = "/api/v1/inventory/catalog/";

function productsPath(farmId: number): string {
  return `/api/v1/inventory/${farmId}/products/`;
}

/**
 * Catálogo fijo de unidades y categorías.
 */
export function getInventoryCatalog(): Promise<InventoryCatalog> {
  return getJson<InventoryCatalog>(CATALOG_PATH, readToken());
}

/**
 * Lista insumos de una finca.
 */
export function listProducts(farmId: number): Promise<Product[]> {
  return getJson<Product[]>(productsPath(farmId), readToken());
}

/**
 * Crea un insumo eligiendo unidad y categoría del catálogo.
 */
export function createProduct(farmId: number, draft: ProductDraft): Promise<Product> {
  return postJson<Product>(
    productsPath(farmId),
    {
      name: draft.name.trim(),
      barcode: draft.barcode.trim(),
      unit: draft.unit,
      category: draft.category,
      min_stock: draft.min_stock.trim() || "0",
    },
    readToken(),
  );
}

/**
 * Consulta un insumo.
 */
export function getProduct(farmId: number, productId: number): Promise<Product> {
  return getJson<Product>(`${productsPath(farmId)}${productId}/`, readToken());
}

/**
 * Lista movimientos recientes.
 */
export function listMovements(farmId: number, productId: number): Promise<Movement[]> {
  return getJson<Movement[]>(`${productsPath(farmId)}${productId}/movements/`, readToken());
}

/**
 * Registra entrada, salida o ajuste.
 */
export function createMovement(
  farmId: number,
  productId: number,
  kind: string,
  quantity: string,
  note = "",
): Promise<Movement> {
  return postJson<Movement>(
    `${productsPath(farmId)}${productId}/movements/`,
    { kind, quantity, note },
    readToken(),
  );
}
