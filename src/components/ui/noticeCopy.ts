/**
 * Título y detalle de una notificación.
 *
 * Propósito: arriba va la acción y abajo el resultado.
 * Contexto: todas las tarjetas de aviso usan el mismo formato.
 * @author Cristian Deysdayr Jimenez
 */

export type NoticeLines = {
  title: string;
  detail: string;
};

const FIXED: Record<string, NoticeLines> = {
  "Finca creada.": { title: "Creación de finca", detail: "Se creó correctamente la finca." },
  "Finca actualizada.": { title: "Finca actualizada", detail: "Se actualizó correctamente la finca." },
  "inventario actualizado": { title: "Inventario actualizado", detail: "Se actualizó correctamente el inventario." },
  "inventario borrado": { title: "Inventario eliminado", detail: "Se eliminó correctamente el inventario." },
  "producto eliminado": { title: "Producto eliminado", detail: "Se eliminó correctamente el producto." },
  "foto del producto actualizada": { title: "Foto actualizada", detail: "Se actualizó correctamente la foto del producto." },
  "foto del producto eliminada": { title: "Foto eliminada", detail: "Se eliminó correctamente la foto del producto." },
  "Gateway dado de baja.": { title: "Gateway eliminado", detail: "Se dio de baja correctamente el gateway." },
  "Coordinador dado de baja.": { title: "Coordinador eliminado", detail: "Se dio de baja correctamente el coordinador." },
  "Fuente dada de baja.": { title: "Fuente eliminada", detail: "Se dio de baja correctamente la fuente." },
  "Sensor dado de baja.": { title: "Sensor eliminado", detail: "Se dio de baja correctamente el sensor." },
  "Autorización revocada.": { title: "Autorización eliminada", detail: "Se revocó correctamente la autorización." },
  "Par coordinador–gateway autorizado.": { title: "Autorización creada", detail: "Se autorizó correctamente el par." },
  "Finca reactivada.": { title: "Finca reactivada", detail: "La finca volvió a quedar activa." },
  "Finca desactivada.": { title: "Finca desactivada", detail: "La finca quedó desactivada." },
  "Abandonaste la finca.": { title: "Salida de la finca", detail: "Abandonaste la finca correctamente." },
  "Perfil actualizado.": { title: "Perfil actualizado", detail: "Sus datos se guardaron correctamente." },
  "inicio de sesión exitosa": { title: "Inicio de sesión", detail: "Entraste correctamente a tu cuenta." },
  "no es posible entrar": { title: "No es posible entrar", detail: "Usuario o contraseña incorrecto." },
  "producto creado": { title: "Creación de producto", detail: "Se creó correctamente el producto." },
  "producto creado sin foto": { title: "Creación de producto", detail: "Se creó el producto sin foto." },
  "producto actualizado": { title: "Producto actualizado", detail: "Los cambios se guardaron correctamente." },
  "Producto reactivado.": { title: "Producto reactivado", detail: "El producto volvió a quedar disponible." },
  "Producto desactivado. Conserva su historial.": {
    title: "Producto desactivado",
    detail: "Quedó desactivado y conserva su historial.",
  },
  "categoría creada": { title: "Creación de categoría", detail: "Se creó correctamente la categoría." },
  "categoría actualizada": { title: "Categoría actualizada", detail: "Se actualizó correctamente la categoría." },
  "categoría borrada": { title: "Categoría eliminada", detail: "Se eliminó correctamente la categoría." },
  "unidad creada": { title: "Creación de unidad", detail: "Se creó correctamente la unidad." },
  "unidad actualizada": { title: "Unidad actualizada", detail: "Se actualizó correctamente la unidad." },
  "unidad borrada": { title: "Unidad eliminada", detail: "Se eliminó correctamente la unidad." },
  "medida creada": { title: "Creación de medida", detail: "Se creó correctamente la medida." },
  "medida actualizada": { title: "Medida actualizada", detail: "Se actualizó correctamente la medida." },
  "medida borrada": { title: "Medida eliminada", detail: "Se eliminó correctamente la medida." },
  agregado: { title: "Catálogo actualizado", detail: "Se agregó correctamente." },
  "inventario creado": { title: "Creación de inventario", detail: "Se creó correctamente el inventario." },
  "inventario descargado": { title: "Inventario descargado", detail: "La descarga se completó correctamente." },
  "inventario importado": { title: "Inventario importado", detail: "La plantilla se importó correctamente." },
  "la plantilla no trajo cambios": { title: "Importación de inventario", detail: "La plantilla no trajo cambios." },
  "plantilla descargada": { title: "Plantilla descargada", detail: "La descarga se completó correctamente." },
  "entrada registrada": { title: "Entrada registrada", detail: "Se registró correctamente la entrada." },
  "salida registrada": { title: "Salida registrada", detail: "Se registró correctamente la salida." },
  "préstamo registrado": { title: "Préstamo registrado", detail: "Se registró correctamente el préstamo." },
  "devolución registrada": { title: "Devolución registrada", detail: "Se registró correctamente la devolución." },
  "ajuste guardado": { title: "Ajuste guardado", detail: "El ajuste se guardó correctamente." },
  "códigos descargados": { title: "Códigos descargados", detail: "La descarga se completó correctamente." },
  "Registro guardado en la bitácora.": { title: "Registro guardado", detail: "Se guardó correctamente en la bitácora." },
  "Registro corregido. Se guardó el valor anterior.": {
    title: "Registro corregido",
    detail: "Se guardó el valor anterior.",
  },
  "Registro eliminado y saldo del lote corregido.": {
    title: "Registro eliminado",
    detail: "Se corrigió el saldo del lote.",
  },
};

/**
 * Separa el aviso en título y detalle.
 * @param text - Mensaje original del módulo.
 * @param tone - Éxito o error.
 * @returns Las dos líneas de la tarjeta.
 */
export function noticeLines(text: string, tone: "ok" | "warn"): NoticeLines {
  const known = FIXED[text];
  if (known) return known;
  const shaped = namedAction(text);
  if (shaped) return shaped;
  const split = text.split(". ").filter(Boolean);
  if (split.length > 1) {
    return { title: split[0].replace(/\.$/, ""), detail: split.slice(1).join(". ") };
  }
  if (tone === "warn") return { title: "No se pudo completar", detail: text };
  const title = text.replace(/\.$/, "");
  return { title: title.charAt(0).toUpperCase() + title.slice(1), detail: "Se completó correctamente." };
}

function namedAction(text: string): NoticeLines | null {
  const galpon = text.match(/^Galpón “(.+)” (creado|actualizado|eliminado)\.$/);
  if (galpon) {
    const name = galpon[1];
    if (galpon[2] === "creado") return { title: "Creación de galpón", detail: `Se creó correctamente el galpón ${name}.` };
    if (galpon[2] === "actualizado") return { title: "Galpón actualizado", detail: `Se actualizó correctamente el galpón ${name}.` };
    return { title: "Galpón eliminado", detail: `Se eliminó correctamente el galpón ${name}.` };
  }
  const lot = text.match(/^Lote (.+) (actualizado|abierto|eliminado|cerrado)\.$/);
  if (lot) {
    const code = lot[1];
    const verb = lot[2];
    if (verb === "abierto") return { title: "Creación de lote", detail: `Se creó correctamente el lote ${code}.` };
    if (verb === "actualizado") return { title: "Lote actualizado", detail: `Se actualizó correctamente el lote ${code}.` };
    if (verb === "cerrado") return { title: "Lote cerrado", detail: `Se cerró correctamente el lote ${code}.` };
    return { title: "Lote eliminado", detail: `Se eliminó correctamente el lote ${code}.` };
  }
  const admin = text.match(/^Administrador (.+) creado\.$/);
  if (admin) return { title: "Creación de administrador", detail: `Se creó correctamente a ${admin[1]}.` };
  const user = text.match(/^Usuario (.+) creado\.$/);
  if (user) return { title: "Creación de usuario", detail: `Se creó correctamente a ${user[1]}.` };
  const already = text.match(/^(.+) ya es administrador\.$/);
  if (already) return { title: "Administrador existente", detail: `${already[1]} ya es administrador.` };
  const removed = text.match(/^Se quitó el permiso de administrador a (.+)\.$/);
  if (removed) return { title: "Permiso retirado", detail: `Se quitó el permiso de administrador a ${removed[1]}.` };
  if (text.startsWith("Invitación enviada a ")) {
    return { title: "Invitación enviada", detail: text };
  }
  if (text.startsWith("Invitación creada para ")) {
    return { title: "Invitación creada", detail: text };
  }
  if (text.startsWith("Invitación a ") && text.includes("cancelada")) {
    return { title: "Invitación cancelada", detail: text };
  }
  if (text.startsWith("Te uniste a ")) {
    return { title: "Ingreso a la finca", detail: text };
  }
  return null;
}
