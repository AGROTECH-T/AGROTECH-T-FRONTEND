/**
 * Contratos del inventario de finca.
 *
 * Propósito: tipar insumos, movimientos y catálogo del sistema.
 * @author Cristian Deysdayr Jimenez
 */

export type MovementKind = "entrada" | "salida" | "ajuste";

export type CatalogOption = {
  id: string;
  label: string;
};

export type InventoryCatalog = {
  units: CatalogOption[];
  categories: CatalogOption[];
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
  created_at: string;
  updated_at: string;
};

export type Movement = {
  id: number;
  kind: MovementKind;
  quantity: string;
  note: string;
  created_at: string;
};

export type ProductDraft = {
  name: string;
  barcode: string;
  unit: string;
  category: string;
  min_stock: string;
};
