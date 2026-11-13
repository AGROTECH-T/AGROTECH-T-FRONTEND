/**
 * Ficha del producto: foto, datos y los dos últimos movimientos.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FormWindow } from "../../../components/ui/FormWindow.tsx";
import { displayQuantity, equivalenceText } from "../services/equivalence.ts";
import {
  downloadProductHistory,
  listMovements,
  removeProductImage,
  uploadProductImage,
} from "../services/inventoryApi.ts";
import { shrinkPhoto } from "../services/photo.ts";
import { stockStatus, stockStatusLabel } from "../services/stockStatus.ts";
import type { Movement, Product } from "../types/index.ts";
import { useProductPhoto } from "./productPhoto.ts";

/**
 * Ventana de ver producto.
 */
export function ProductViewWindow({
  farmId,
  product,
  canWrite,
  onBack,
  onChanged,
}: Readonly<{
  farmId: number;
  product: Product;
  canWrite: boolean;
  onBack: () => void;
  onChanged: (product: Product) => void;
}>) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const photo = useProductPhoto(farmId, product);
  const [openPhoto, setOpenPhoto] = useState(false);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = product.is_active ? stockStatus(product.quantity, product.min_stock) : "inactivo";
  const qty = displayQuantity(product.quantity, product.unit_nature);
  const equivalent = equivalenceText(qty, product.unit_factor, product.base_symbol);

  useEffect(() => {
    void listMovements(farmId, product.id)
      .then(setMovements)
      .catch(() => setMovements([]));
  }, [farmId, product.id, product.updated_at]);

  const savePhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const small = await shrinkPhoto(file);
      onChanged(await uploadProductImage(farmId, product.id, small));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la foto");
    } finally {
      setBusy(false);
    }
  };

  const dropPhoto = async () => {
    setBusy(true);
    setError("");
    setOpenPhoto(false);
    try {
      onChanged(await removeProductImage(farmId, product.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar la foto");
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    setError("");
    try {
      await downloadProductHistory(farmId, product.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo descargar el historial");
    }
  };

  return (
    <FormWindow title="Ver producto" onClose={onBack} wide>
      <div className="form-window__body pv">
        <div className="pv__top">
          <div className="pv__photo">
            {photo ? (
              <button type="button" className="pv__shot" onClick={() => setOpenPhoto(true)}>
                <img src={photo} alt={product.name} />
              </button>
            ) : (
              <div className="pv__empty">Sin foto</div>
            )}
            <span className={status === "ok" ? "pv__badge" : "pv__badge is-warn"}>{stockStatusLabel(status)}</span>
            {canWrite ? (
              <div className="pv__photo-actions">
                <button type="button" disabled={busy} onClick={() => setCamera(true)}>Tomar foto</button>
                <label>
                  Cargar foto
                  <input
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    onChange={(event) => void savePhoto(event.target.files?.[0])}
                  />
                </label>
                {photo ? (
                  <button type="button" disabled={busy} onClick={() => void dropPhoto()}>Eliminar foto actual</button>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="pv__info">
            <h3>{product.name}</h3>
            <p>{product.category_label}</p>
            <ul>
              <li><span>Código</span><strong>{product.barcode || "Sin código"}</strong></li>
              <li><span>Unidad</span><strong>{unitCaption(product)}</strong></li>
              <li>
                <span>Stock actual</span>
                <strong>{qty} {shortUnit(product)}{equivalent ? ` (${equivalent})` : ""}</strong>
              </li>
              <li>
                <span>Stock mínimo</span>
                <strong>{displayQuantity(product.min_stock, product.unit_nature)} {shortUnit(product)}</strong>
              </li>
            </ul>
          </div>
        </div>
        <div className="pv__history">
          <header>
            <h3>Historial reciente</h3>
            <button type="button" className="btn-primary" onClick={() => void download()}>Descargar reporte</button>
          </header>
          {movements.length === 0 ? (
            <p className="panel__lead">Todavía no hay movimientos.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Fecha</th><th>Tipo</th><th>Cantidad</th><th>Usuario</th></tr>
              </thead>
              <tbody>
                {movements.slice(0, 2).map((move) => (
                  <tr key={move.id}>
                    <td>{when(move.created_at)}</td>
                    <td>{kindLabel(move.kind)}</td>
                    <td>{signedQty(move, product)}</td>
                    <td>{move.created_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {error ? <p className="inv-form__error" role="alert">{error}</p> : null}
          <div className="inv-form__actions">
            <button type="button" className="btn-danger" onClick={onBack}>Cerrar</button>
          </div>
        </div>
      </div>
      {openPhoto && photo ? <PhotoLight src={photo} alt={product.name} onClose={() => setOpenPhoto(false)} /> : null}
      {camera ? (
        <CameraShot
          onClose={() => setCamera(false)}
          onShot={(file) => {
            setCamera(false);
            void savePhoto(file);
          }}
        />
      ) : null}
    </FormWindow>
  );
}

export function PhotoLight({ src, alt, onClose }: Readonly<{ src: string; alt: string; onClose: () => void }>) {
  return createPortal(
    <div className="pv-light" role="presentation">
      <button type="button" className="pv-light__shade" aria-label="Cerrar foto" onClick={onClose} />
      <div className="pv-light__frame">
        <img src={src} alt={alt} />
        <button type="button" className="pv-light__x" onClick={onClose}>×</button>
      </div>
    </div>,
    document.body,
  );
}

export function CameraShot({ onClose, onShot }: Readonly<{ onClose: () => void; onShot: (file: File) => void }>) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    const open = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch {
          if (!stopped) setError("No se pudo abrir la cámara.");
          return;
        }
      }
      if (stopped) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }
      if (videoRef.current && stream) videoRef.current.srcObject = stream;
    };
    void open();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      onShot(new File([blob], "camara.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  return createPortal(
    <div className="pv-light" role="presentation">
      <button type="button" className="pv-light__shade" aria-label="Cerrar cámara" onClick={onClose} />
      <div className="pv-cam">
        {error ? <p>{error}</p> : <video ref={videoRef} autoPlay playsInline muted />}
        <div className="inv-form__actions">
          <button type="button" className="btn-danger" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={shoot} disabled={Boolean(error)}>Usar esta foto</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function unitCaption(product: Product): string {
  const factor = Number(product.unit_factor);
  if (!Number.isFinite(factor) || factor === 1) return product.unit_label;
  const content = `${String(factor)} ${product.base_symbol}`;
  if (product.unit_label.toLowerCase().includes(content.toLowerCase())) return product.unit_label;
  return `${product.unit_label} (${content})`;
}

function shortUnit(product: Product): string {
  return product.unit_nature === "continua" ? product.base_symbol : product.unit_label;
}

function when(value: string): string {
  return new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
}

function kindLabel(kind: Movement["kind"]): string {
  if (kind === "entrada") return "Entrada";
  if (kind === "salida") return "Salida";
  return "Ajuste";
}

function signedQty(move: Movement, product: Product): string {
  const unit = shortUnit(product);
  if (move.kind === "ajuste") {
    const delta = Number(move.stock_after) - Number(move.stock_before);
    const text = displayQuantity(String(Math.abs(delta)), product.unit_nature);
    if (delta > 0) return `+${text} ${unit}`;
    if (delta < 0) return `−${text} ${unit}`;
    return `0 ${unit}`;
  }
  const amount = displayQuantity(move.quantity, product.unit_nature);
  return move.kind === "salida" ? `−${amount} ${unit}` : `+${amount} ${unit}`;
}
