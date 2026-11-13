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

export type AdjustmentReason =
  | "conteo_fisico"
  | "merma_humedad"
  | "dano_plaga"
  | "vencimiento"
  | "robo_perdida"
  | "consumo_no_registrado"
  | "otro";

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
  reason: AdjustmentReason | "";
  reason_label: string;
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
  reason?: AdjustmentReason | "";
  takeAll?: boolean;
  idempotencyKey?: string;
};

export type ReportQuery = {
  from?: string;
  to?: string;
  product?: string;
  category?: string;
  reason?: string;
  status?: string;
  person?: string;
  low?: boolean;
  target?: "min" | "doble";
};

export type AdjustmentReportRow = {
  id: number;
  when: string;
  product_id: number;
  product: string;
  reason: AdjustmentReason | "";
  reason_label: string;
  note: string;
  before: string;
  after: string;
  difference: string;
  unit: string;
  user: string;
};

export type AdjustmentReport = {
  rows: AdjustmentReportRow[];
  count: number;
  up: number;
  down: number;
};

export type BaseTotal = {
  symbol: string;
  base: string;
};

export type ConsumptionRow = {
  product_id: number;
  product: string;
  category: string;
  unit: string;
  base_symbol: string;
  quantity: string;
  base: string;
  moves: number;
  share: number;
  previous: string | null;
  variation: number | null;
};

export type ConsumptionMonth = {
  month: string;
  label: string;
  current: boolean;
  items: BaseTotal[];
};

export type ConsumptionFlow = {
  day: string;
  label: string;
  entradas: number;
  salidas: number;
};

export type ConsumptionReport = {
  rows: ConsumptionRow[];
  count: number;
  total: string;
  by_symbol: BaseTotal[];
  previous: {
    available: boolean;
    from: string | null;
    to: string | null;
    total: string | null;
  };
  trend: ConsumptionMonth[];
  flow?: ConsumptionFlow[];
};

export type LoanReportRow = {
  id: number;
  when: string;
  person: string;
  document: string;
  product: string;
  quantity: string;
  returned: string;
  pending: string;
  unit: string;
  state: string;
};

export type LoanReportPerson = {
  person: string;
  document: string;
  pending: string;
  loans: number;
};

export type LoanReport = {
  rows: LoanReportRow[];
  count: number;
  open: number;
  people: LoanReportPerson[];
};

export type OrderReportRow = {
  product_id: number;
  product: string;
  category: string;
  unit: string;
  initial: string | null;
  initial_known: boolean;
  moves: number;
  entries: string;
  exits: string;
  adjustments: string;
  current: string;
  min: string;
  missing: string;
  suggested: string;
  lent: string;
  is_low: boolean;
};

export type OrderReport = {
  rows: OrderReportRow[];
  count: number;
  low: number;
  to_order: number;
};
