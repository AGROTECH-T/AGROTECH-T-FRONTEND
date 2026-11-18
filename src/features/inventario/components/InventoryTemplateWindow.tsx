/**
 * Carga de productos por plantilla Excel.
 *
 * Propósito: entregar un Excel vacío, dejar llenar las siete columnas e
 * importar creando productos (y catálogo nuevo si hace falta).
 * @author Cristian Deysdayr Jimenez
 */

import { useRef, useState, type ChangeEvent } from "react";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { downloadInventoryTemplate, importInventory } from "../services/inventoryApi.ts";
import type { ImportReport } from "../types/index.ts";
import { ConfirmModal } from "./ConfirmModal.tsx";

type Props = {
  farmId: number;
  canWrite: boolean;
  onClose: () => void;
  onImported: (report: ImportReport) => void;
  onNotice?: (message: string) => void;
};

/**
 * Ventana con la descarga de la plantilla y la carga del archivo.
 * @param props - Finca, permisos y avisos.
 * @returns Ventana de plantilla.
 */
export function InventoryTemplateWindow({
  farmId,
  canWrite,
  onClose,
  onImported,
  onNotice,
}: Readonly<Props>) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [note, setNote] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [ask, setAsk] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const download = async () => {
    setDownloading(true);
    setNote("");
    try {
      await downloadInventoryTemplate(farmId);
      onNotice?.("plantilla descargada");
    } catch (cause) {
      setNote(messageOf(cause, "No se pudo descargar la plantilla"));
    } finally {
      setDownloading(false);
    }
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = "";
    setReport(null);
    setNote("");
    if (picked && !picked.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setNote("El archivo debe ser .xlsx.");
      return;
    }
    setFile(picked);
  };

  const confirm = async () => {
    if (!file) return;
    setImporting(true);
    setNote("");
    setReport(null);
    try {
      const result = await importInventory(farmId, file);
      setReport(result);
      onImported(result);
      onNotice?.(result.created || result.updated ? "inventario importado" : "la plantilla no trajo cambios");
    } catch (cause) {
      setNote(messageOf(cause, "No se pudo importar el inventario"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <FormWindow title="Cargar inventario" onClose={onClose}>
      <div className="inv-template">
        <section className="inv-template__block">
          <h3 className="inv-template__title">Descargar plantilla</h3>
          <button
            type="button"
            className="btn-primary inv-template__wide"
            onClick={() => void download()}
            disabled={downloading || importing}
          >
            {downloading ? "Descargando..." : "Descargar plantilla"}
          </button>
        </section>

        {canWrite ? (
          <section className="inv-template__block">
            <h3 className="inv-template__title">Importar inventario</h3>
            <p className="inv-template__lead">
              Si aparece una categoría, unidad o equivalencia nueva, se crea sola.
            </p>
            <input
              ref={picker}
              type="file"
              accept=".xlsx"
              className="visually-hidden"
              aria-label="Elegir archivo de inventario"
              onChange={choose}
              disabled={importing}
            />
            <button
              type="button"
              className="btn-secondary inv-template__wide"
              onClick={() => picker.current?.click()}
              disabled={importing}
            >
              Elegir archivo
            </button>
            <div className="inv-template__import">
              <input
                readOnly
                value={file?.name ?? ""}
                placeholder="Ningún archivo elegido"
                aria-label="Archivo cargado"
                title={file?.name ?? "Aún no has elegido un archivo"}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => setAsk(true)}
                disabled={!file || importing}
              >
                {importing ? "Importando..." : "Importar inventario"}
              </button>
            </div>
          </section>
        ) : (
          <p className="inv-template__lead">
            Solo quien registra movimientos puede importar el inventario.
          </p>
        )}

        {note ? (
          <p className="inv-form__error" role="alert">
            {note}
          </p>
        ) : null}
        {report ? <ImportSummary report={report} /> : null}
      </div>
      {ask && file ? (
        <ConfirmModal
          text={`¿Importar «${file.name}»? Se crearán productos nuevos y se actualizarán los que ya existan.`}
          confirmLabel="Sí, importar"
          closeLabel="Revisar"
          onConfirm={() => {
            setAsk(false);
            void confirm();
          }}
          onClose={() => setAsk(false)}
        />
      ) : null}
    </FormWindow>
  );
}

/**
 * Resultado de la corrida, con las filas que no se pudieron guardar.
 * @param props - Resumen del servidor.
 * @returns Bloque de resultado.
 */
function ImportSummary({ report }: Readonly<{ report: ImportReport }>) {
  return (
    <section className="inv-template__report" role="status">
      <h3 className="inv-template__title">Resultado</h3>
      <p>
        {countText(report.created, "creado", "creados")} ·{" "}
        {countText(report.updated, "actualizado", "actualizados")}
        {report.unchanged > 0 ? ` · ${countText(report.unchanged, "sin cambios", "sin cambios")}` : ""}
      </p>
      {report.categories > 0 || report.units > 0 ? (
        <p className="inv-template__note">
          Catálogo nuevo: {countText(report.categories, "categoría", "categorías")} y{" "}
          {countText(report.units, "unidad", "unidades")}.
        </p>
      ) : null}
      {report.errors.length > 0 ? (
        <>
          <p className="inv-form__error">
            {countText(report.errors.length, "fila con error", "filas con error")}:
          </p>
          <ul className="inv-template__errors">
            {report.errors.map((item) => (
              <li key={item.row}>
                Fila {item.row}: {item.message}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="inv-template__note">Sin errores.</p>
      )}
    </section>
  );
}

/**
 * Texto con la palabra en singular o plural.
 * @param total - Cantidad.
 * @param one - Singular.
 * @param many - Plural.
 * @returns Cantidad y palabra.
 */
function countText(total: number, one: string, many: string): string {
  return `${total} ${total === 1 ? one : many}`;
}

/**
 * Mensaje de error legible.
 * @param cause - Error recibido.
 * @param fallback - Texto por defecto.
 * @returns Mensaje para la persona.
 */
function messageOf(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}
