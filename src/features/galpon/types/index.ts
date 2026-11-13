/**
 * Contratos del módulo de galpón.
 *
 * @author Cristian Deysdayr Jimenez
 */

export type House = {
  id: number;
  name: string;
  location: string;
  length_m: string | null;
  width_m: string | null;
  area_m2: string | null;
  capacity: number | null;
  usual_birds: number | null;
  equipment: string;
  status: string;
  bale_kg: string | null;
  bales_per_drum: string | null;
  feed_mode: string;
  cycle_days: number | null;
  mortality_alert: number | null;
  open_lot_id: number | null;
  open_lot_code: string;
  live_count: number | null;
  birds_per_m2: string | null;
  lots_count: number;
};

export type Lot = {
  id: number;
  house_id: number;
  house_name: string;
  code: string;
  arrived_at: string;
  received: number;
  dead_on_arrival: number;
  discarded_on_arrival: number;
  live_count: number;
  supplier: string;
  documents: string;
  initial_age_days: number;
  initial_weight: string | null;
  stage: string;
  levante_on: string | null;
  engorde_on: string | null;
  feed_type: string;
  reception_notes: string;
  receiver_name: string;
  status: string;
  closed_at: string | null;
  close_summary: Record<string, unknown>;
  age_days: number;
  summary?: LotSummary;
};

export type LotSummary = {
  received: number;
  live_count: number;
  dead_on_arrival: number;
  discarded_on_arrival: number;
  mortality: number;
  discards: number;
  exits: number;
  isolated: number;
  birds_per_m2: string | null;
  age_days: number;
  stage: string;
  last_weight: string | null;
  weight_change: string | null;
  weight_is_sample: boolean;
  feed: {
    by_stage: Record<string, { medido: string; estimado: string }>;
    measured_kg: string;
    estimated: boolean;
  };
  conversion: string | null;
  conversion_note: string;
  water_points: { at: string; value: string; estimated: boolean }[];
  bedding_notes: number;
  open_alerts: number;
  pending: string[];
};

export type LotCorrection = {
  reason: string;
  at: string;
  previous: Record<string, unknown>;
};

export type LotEvent = {
  id: number;
  lot_id: number;
  kind: string;
  occurred_at: string;
  recorded_at: string;
  responsible: string;
  observed_value: string | null;
  unit: string;
  place: string;
  notes: string;
  origin: string;
  attention: string;
  state: string;
  action: string;
  assignee: string;
  follow_up: string | null;
  estimated: boolean;
  confirmed: boolean;
  payload: Record<string, unknown>;
  corrections: LotCorrection[];
};

export type LotAlert = {
  id: number;
  lot_id: number;
  lot_code: string;
  house_name: string;
  motive: string;
  assignee: string;
  state: string;
  follow_up: string;
  created_at: string;
};

export type HouseDraft = {
  name: string;
  location: string;
  length_m: string;
  width_m: string;
  capacity: string;
  usual_birds: string;
  bale_kg: string;
  bales_per_drum: string;
  feed_mode: string;
  cycle_days: string;
  status: string;
};

export type LotDraft = {
  house_id: string;
  code: string;
  arrived_at: string;
  received: string;
  dead_on_arrival: string;
  discarded_on_arrival: string;
  supplier: string;
  documents: string;
  initial_age_days: string;
  initial_weight: string;
  stage: string;
  levante_on: string;
  engorde_on: string;
  feed_type: string;
  reception_notes: string;
  receiver_name: string;
};
