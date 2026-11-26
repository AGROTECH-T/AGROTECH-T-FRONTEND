/**
 * Cliente de configuración IoT por finca.
 *
 * Propósito: alta de gateway, coordinador, autorización, fuente y sensor.
 * Contexto: solo administradores con can_manage_iot; secretos una sola vez.
 * @author Cristian Deysdayr Jimenez
 */

import { getJson, postJson } from "../../../services/api/client.ts";
import { readToken } from "../../auth/services/session.ts";
import type { IotCoordinator, IotDevice, IotPage, IotSensor } from "./iotApi.ts";
import { forgetIot, listAllIot } from "./iotApi.ts";

const base = (farmId: number) => `/api/v1/iot/farms/${farmId}`;

function noted<T>(farmId: number, work: Promise<T>): Promise<T> {
  return work.then((value) => {
    forgetIot(farmId);
    return value;
  });
}

export type DeviceDraft = {
  name: string;
  location_label?: string;
};

export type GatewayIssued = {
  uid: string;
  name: string;
  username: string;
  key_version: number;
  password: string;
};

export type CoordinatorIssued = {
  uid: string;
  name: string;
  key_version: number;
  provisioning_key: string;
};

export type GatewayAuthorization = {
  coordinator_uid: string;
  gateway_uid: string;
  active: boolean;
  authorized_at: string;
  revoked_at: string | null;
};

export type SensorSource = {
  uid: string;
  coordinator_uid: string;
  name: string;
  model: string | null;
  manufacturer: string | null;
  role: "primary" | "backup_comparison";
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SensorSourceDraft = {
  coordinator_uid: string;
  name: string;
  model?: string;
  manufacturer?: string;
  role: "primary" | "backup_comparison";
  description?: string;
};

export type SensorDraft = {
  coordinator_uid: string;
  source_uid: string;
  channel: number;
  metric: string;
};

export const IOT_METRICS = [
  { value: "temperature", label: "Temperatura" },
  { value: "relative_humidity", label: "Humedad relativa" },
] as const;

export function createGateway(farmId: number, draft: DeviceDraft): Promise<GatewayIssued> {
  return noted(farmId, postJson(`${base(farmId)}/gateways/`, draft, readToken()));
}

export function createCoordinator(
  farmId: number,
  draft: DeviceDraft,
): Promise<CoordinatorIssued> {
  return noted(farmId, postJson(`${base(farmId)}/coordinators/`, draft, readToken()));
}

export function authorizeGateway(
  farmId: number,
  coordinatorUid: string,
  gatewayUid: string,
): Promise<GatewayAuthorization> {
  return noted(
    farmId,
    postJson(
      `${base(farmId)}/coordinators/${encodeURIComponent(coordinatorUid)}/gateways/`,
      { gateway_uid: gatewayUid },
      readToken(),
    ),
  );
}

export function createSensorSource(
  farmId: number,
  draft: SensorSourceDraft,
): Promise<SensorSource> {
  return noted(farmId, postJson(`${base(farmId)}/sensor-sources/`, draft, readToken()));
}

export function createSensor(farmId: number, draft: SensorDraft): Promise<IotSensor> {
  return noted(farmId, postJson(`${base(farmId)}/sensors/`, draft, readToken()));
}

export function listSensorSources(
  farmId: number,
  coordinatorUid?: string,
): Promise<IotPage<SensorSource>> {
  const params = new URLSearchParams({ page: "1", page_size: "100" });
  if (coordinatorUid) params.set("coordinator_uid", coordinatorUid);
  return getJson(`${base(farmId)}/sensor-sources/?${params}`, readToken());
}

export function listFarmGateways(farmId: number): Promise<IotPage<IotDevice>> {
  return listAllIot<IotDevice>(farmId, "gateways");
}

export function listFarmCoordinators(farmId: number): Promise<IotPage<IotCoordinator>> {
  return listAllIot<IotCoordinator>(farmId, "coordinators");
}

export function listFarmSensors(farmId: number): Promise<IotPage<IotSensor>> {
  return listAllIot<IotSensor>(farmId, "sensors");
}

export function deactivateGateway(farmId: number, uid: string, reason = ""): Promise<IotDevice> {
  return noted(
    farmId,
    postJson(
      `${base(farmId)}/gateways/${encodeURIComponent(uid)}/deactivate/`,
      { reason },
      readToken(),
    ),
  );
}

export function deactivateCoordinator(
  farmId: number,
  uid: string,
  reason = "",
): Promise<IotCoordinator> {
  return noted(
    farmId,
    postJson(
      `${base(farmId)}/coordinators/${encodeURIComponent(uid)}/deactivate/`,
      { reason },
      readToken(),
    ),
  );
}

export function deactivateSensor(farmId: number, uid: string, reason = ""): Promise<IotSensor> {
  return noted(
    farmId,
    postJson(
      `${base(farmId)}/sensors/${encodeURIComponent(uid)}/deactivate/`,
      { reason },
      readToken(),
    ),
  );
}

export function deactivateSensorSource(
  farmId: number,
  sourceUid: string,
  reason = "",
): Promise<SensorSource> {
  return noted(
    farmId,
    postJson(
      `${base(farmId)}/sensor-sources/${encodeURIComponent(sourceUid)}/deactivate/`,
      { reason },
      readToken(),
    ),
  );
}

export function listAuthorizations(
  farmId: number,
  coordinatorUid: string,
): Promise<IotPage<GatewayAuthorization>> {
  const params = new URLSearchParams({
    page: "1",
    page_size: "100",
    include_revoked: "false",
  });
  return getJson(
    `${base(farmId)}/coordinators/${encodeURIComponent(coordinatorUid)}/gateways/?${params}`,
    readToken(),
  );
}

export function revokeAuthorization(
  farmId: number,
  coordinatorUid: string,
  gatewayUid: string,
  reason = "",
): Promise<GatewayAuthorization> {
  return noted(
    farmId,
    postJson(
      `${base(farmId)}/coordinators/${encodeURIComponent(coordinatorUid)}/gateways/${encodeURIComponent(gatewayUid)}/revoke/`,
      { reason },
      readToken(),
    ),
  );
}
