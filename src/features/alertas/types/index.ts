/**
 * Contratos de los avisos del sistema.
 *
 * Propósito: tipar alertas de stock y recordatorios de bitácora.
 * @author Cristian Deysdayr Jimenez
 */

export type AlertKind = "bajo" | "agotado" | "bitacora";

export type Alert = {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  farm_id: number;
  farm: string;
  product_id?: number;
  product?: string;
  quantity?: string;
  min?: string;
  unit?: string;
  lot_id?: number;
  lot?: string;
  house_id?: number;
  house?: string;
};

export type AlertList = {
  count: number;
  results: Alert[];
};
