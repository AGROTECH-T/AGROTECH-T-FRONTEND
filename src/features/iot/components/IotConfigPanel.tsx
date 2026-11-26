/**
 * Configuración IoT de una finca.
 *
 * Propósito: alta y baja de dispositivos con guía, confirmación y layout claro.
 * Contexto: solo quien tiene can_manage_iot; secretos una sola vez.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useState } from "react";
import { ConfirmModal } from "../../inventario/components/ConfirmModal.tsx";
import { ApiError } from "../../../services/api/client.ts";
import type { IotCoordinator, IotDevice, IotSensor } from "../services/iotApi.ts";
import {
  authorizeGateway,
  createCoordinator,
  createGateway,
  createSensor,
  createSensorSource,
  deactivateCoordinator,
  deactivateGateway,
  deactivateSensor,
  deactivateSensorSource,
  IOT_METRICS,
  listAuthorizations,
  listFarmCoordinators,
  listFarmGateways,
  listFarmSensors,
  listSensorSources,
  revokeAuthorization,
  type CoordinatorIssued,
  type GatewayAuthorization,
  type GatewayIssued,
  type SensorSource,
} from "../services/iotProvisioning.ts";
import { IotGuide, IotStepCard } from "./iotUi.tsx";

type Props = {
  farmId: number;
  canManage: boolean;
  onChanged?: () => void;
};

type Notice = { tone: "ok" | "warn"; text: string };

type Pending =
  | { kind: "create-gateway"; name: string; location_label?: string }
  | { kind: "create-coordinator"; name: string; location_label?: string }
  | { kind: "authorize"; coordinatorUid: string; gatewayUid: string }
  | { kind: "create-source"; coordinator_uid: string; name: string; model?: string }
  | {
      kind: "create-sensor";
      coordinator_uid: string;
      source_uid: string;
      channel: number;
      metric: string;
    }
  | { kind: "deactivate-gateway"; uid: string; label: string }
  | { kind: "deactivate-coordinator"; uid: string; label: string }
  | { kind: "deactivate-source"; uid: string; label: string }
  | { kind: "deactivate-sensor"; uid: string; label: string }
  | { kind: "revoke-auth"; coordinatorUid: string; gatewayUid: string };

function errorText(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.isForbidden) return "No tienes permiso para configurar Sensores en esta finca.";
    if (cause.isUnauthorized) return "Tu sesión terminó. Vuelve a iniciar sesión.";
    return cause.message;
  }
  return cause instanceof Error ? cause.message : "No se pudo completar la operación.";
}

function confirmCopy(pending: Pending): { text: string; confirmLabel: string } {
  switch (pending.kind) {
    case "create-gateway":
      return {
        text: `¿Registrar el gateway "${pending.name}"? Luego verás la contraseña MQTT una sola vez.`,
        confirmLabel: "Sí, registrar",
      };
    case "create-coordinator":
      return {
        text: `¿Registrar el coordinador "${pending.name}"? Luego verás la clave de aprovisionamiento una sola vez.`,
        confirmLabel: "Sí, registrar",
      };
    case "authorize":
      return {
        text: "¿Autorizar este par coordinador–gateway? Solo ese gateway podrá entregar tramas de ese coordinador.",
        confirmLabel: "Sí, autorizar",
      };
    case "create-source":
      return {
        text: `¿Registrar la fuente "${pending.name}"? Es el sensor físico ligado al coordinador.`,
        confirmLabel: "Sí, registrar",
      };
    case "create-sensor":
      return {
        text: `¿Registrar el canal ${pending.channel} (${pending.metric})? Quedará listo para recibir mediciones.`,
        confirmLabel: "Sí, registrar",
      };
    case "deactivate-gateway":
      return {
        text: `¿Dar de baja el gateway "${pending.label}"? Se revocan autorizaciones y credenciales.`,
        confirmLabel: "Sí, dar de baja",
      };
    case "deactivate-coordinator":
      return {
        text: `¿Dar de baja el coordinador "${pending.label}"? También se desactivan sus sensores vinculados.`,
        confirmLabel: "Sí, dar de baja",
      };
    case "deactivate-source":
      return {
        text: `¿Dar de baja la fuente "${pending.label}"?`,
        confirmLabel: "Sí, dar de baja",
      };
    case "deactivate-sensor":
      return {
        text: `¿Dar de baja el sensor "${pending.label}"? Liberará su canal.`,
        confirmLabel: "Sí, dar de baja",
      };
    case "revoke-auth":
      return {
        text: "¿Revocar esta autorización? El gateway dejará de poder entregar tramas de ese coordinador.",
        confirmLabel: "Sí, revocar",
      };
  }
}

export function IotConfigPanel({ farmId, canManage, onChanged }: Readonly<Props>) {
  const [gateways, setGateways] = useState<IotDevice[]>([]);
  const [coordinators, setCoordinators] = useState<IotCoordinator[]>([]);
  const [sources, setSources] = useState<SensorSource[]>([]);
  const [sensors, setSensors] = useState<IotSensor[]>([]);
  const [auths, setAuths] = useState<GatewayAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [gatewaySecret, setGatewaySecret] = useState<GatewayIssued | null>(null);
  const [coordinatorSecret, setCoordinatorSecret] = useState<CoordinatorIssued | null>(null);

  const [gwName, setGwName] = useState("");
  const [gwLocation, setGwLocation] = useState("");
  const [coName, setCoName] = useState("");
  const [coLocation, setCoLocation] = useState("");
  const [authCoordinator, setAuthCoordinator] = useState("");
  const [authGateway, setAuthGateway] = useState("");
  const [sourceCoordinator, setSourceCoordinator] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceModel, setSourceModel] = useState("");
  const [sensorCoordinator, setSensorCoordinator] = useState("");
  const [sensorSource, setSensorSource] = useState("");
  const [sensorChannel, setSensorChannel] = useState("1");
  const [sensorMetric, setSensorMetric] = useState("temperature");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [gw, co, src, sn] = await Promise.all([
        listFarmGateways(farmId),
        listFarmCoordinators(farmId),
        listSensorSources(farmId),
        listFarmSensors(farmId),
      ]);
      setGateways(gw.results);
      setCoordinators(co.results);
      setSources(src.results);
      setSensors(sn.results);
      setAuthCoordinator((current) => current || co.results[0]?.uid || "");
      setAuthGateway((current) => current || gw.results[0]?.uid || "");
      setSourceCoordinator((current) => current || co.results[0]?.uid || "");
      setSensorCoordinator((current) => current || co.results[0]?.uid || "");

      const coordinatorUid = co.results[0]?.uid;
      if (coordinatorUid) {
        try {
          const pages = await Promise.all(
            co.results.map((row) => listAuthorizations(farmId, row.uid)),
          );
          setAuths(pages.flatMap((page) => page.results).filter((row) => row.active));
        } catch {
          setAuths([]);
        }
      } else {
        setAuths([]);
      }
    } catch (cause) {
      setNotice({ tone: "warn", text: errorText(cause) });
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const filtered = sources.filter((row) => row.coordinator_uid === sensorCoordinator && row.is_active);
    if (filtered.length && !filtered.some((row) => row.uid === sensorSource)) {
      setSensorSource(filtered[0].uid);
    }
    if (!filtered.length) setSensorSource("");
  }, [sensorCoordinator, sources, sensorSource]);

  const afterChange = async () => {
    onChanged?.();
    await refresh();
  };

  const applyPending = async () => {
    if (!pending || !canManage || busy) return;
    const action = pending;
    setPending(null);
    setBusy(true);
    setNotice(null);
    try {
      switch (action.kind) {
        case "create-gateway": {
          const issued = await createGateway(farmId, {
            name: action.name,
            location_label: action.location_label,
          });
          setGatewaySecret(issued);
          setGwName("");
          setGwLocation("");
          setNotice({ tone: "ok", text: `Gateway ${issued.uid} registrado. Guarda la contraseña ahora.` });
          break;
        }
        case "create-coordinator": {
          const issued = await createCoordinator(farmId, {
            name: action.name,
            location_label: action.location_label,
          });
          setCoordinatorSecret(issued);
          setCoName("");
          setCoLocation("");
          setNotice({ tone: "ok", text: `Coordinador ${issued.uid} registrado. Guarda la clave ahora.` });
          break;
        }
        case "authorize":
          await authorizeGateway(farmId, action.coordinatorUid, action.gatewayUid);
          setNotice({ tone: "ok", text: "Par coordinador–gateway autorizado." });
          break;
        case "create-source": {
          const created = await createSensorSource(farmId, {
            coordinator_uid: action.coordinator_uid,
            name: action.name,
            model: action.model,
            role: "primary",
          });
          setSourceName("");
          setSourceModel("");
          setNotice({ tone: "ok", text: `Fuente "${created.name}" creada.` });
          break;
        }
        case "create-sensor": {
          const created = await createSensor(farmId, {
            coordinator_uid: action.coordinator_uid,
            source_uid: action.source_uid,
            channel: action.channel,
            metric: action.metric,
          });
          setNotice({ tone: "ok", text: `Sensor ${created.uid} registrado.` });
          break;
        }
        case "deactivate-gateway":
          await deactivateGateway(farmId, action.uid);
          setNotice({ tone: "ok", text: "Gateway dado de baja." });
          break;
        case "deactivate-coordinator":
          await deactivateCoordinator(farmId, action.uid);
          setNotice({ tone: "ok", text: "Coordinador dado de baja." });
          break;
        case "deactivate-source":
          await deactivateSensorSource(farmId, action.uid);
          setNotice({ tone: "ok", text: "Fuente dada de baja." });
          break;
        case "deactivate-sensor":
          await deactivateSensor(farmId, action.uid);
          setNotice({ tone: "ok", text: "Sensor dado de baja." });
          break;
        case "revoke-auth":
          await revokeAuthorization(farmId, action.coordinatorUid, action.gatewayUid);
          setNotice({ tone: "ok", text: "Autorización revocada." });
          break;
      }
      await afterChange();
    } catch (cause) {
      setNotice({ tone: "warn", text: errorText(cause) });
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <div className="iot-message">
        <strong>Solo consulta</strong>
        <p>Puedes ver dispositivos y lecturas, pero no configurar Sensores en esta finca.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="iot-message" role="status">Cargando configuración de Sensores…</div>;
  }

  const sourceOptions = sources.filter(
    (row) => row.coordinator_uid === sensorCoordinator && row.is_active,
  );
  const confirm = pending ? confirmCopy(pending) : null;

  return (
    <div className="iot-config">
      <IotGuide
        title="Cómo configurar Sensores en esta finca"
        lead="Sigue el orden. Cada finca registra solo sus equipos."
        steps={[
          "Registra el gateway (ESP32 con Wi‑Fi/MQTT) y guarda la contraseña que aparece una sola vez.",
          "Registra el coordinador (ESP32 con sensores) y guarda su clave de aprovisionamiento.",
          "Autoriza el par: qué gateway puede entregar tramas de qué coordinador.",
          "Crea la fuente física (por ejemplo BME680) ligada al coordinador.",
          "Registra cada canal/métrica (temperatura, humedad). Luego carga las credenciales en el firmware.",
        ]}
        example="Gateway “Galpón 1” + Coordinador “Ambiente” + fuente BME680 + canal 1 temperatura y canal 2 humedad."
      />

      {notice ? (
        <div className={`iot-banner iot-banner--${notice.tone}`} role="status">
          <p>{notice.text}</p>
        </div>
      ) : null}

      {gatewaySecret ? (
        <aside className="iot-secret" role="status">
          <strong>Credencial del gateway — guárdala ahora</strong>
          <p className="iot-muted">No se vuelve a mostrar. Cárgala en el ESP32 del gateway.</p>
          <dl>
            <div><dt>UID / usuario MQTT</dt><dd>{gatewaySecret.username}</dd></div>
            <div><dt>Contraseña</dt><dd className="iot-secret__value">{gatewaySecret.password}</dd></div>
            <div><dt>Versión</dt><dd>{gatewaySecret.key_version}</dd></div>
          </dl>
          <button type="button" className="btn-secondary" onClick={() => setGatewaySecret(null)}>
            Ya la guardé
          </button>
        </aside>
      ) : null}

      {coordinatorSecret ? (
        <aside className="iot-secret" role="status">
          <strong>Clave del coordinador — guárdala ahora</strong>
          <p className="iot-muted">No se vuelve a mostrar. Cárgala en NVS del ESP32 coordinador.</p>
          <dl>
            <div><dt>UID</dt><dd>{coordinatorSecret.uid}</dd></div>
            <div><dt>Clave</dt><dd className="iot-secret__value">{coordinatorSecret.provisioning_key}</dd></div>
            <div><dt>Versión</dt><dd>{coordinatorSecret.key_version}</dd></div>
          </dl>
          <button type="button" className="btn-secondary" onClick={() => setCoordinatorSecret(null)}>
            Ya la guardé
          </button>
        </aside>
      ) : null}

      <IotStepCard
        step={1}
        title="Gateway"
        tip="Es el ESP32 que recibe LoRa y publica por Wi‑Fi al broker MQTT."
      >
        <div className="iot-form">
          <label className="iot-form__field">
            <span>Nombre</span>
            <input value={gwName} onChange={(e) => setGwName(e.target.value)} placeholder="Ej. Gateway galpón 1" disabled={busy} />
          </label>
          <label className="iot-form__field">
            <span>Ubicación (opcional)</span>
            <input value={gwLocation} onChange={(e) => setGwLocation(e.target.value)} placeholder="Ej. Entrada norte" disabled={busy} />
          </label>
          <div className="iot-form__actions">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !gwName.trim()}
              onClick={() =>
                setPending({
                  kind: "create-gateway",
                  name: gwName.trim(),
                  location_label: gwLocation.trim() || undefined,
                })
              }
            >
              Registrar gateway
            </button>
          </div>
        </div>
        <ul className="iot-roster">
          {gateways.length === 0 ? <li className="iot-roster__empty">Todavía no hay gateways en esta finca.</li> : null}
          {gateways.map((row) => (
            <li key={row.uid}>
              <div>
                <strong>{row.name || row.uid}</strong>
                <span className="iot-muted">{row.uid}{row.location_label ? ` · ${row.location_label}` : ""}</span>
              </div>
              <button
                type="button"
                className="btn-danger iot-roster__action"
                disabled={busy}
                onClick={() =>
                  setPending({
                    kind: "deactivate-gateway",
                    uid: row.uid,
                    label: row.name || row.uid,
                  })
                }
              >
                Dar de baja
              </button>
            </li>
          ))}
        </ul>
      </IotStepCard>

      <IotStepCard
        step={2}
        title="Coordinador"
        tip="Es el ESP32 que lee los sensores por cable y envía la trama LoRa firmada."
      >
        <div className="iot-form">
          <label className="iot-form__field">
            <span>Nombre</span>
            <input value={coName} onChange={(e) => setCoName(e.target.value)} placeholder="Ej. Coordinador ambiente" disabled={busy} />
          </label>
          <label className="iot-form__field">
            <span>Ubicación (opcional)</span>
            <input value={coLocation} onChange={(e) => setCoLocation(e.target.value)} placeholder="Ej. Centro del galpón" disabled={busy} />
          </label>
          <div className="iot-form__actions">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !coName.trim()}
              onClick={() =>
                setPending({
                  kind: "create-coordinator",
                  name: coName.trim(),
                  location_label: coLocation.trim() || undefined,
                })
              }
            >
              Registrar coordinador
            </button>
          </div>
        </div>
        <ul className="iot-roster">
          {coordinators.length === 0 ? <li className="iot-roster__empty">Todavía no hay coordinadores.</li> : null}
          {coordinators.map((row) => (
            <li key={row.uid}>
              <div>
                <strong>{row.name || row.uid}</strong>
                <span className="iot-muted">{row.uid}{row.location_label ? ` · ${row.location_label}` : ""}</span>
              </div>
              <button
                type="button"
                className="btn-danger iot-roster__action"
                disabled={busy}
                onClick={() =>
                  setPending({
                    kind: "deactivate-coordinator",
                    uid: row.uid,
                    label: row.name || row.uid,
                  })
                }
              >
                Dar de baja
              </button>
            </li>
          ))}
        </ul>
      </IotStepCard>

      <IotStepCard
        step={3}
        title="Autorizar par"
        tip="Indica qué gateway puede entregar las tramas de qué coordinador."
      >
        <div className="iot-form">
          <label className="iot-form__field">
            <span>Coordinador</span>
            <select value={authCoordinator} onChange={(e) => setAuthCoordinator(e.target.value)} disabled={busy}>
              <option value="">Selecciona un coordinador</option>
              {coordinators.map((row) => (
                <option key={row.uid} value={row.uid}>{row.name || row.uid}</option>
              ))}
            </select>
          </label>
          <label className="iot-form__field">
            <span>Gateway</span>
            <select value={authGateway} onChange={(e) => setAuthGateway(e.target.value)} disabled={busy}>
              <option value="">Selecciona un gateway</option>
              {gateways.map((row) => (
                <option key={row.uid} value={row.uid}>{row.name || row.uid}</option>
              ))}
            </select>
          </label>
          <div className="iot-form__actions">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !authCoordinator || !authGateway}
              onClick={() =>
                setPending({
                  kind: "authorize",
                  coordinatorUid: authCoordinator,
                  gatewayUid: authGateway,
                })
              }
            >
              Autorizar par
            </button>
          </div>
        </div>
        <ul className="iot-roster">
          {auths.length === 0 ? <li className="iot-roster__empty">No hay autorizaciones activas.</li> : null}
          {auths.map((row) => (
            <li key={`${row.coordinator_uid}-${row.gateway_uid}`}>
              <div>
                <strong>{row.coordinator_uid}</strong>
                <span className="iot-muted">→ {row.gateway_uid}</span>
              </div>
              <button
                type="button"
                className="btn-danger iot-roster__action"
                disabled={busy}
                onClick={() =>
                  setPending({
                    kind: "revoke-auth",
                    coordinatorUid: row.coordinator_uid,
                    gatewayUid: row.gateway_uid,
                  })
                }
              >
                Revocar
              </button>
            </li>
          ))}
        </ul>
      </IotStepCard>

      <IotStepCard
        step={4}
        title="Fuente física"
        tip="El hardware real (BME680, DHT11, etc.) conectado al coordinador."
      >
        <div className="iot-form">
          <label className="iot-form__field">
            <span>Coordinador</span>
            <select value={sourceCoordinator} onChange={(e) => setSourceCoordinator(e.target.value)} disabled={busy}>
              <option value="">Selecciona un coordinador</option>
              {coordinators.map((row) => (
                <option key={row.uid} value={row.uid}>{row.name || row.uid}</option>
              ))}
            </select>
          </label>
          <label className="iot-form__field">
            <span>Nombre de la fuente</span>
            <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Ej. BME680 principal" disabled={busy} />
          </label>
          <label className="iot-form__field">
            <span>Modelo (opcional)</span>
            <input value={sourceModel} onChange={(e) => setSourceModel(e.target.value)} placeholder="Ej. BME680" disabled={busy} />
          </label>
          <div className="iot-form__actions">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !sourceCoordinator || !sourceName.trim()}
              onClick={() =>
                setPending({
                  kind: "create-source",
                  coordinator_uid: sourceCoordinator,
                  name: sourceName.trim(),
                  model: sourceModel.trim() || undefined,
                })
              }
            >
              Registrar fuente
            </button>
          </div>
        </div>
        <ul className="iot-roster">
          {sources.filter((row) => row.is_active).length === 0 ? (
            <li className="iot-roster__empty">Todavía no hay fuentes activas.</li>
          ) : null}
          {sources.filter((row) => row.is_active).map((row) => (
            <li key={row.uid}>
              <div>
                <strong>{row.name}</strong>
                <span className="iot-muted">{row.model || "Sin modelo"} · {row.coordinator_uid}</span>
              </div>
              <button
                type="button"
                className="btn-danger iot-roster__action"
                disabled={busy}
                onClick={() =>
                  setPending({
                    kind: "deactivate-source",
                    uid: row.uid,
                    label: row.name,
                  })
                }
              >
                Dar de baja
              </button>
            </li>
          ))}
        </ul>
      </IotStepCard>

      <IotStepCard
        step={5}
        title="Sensor (canal y métrica)"
        tip="Cada canal es una medición lógica que verás en Resumen e Historial."
      >
        <div className="iot-form iot-form--sensor">
          <label className="iot-form__field">
            <span>Coordinador</span>
            <select value={sensorCoordinator} onChange={(e) => setSensorCoordinator(e.target.value)} disabled={busy}>
              <option value="">Selecciona</option>
              {coordinators.map((row) => (
                <option key={row.uid} value={row.uid}>{row.name || row.uid}</option>
              ))}
            </select>
          </label>
          <label className="iot-form__field">
            <span>Fuente</span>
            <select value={sensorSource} onChange={(e) => setSensorSource(e.target.value)} disabled={busy || !sourceOptions.length}>
              <option value="">{sourceOptions.length ? "Selecciona" : "Primero crea una fuente"}</option>
              {sourceOptions.map((row) => (
                <option key={row.uid} value={row.uid}>{row.name}</option>
              ))}
            </select>
          </label>
          <label className="iot-form__field">
            <span>Canal</span>
            <input type="number" min={1} max={65535} value={sensorChannel} onChange={(e) => setSensorChannel(e.target.value)} disabled={busy} />
          </label>
          <label className="iot-form__field">
            <span>Métrica</span>
            <select value={sensorMetric} onChange={(e) => setSensorMetric(e.target.value)} disabled={busy}>
              {IOT_METRICS.map((metric) => (
                <option key={metric.value} value={metric.value}>{metric.label}</option>
              ))}
            </select>
          </label>
          <div className="iot-form__actions">
            <button
              type="button"
              className="btn-primary"
              disabled={busy || !sensorCoordinator || !sensorSource || !Number(sensorChannel)}
              onClick={() =>
                setPending({
                  kind: "create-sensor",
                  coordinator_uid: sensorCoordinator,
                  source_uid: sensorSource,
                  channel: Number(sensorChannel),
                  metric: sensorMetric,
                })
              }
            >
              Registrar sensor
            </button>
          </div>
        </div>
        <ul className="iot-roster">
          {sensors.filter((row) => row.is_active).length === 0 ? (
            <li className="iot-roster__empty">Todavía no hay sensores activos.</li>
          ) : null}
          {sensors.filter((row) => row.is_active).map((row) => (
            <li key={row.uid}>
              <div>
                <strong>{IOT_METRICS.find((m) => m.value === row.metric)?.label ?? row.metric}</strong>
                <span className="iot-muted">canal {row.channel} · {row.uid}</span>
              </div>
              <button
                type="button"
                className="btn-danger iot-roster__action"
                disabled={busy}
                onClick={() =>
                  setPending({
                    kind: "deactivate-sensor",
                    uid: row.uid,
                    label: `${row.metric} · canal ${row.channel}`,
                  })
                }
              >
                Dar de baja
              </button>
            </li>
          ))}
        </ul>
      </IotStepCard>

      {pending && confirm ? (
        <ConfirmModal
          text={confirm.text}
          confirmLabel={confirm.confirmLabel}
          closeLabel="Cancelar"
          onConfirm={() => void applyPending()}
          onClose={() => setPending(null)}
        />
      ) : null}
    </div>
  );
}
