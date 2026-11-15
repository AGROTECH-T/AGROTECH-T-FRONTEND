/**
 * Pantalla de lotes de un galpón.
 *
 * Propósito: listar y administrar los lotes de este galpón, sin repetir
 * la ficha que ya se vio en la lista de galpones.
 * Contexto: un galpón puede tener varios lotes; solo uno está abierto a la vez.
 * Las medidas quedan detrás de Ver datos.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { ConfirmModal } from "../../inventario/components/ConfirmModal.tsx";
import { deleteHouse, updateHouse } from "../services/galponApi.ts";
import type { House, HouseDraft, Lot } from "../types/index.ts";
import { HouseForm } from "./HouseForm.tsx";
import { LotsSection } from "./LotsSection.tsx";
import { ExtraBlock, FEED_MODES, GalponCard, Guide, numberText } from "./galponUi.tsx";

type Props = {
  farmId: number;
  house: House;
  lots: Lot[];
  canWrite: boolean;
  onOpenLot: (lotId: number) => void;
  onChanged: () => Promise<void>;
  notify: (text: string, tone?: "ok" | "warn") => void;
};

const GUIDE = {
  title: "Cómo se usa un galpón",
  lead: "Aquí ves los lotes de este galpón. Abre uno para anotar su bitácora.",
  steps: [
    "Cada llegada de aves es un lote nuevo dentro de este galpón.",
    "Abre el lote para anotar la bitácora y revisar los indicadores.",
    "Cuando salgan las aves, cierra el lote. El galpón queda disponible.",
    "Después puedes crear otro lote en el mismo galpón, cuando lleguen más aves.",
  ],
  example:
    "Galpón 2 recibió 55 aves en el lote 856. Al cerrarlo, el galpón queda disponible; cuando llegue el próximo pedido, creas un lote nuevo y el historial anterior se conserva.",
};

type Dato = { label: string; value: string };

/**
 * Lotes del galpón abierto.
 * @param props - Galpón, sus lotes, permiso y acciones.
 * @returns Guía, datos plegados y listado de lotes.
 */
export function HouseWorkspace({
  farmId,
  house,
  lots,
  canWrite,
  onOpenLot,
  onChanged,
  notify,
}: Readonly<Props>) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const datos = datosRegistrados(house);

  const save = async (draft: HouseDraft) => {
    setSaving(true);
    setError("");
    try {
      await updateHouse(farmId, house.id, payload(draft));
      notify(`Galpón “${draft.name.trim()}” actualizado.`);
      setEditing(false);
      await onChanged();
    } catch (cause) {
      const text = message(cause, "No se pudo guardar el galpón");
      setError(text);
      notify(text, "warn");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError("");
    try {
      await deleteHouse(farmId, house.id);
      notify(`Galpón “${house.name}” eliminado.`);
      setRemoving(false);
      await onChanged();
    } catch (cause) {
      const text = message(cause, "No se pudo eliminar el galpón");
      setError(text);
      notify(text, "warn");
      setRemoving(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gp-layout">
      <Guide title={GUIDE.title} lead={GUIDE.lead} steps={GUIDE.steps} example={GUIDE.example} />

      <ExtraBlock title="Datos del galpón">
        {error ? (
          <p className="galpon__error" role="alert">
            {error}
          </p>
        ) : null}
        <GalponCard
          title={house.name}
          subtitle={house.location || "Sin ubicación"}
          action={
            canWrite ? (
              <div className="gp-house-head__actions">
                <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
                  Editar galpón
                </button>
                <button type="button" className="btn-danger" onClick={() => setRemoving(true)}>
                  Eliminar galpón
                </button>
              </div>
            ) : null
          }
        >
          {datos.length ? (
            <dl className="gp-detail__facts">
              {datos.map((dato) => (
                <div key={dato.label}>
                  <dt>{dato.label}</dt>
                  <dd>{dato.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="gp-detail__empty">
              Este galpón todavía no tiene medidas, capacidad ni alimento. Con Editar galpón
              puedes agregarlos.
            </p>
          )}
        </GalponCard>
      </ExtraBlock>

      <LotsSection
        farmId={farmId}
        house={house}
        lots={lots}
        canWrite={canWrite}
        onOpenLot={onOpenLot}
        onChanged={onChanged}
        notify={notify}
      />

      {editing ? (
        <HouseForm
          house={house}
          saving={saving}
          error={error}
          onClose={() => {
            setEditing(false);
            setError("");
          }}
          onSave={(draft) => void save(draft)}
        />
      ) : null}

      {removing ? (
        <ConfirmModal
          text={avisoEliminacion(house)}
          confirmLabel="Sí, eliminar"
          closeLabel="No, volver"
          onConfirm={() => void remove()}
          onClose={() => setRemoving(false)}
        />
      ) : null}
    </div>
  );
}

function avisoEliminacion(house: House): string {
  if (house.lots_count === 0) {
    return `¿Eliminar "${house.name}"? Se quita de la lista y no se puede deshacer.`;
  }
  const lotes = house.lots_count === 1 ? "su 1 lote" : `sus ${house.lots_count} lotes`;
  return `¿Eliminar "${house.name}"? También se borran ${lotes} y toda su bitácora. Esto no se puede deshacer.`;
}

function datosRegistrados(house: House): Dato[] {
  const feedMode = FEED_MODES.find((mode) => mode.id === house.feed_mode)?.label ?? "";
  const largo = house.length_m ? numberText(house.length_m) : "";
  const ancho = house.width_m ? numberText(house.width_m) : "";
  const rows: (Dato | null)[] = [
    house.location ? { label: "Ubicación", value: house.location } : null,
    largo && ancho ? { label: "Medidas", value: `${largo} × ${ancho} m` } : null,
    house.area_m2 ? { label: "Área", value: `${numberText(house.area_m2)} m²` } : null,
    house.capacity ? { label: "Capacidad", value: `${house.capacity} aves` } : null,
    house.usual_birds ? { label: "Aforo habitual", value: `${house.usual_birds} aves` } : null,
    house.bale_kg ? { label: "Bulto", value: `${numberText(house.bale_kg)} kg` } : null,
    house.bales_per_drum
      ? { label: "Bultos por caneca", value: `${numberText(house.bales_per_drum)} bultos` }
      : null,
    feedMode ? { label: "Suministro", value: feedMode } : null,
    house.cycle_days ? { label: "Días del lote", value: `${house.cycle_days} días` } : null,
  ];
  return rows.filter((row): row is Dato => row !== null);
}

function payload(draft: HouseDraft): Record<string, unknown> {
  return {
    name: draft.name.trim(),
    location: draft.location.trim(),
    length_m: draft.length_m || null,
    width_m: draft.width_m || null,
    capacity: draft.capacity ? Number(draft.capacity) : null,
    usual_birds: draft.usual_birds ? Number(draft.usual_birds) : null,
    bale_kg: draft.bale_kg || null,
    bales_per_drum: draft.bales_per_drum || null,
    feed_mode: draft.feed_mode,
    cycle_days: draft.cycle_days ? Number(draft.cycle_days) : null,
  };
}

function message(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
