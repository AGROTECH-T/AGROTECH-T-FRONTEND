/**
 * Contratos de los avisos del sistema.
 *
 * Propósito: tipar las alertas de stock que muestra la campana.
 * @author Cristian Deysdayr Jimenez
 */

export type AlertKind = "bajo" | "agotado";

export type Alert = {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  farm_id: number;
  farm: string;
  product_id: number;
  product: string;
  quantity: string;
  min: string;
  unit: string;
};

export type AlertList = {
  count: number;
  results: Alert[];
};
