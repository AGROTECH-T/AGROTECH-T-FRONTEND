/**
 * Reduce una foto para que no pase de 2 MB.
 *
 * @author Cristian Deysdayr Jimenez
 */

const LIMIT = 2 * 1024 * 1024;

/**
 * Convierte la imagen a JPEG y baja calidad o tamaño hasta entrar en 2 MB.
 * @param file - Foto tomada o cargada.
 * @returns Archivo JPEG listo para subir.
 */
export async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo tiene que ser una imagen");
  }
  const image = await loadImage(file);
  let quality = 0.82;
  let scale = 1;
  let blob = await paint(image, scale, quality);
  while (blob.size > LIMIT && (quality > 0.45 || scale > 0.35)) {
    if (quality > 0.45) quality -= 0.12;
    else scale *= 0.75;
    blob = await paint(image, scale, quality);
  }
  if (blob.size > LIMIT) {
    throw new Error("La foto sigue pesando más de 2 MB");
  }
  return new File([blob], "foto.jpg", { type: "image/jpeg" });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la foto"));
    };
    image.src = url;
  });
}

function paint(image: HTMLImageElement, scale: number, quality: number): Promise<Blob> {
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return Promise.reject(new Error("No se pudo preparar la foto"));
  context.drawImage(image, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la foto"))),
      "image/jpeg",
      quality,
    );
  });
}
