/**
 * Contratos del inventario de finca.
 *
 * Propósito: tipar insumos, movimientos y catálogo del sistema.
 * @author Cristian Deysdayr Jimenez
 */

export type MovementKind = "entrada" | "salida" | "ajuste";

export type MagnitudeNature = "discreta" | "continua" | "presentacion";

export type CatalogOption = {
  id: string;
  label: string;
  description?: string;
};

export type UnitOption = {
  id: string;
  label: string;
  nature: MagnitudeNature;
  decimal_places: number;
  factor: string;
  base_unit: string;
  base_symbol: string;
  equivalent: string | null;
};

export type BaseUnitOption = {
  id: string;
  label: string;
  name: string;
  symbol: string;
  nature: MagnitudeNature;
};

export type InventoryCatalog = {
  units: UnitOption[];
  categories: CatalogOption[];
  units_by_category: Record<string, string[]>;
  base_units?: BaseUnitOption[];
  created?: string;
};

export type ProductLoan = {
  id: number;
  borrower_name: string;
  document_number: string;
  quantity: string;
  returned_quantity: string;
  pending: string;
};

export type Product = {
  id: number;
  farm_id: number;
  name: string;
  barcode: string;
  unit: string;
  unit_label: string;
  category: string;
  category_label: string;
  min_stock: string;
  quantity: string;
  lent_quantity: string;
  is_active: boolean;
  is_low_stock: boolean;
  unit_nature: MagnitudeNature;
  unit_factor: string;
  unit_decimal_places: number;
  base_symbol: string;
  unit_equivalent: string;
  has_image: boolean;
  last_movement_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Movement = {
  id: number;
  kind: MovementKind;
  quantity: string;
  quantity_base: string;
  stock_before: string;
  stock_after: string;
  unit: string;
  unit_label: string;
  base_symbol: string;
  note: string;
  product_id: number;
  product_name: string;
  created_by_id: number;
  created_by_name: string;
  created_at: string;
};

export type MovementPage = {
  count: number;
  page: number;
  page_size: number;
  results: Movement[];
};

export type ProductDraft = {
  name: string;
  barcode: string;
  unit: string;
  category: string;
  min_stock: string;
  initial_quantity: string;
};

export type ProductPatch = {
  name?: string;
  barcode?: string;
  unit?: string;
  category?: string;
  min_stock?: string;
  is_active?: boolean;
};

export type MovementDraft = {
  kind: MovementKind;
  quantity?: string | null;
  note?: string;
  takeAll?: boolean;
  idempotencyKey?: string;
};
