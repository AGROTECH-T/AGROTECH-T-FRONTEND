/**
 * Pantalla de lotes de un galpón.
 *
 * Propósito: listar y administrar los lotes de este galpón, sin repetir
 * la ficha que ya se vio en la lista de galpones.
 * Contexto: un galpón puede tener varios lotes; solo uno está abierto a la vez.
 * @author Cristian Deysdayr Jimenez
 */

import type { House, Lot } from "../types/index.ts";
import { LotsSection } from "./LotsSection.tsx";
import { Guide } from "./galponUi.tsx";

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
    "Cada llegada de aves es un lote nuevo. En un galpón solo puede haber un lote activo.",
    "Abre el lote para anotar la bitácora y revisar los indicadores.",
    "Cuando salgan las aves, cierra el lote. El galpón queda disponible.",
    "Después puedes crear otro lote en el mismo galpón, cuando lleguen más aves.",
  ],
  example:
    "Galpón 2 recibió 55 aves en el lote 856. Al cerrarlo, el galpón queda disponible; cuando llegue el próximo pedido, creas un lote nuevo y el historial anterior se conserva.",
};

/**
 * Lotes del galpón abierto.
 * @param props - Galpón, sus lotes, permiso y acciones.
 * @returns Guía y listado de lotes.
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
  return (
    <div className="gp-layout">
      <Guide title={GUIDE.title} lead={GUIDE.lead} steps={GUIDE.steps} example={GUIDE.example} />

      <LotsSection
        farmId={farmId}
        house={house}
        lots={lots}
        canWrite={canWrite}
        onOpenLot={onOpenLot}
        onChanged={onChanged}
        notify={notify}
      />
    </div>
  );
}
