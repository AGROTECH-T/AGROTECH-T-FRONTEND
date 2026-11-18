/**
 * Etiquetas de código de barras en PDF.
 *
 * Propósito: descargar una hoja A4 con las etiquetas del producto.
 * Contexto: CODE-128 admite cualquier código de hasta 64 caracteres, que es
 * el máximo que guarda el inventario.
 * @author Cristian Deysdayr Jimenez
 */

import type { jsPDF } from "jspdf";
import type { Product } from "../types/index.ts";

/** Tope de etiquetas en una sola descarga. */
export const MAX_LABELS = 500;

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;
const COLUMNS = 3;
const ROWS = 7;
const GAP = 4;

type LabelImage = {
  data: string;
  ratio: number;
};

/**
 * Dibuja el código de barras en un lienzo y lo devuelve como imagen.
 * @param product - Producto con código.
 * @returns PNG y su proporción alto/ancho.
 */
async function labelImage(product: Product): Promise<LabelImage> {
  const { default: JsBarcode } = await import("jsbarcode");
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, product.barcode, {
    format: "CODE128",
    width: 2,
    height: 70,
    margin: 0,
    displayValue: true,
    fontSize: 18,
    textMargin: 2,
    font: "monospace",
  });
  return { data: canvas.toDataURL("image/png"), ratio: canvas.height / canvas.width };
}

/**
 * Descarga una hoja A4 con las etiquetas pedidas.
 * @param product - Producto con código de barras.
 * @param count - Etiquetas entre 1 y MAX_LABELS.
 */
export async function downloadBarcodeSheet(product: Product, count: number): Promise<void> {
  if (!product.barcode) {
    throw new Error("Este producto no tiene código de barras.");
  }
  const total = Math.min(Math.max(Math.floor(count) || 1, 1), MAX_LABELS);
  const [{ jsPDF: Document }, label] = await Promise.all([import("jspdf"), labelImage(product)]);
  const doc = new Document({ unit: "mm", format: "a4" });
  const width = (PAGE_WIDTH - MARGIN * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const height = (PAGE_HEIGHT - MARGIN * 2 - GAP * (ROWS - 1)) / ROWS;
  const perPage = COLUMNS * ROWS;

  for (let index = 0; index < total; index += 1) {
    const slot = index % perPage;
    if (index > 0 && slot === 0) doc.addPage();
    const column = slot % COLUMNS;
    const row = Math.floor(slot / COLUMNS);
    drawLabel(doc, product.name, label, MARGIN + column * (width + GAP), MARGIN + row * (height + GAP), width, height);
  }

  doc.save(`codigos-${fileSlug(product.name)}.pdf`);
}

/**
 * Pinta una etiqueta: nombre arriba y el código debajo.
 * @param doc - Documento en milímetros.
 * @param name - Nombre del producto.
 * @param label - Imagen del código.
 * @param x - Borde izquierdo.
 * @param y - Borde superior.
 * @param width - Ancho de la etiqueta.
 * @param height - Alto de la etiqueta.
 */
function drawLabel(
  doc: jsPDF,
  name: string,
  label: LabelImage,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  doc.setDrawColor(190);
  doc.rect(x, y, width, height);
  doc.setFontSize(7.5);
  doc.setTextColor(20, 43, 27);
  doc.text(shortName(name), x + 2, y + 5);
  const imageWidth = width - 6;
  const imageHeight = Math.min(imageWidth * label.ratio, height - 10);
  doc.addImage(label.data, "PNG", x + 3, y + 6, imageWidth, imageHeight);
}

/**
 * Recorta el nombre para que quepa en la etiqueta.
 * @param name - Nombre completo.
 * @returns Nombre corto con puntos suspensivos.
 */
function shortName(name: string): string {
  return name.length > 30 ? `${name.slice(0, 29)}…` : name;
}

/**
 * Convierte el nombre en parte del archivo.
 * @param name - Nombre del producto.
 * @returns Texto sin acentos ni espacios.
 */
function fileSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "producto";
}
