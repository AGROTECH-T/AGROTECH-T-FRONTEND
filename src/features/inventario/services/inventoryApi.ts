/**
 * Cliente HTTP del inventario.
 *
 * Propósito: catálogo del sistema, insumos y movimientos por finca.
 * @author Cristian Deysdayr Jimenez
 */

import { deleteJson, getJson, patchJson, postJson } from "../../../services/api/client.ts";
import { apiRoot } from "../../../services/api/config.ts";
import { limitNotice } from "../../../services/api/limitNotice.ts";
import { readToken } from "../../auth/services/session.ts";
import type {
  InventoryCatalog,
  Movement,
  MovementDraft,
  MovementPage,
  Product,
  ProductDraft,
  ProductLoan,
  ProductPatch,
} from "../types/index.ts";

const CATALOG_PATH = "/api/v1/inventory/catalog/";

function productsPath(farmId: number): string {
  return `/api/v1/inventory/${farmId}/products/`;
}

/**
 * Catálogo fijo de unidades y categorías.
 */
export function getInventoryCatalog(): Promise<InventoryCatalog> {
  return getJson<InventoryCatalog>(CATALOG_PATH, readToken(), "no-store");
}

/**
 * Crea una categoría y, si se pide, una unidad nueva o el vínculo con otras.
 */
export function createCategory(
  farmId: number,
  draft: {
    name: string;
    copy_from?: string;
    unit_codes?: string[];
    unit_label?: string;
    base_unit?: string;
    factor?: string;
  },
): Promise<InventoryCatalog> {
  return postJson<InventoryCatalog>(
    `/api/v1/inventory/${farmId}/categories/`,
    draft,
    readToken(),
  );
}

/**
 * Crea una unidad y la asocia a categorías que ya existen.
 */
/**
 * Cambia el nombre y las unidades de una categoría.
 */
export function updateCategory(
  farmId: number,
  code: string,
  draft: { name: string; unit_codes: string[] },
): Promise<InventoryCatalog> {
  return patchJson<InventoryCatalog>(
    `/api/v1/inventory/${farmId}/categories/${code}/`,
    draft,
    readToken(),
  );
}

/**
 * Borra una categoría que ningún producto usa.
 */
export function removeCategory(farmId: number, code: string): Promise<void> {
  return deleteJson(`/api/v1/inventory/${farmId}/categories/${code}/`, readToken());
}

/**
 * Cambia el nombre y las categorías de una unidad.
 */
export function updateUnit(
  farmId: number,
  code: string,
  draft: { label: string; categories: string[] },
): Promise<InventoryCatalog> {
  return patchJson<InventoryCatalog>(
    `/api/v1/inventory/${farmId}/units/${code}/`,
    draft,
    readToken(),
  );
}

/**
 * Borra una unidad que ningún producto usa.
 */
export function removeUnit(farmId: number, code: string): Promise<void> {
  return deleteJson(`/api/v1/inventory/${farmId}/units/${code}/`, readToken());
}

/**
 * Crea una medida que no viene en la lista.
 */
export function createBaseUnit(
  farmId: number,
  draft: { name: string; symbol: string; decimals: boolean },
): Promise<InventoryCatalog> {
  return postJson(`/api/v1/inventory/${farmId}/base-units/`, draft, readToken());
}

/**
 * Cambia el nombre, el símbolo y si la medida admite decimales.
 */
export function updateBaseUnit(
  farmId: number,
  code: string,
  draft: { name: string; symbol: string; decimals: boolean },
): Promise<InventoryCatalog> {
  return patchJson(`/api/v1/inventory/${farmId}/base-units/${code}/`, draft, readToken());
}

/**
 * Borra una medida que nadie usa para contar.
 */
export function removeBaseUnit(farmId: number, code: string): Promise<void> {
  return deleteJson(`/api/v1/inventory/${farmId}/base-units/${code}/`, readToken());
}

export function createCustomUnit(
  farmId: number,
  draft: { stem: string; label: string; base_unit: string; factor: string; categories: string[] },
): Promise<{ id: string; label: string }> {
  return postJson(`/api/v1/inventory/${farmId}/units/`, draft, readToken());
}

/**
 * Lista insumos de una finca, incluidos los inactivos.
 * @param farmId - Finca activa.
 * @returns Despensa completa.
 */
export function listProducts(farmId: number): Promise<Product[]> {
  return getJson<Product[]>(`${productsPath(farmId)}?status=all`, readToken());
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
 * Edita datos del insumo. La cantidad no viaja aquí.
 */
export function updateProduct(
  farmId: number,
  productId: number,
  patch: ProductPatch,
): Promise<Product> {
  return patchJson<Product>(`${productsPath(farmId)}${productId}/`, patch, readToken());
}

/**
 * Quita el insumo de la lista y conserva sus movimientos.
 */
export function deleteProduct(farmId: number, productId: number): Promise<void> {
  return deleteJson(`${productsPath(farmId)}${productId}/`, readToken());
}

/**
 * Consulta un insumo.
 */
export function getProduct(farmId: number, productId: number): Promise<Product> {
  return getJson<Product>(`${productsPath(farmId)}${productId}/`, readToken());
}

/**
 * Lista movimientos del producto.
 */
export function listLoans(farmId: number, productId: number): Promise<ProductLoan[]> {
  return getJson<ProductLoan[]>(`${productsPath(farmId)}${productId}/loans/`, readToken());
}

/**
 * Presta una cantidad y descuenta el stock.
 */
export function lendProduct(
  farmId: number,
  productId: number,
  draft: { borrower_name: string; document_number: string; quantity: string },
): Promise<{ loan: ProductLoan; product: Product }> {
  return postJson(`${productsPath(farmId)}${productId}/loans/`, draft, readToken());
}

/**
 * Devuelve una cantidad prestada y la suma al stock.
 */
export function returnLoan(
  farmId: number,
  productId: number,
  loanId: number,
  quantity: string,
  note = "",
): Promise<{ loan: ProductLoan; product: Product }> {
  return postJson(
    `${productsPath(farmId)}${productId}/loans/${loanId}/return/`,
    { quantity, note },
    readToken(),
  );
}

/**
 * Sube la foto ya comprimida y devuelve el producto.
 */
export async function removeProductImage(farmId: number, productId: number): Promise<Product> {
  const response = await authed(`${productsPath(farmId)}${productId}/image/`, { method: "DELETE" });
  return response.json() as Promise<Product>;
}

export async function uploadProductImage(farmId: number, productId: number, file: File): Promise<Product> {
  const body = new FormData();
  body.append("image", file);
  const response = await authed(`${productsPath(farmId)}${productId}/image/`, { method: "POST", body });
  return response.json() as Promise<Product>;
}

/**
 * Trae la foto con la sesión y deja una dirección local para mostrarla.
 */
export async function productImageUrl(farmId: number, productId: number): Promise<string> {
  const response = await authed(`${productsPath(farmId)}${productId}/image/`, { method: "GET" });
  return URL.createObjectURL(await response.blob());
}

/**
 * Baja el Excel con todos los movimientos del producto.
 */
export async function downloadProductHistory(farmId: number, productId: number): Promise<void> {
  await downloadFile(
    `${productsPath(farmId)}${productId}/history.xlsx`,
    `historial-${productId}.xlsx`,
  );
}

/**
 * Baja el Excel con todos los préstamos del producto y su estado.
 */
export async function downloadLoanHistory(farmId: number, productId: number): Promise<void> {
  await downloadFile(
    `${productsPath(farmId)}${productId}/loans/history.xlsx`,
    `prestamos-${productId}.xlsx`,
  );
}

async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await authed(path, { method: "GET" });
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function authed(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = readToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiRoot()}${path}`, { ...init, headers });
  if (response.ok) return response;
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  throw new Error(limitNotice(data.error ?? "No se pudo completar la solicitud"));
}

export function listMovements(farmId: number, productId: number): Promise<Movement[]> {
  return getJson<Movement[]>(`${productsPath(farmId)}${productId}/movements/`, readToken());
}

export type FarmHistoryQuery = {
  kind?: string;
  from?: string;
  to?: string;
  page?: number;
};

/**
 * Historial de la finca, filtrado y paginado.
 */
export function listFarmMovements(farmId: number, query: FarmHistoryQuery): Promise<MovementPage> {
  const params = new URLSearchParams();
  if (query.kind) params.set("kind", query.kind);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  params.set("page", String(query.page ?? 1));
  params.set("page_size", "15");
  return getJson<MovementPage>(
    `/api/v1/inventory/${farmId}/movements/?${params.toString()}`,
    readToken(),
  );
}

/**
 * Baja el Excel con el historial de la finca usando los filtros de pantalla.
 */
export async function downloadFarmHistory(farmId: number, query: FarmHistoryQuery): Promise<void> {
  const params = new URLSearchParams();
  if (query.kind) params.set("kind", query.kind);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const suffix = params.size ? `?${params.toString()}` : "";
  await downloadFile(
    `/api/v1/inventory/${farmId}/movements/history.xlsx${suffix}`,
    `historial-finca-${farmId}.xlsx`,
  );
}

/**
 * Baja el Excel con el inventario que se está viendo.
 */
export async function downloadInventory(farmId: number, productIds: number[]): Promise<void> {
  const params = new URLSearchParams();
  if (productIds.length) params.set("ids", productIds.join(","));
  const suffix = params.size ? `?${params.toString()}` : "";
  await downloadFile(
    `/api/v1/inventory/${farmId}/products/inventory.xlsx${suffix}`,
    `inventario-${farmId}.xlsx`,
  );
}

/**
 * Registra entrada, salida o ajuste.
 */
export function createMovement(
  farmId: number,
  productId: number,
  draft: MovementDraft,
): Promise<Movement> {
  return postJson<Movement>(
    `${productsPath(farmId)}${productId}/movements/`,
    {
      kind: draft.kind,
      quantity: draft.takeAll ? null : draft.quantity,
      note: draft.note ?? "",
      take_all: Boolean(draft.takeAll),
      idempotency_key: draft.idempotencyKey ?? "",
    },
    readToken(),
  );
}
