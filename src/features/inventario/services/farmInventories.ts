/**
 * Inventarios de una finca.
 *
 * Propósito: una finca puede tener varios inventarios y cada producto vive en uno.
 * Contexto: el servidor guarda los productos por finca; aquí se recuerda el grupo.
 * @author Cristian Deysdayr Jimenez
 */

const KEY = "agrotech-t.farm-inventories";

export type FarmInventory = {
  id: string;
  farmId: number;
  name: string;
};

type Store = {
  inventories: FarmInventory[];
  productInventory: Record<string, string>;
};

function emptyStore(): Store {
  return { inventories: [], productInventory: {} };
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Store;
    if (!Array.isArray(parsed.inventories) || typeof parsed.productInventory !== "object") {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

/**
 * Inventarios de la finca. Si no hay ninguno, crea el principal.
 * @param farmId - Finca activa.
 * @returns Inventarios de esa finca, el principal primero.
 */
export function listInventories(farmId: number): FarmInventory[] {
  const store = readStore();
  const mine = store.inventories.filter((item) => item.farmId === farmId);
  if (mine.length > 0) return mine;
  const principal: FarmInventory = {
    id: crypto.randomUUID(),
    farmId,
    name: "Principal",
  };
  writeStore({ ...store, inventories: [...store.inventories, principal] });
  return [principal];
}

/**
 * Crea otro inventario en la finca.
 * @param farmId - Finca activa.
 * @param name - Nombre que escribió la persona.
 * @returns El inventario nuevo, o el principal si el nombre está vacío.
 */
export function addInventory(farmId: number, name: string): FarmInventory {
  const clean = name.trim();
  const current = listInventories(farmId);
  if (!clean) return current[0];
  if (clean.length > 100) throw new Error("El nombre no puede superar 100 caracteres.");
  if (current.some((item) => item.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error("Ya hay un inventario con ese nombre.");
  }
  const created: FarmInventory = {
    id: crypto.randomUUID(),
    farmId,
    name: clean,
  };
  const store = readStore();
  writeStore({ ...store, inventories: [...store.inventories, created] });
  return created;
}

/**
 * Cambia el nombre de un inventario de la finca.
 * @param id - Inventario.
 * @param name - Nombre nuevo.
 * @returns El inventario ya renombrado.
 */
export function renameInventory(id: string, name: string): FarmInventory {
  const clean = name.trim();
  if (!clean) throw new Error("Escribe el nombre del inventario.");
  if (clean.length > 100) throw new Error("El nombre no puede superar 100 caracteres.");
  const store = readStore();
  const current = store.inventories.find((item) => item.id === id);
  if (!current) throw new Error("No se encontró el inventario.");
  const taken = store.inventories.some(
    (item) => item.farmId === current.farmId && item.id !== id && item.name.toLowerCase() === clean.toLowerCase(),
  );
  if (taken) throw new Error("Ya hay un inventario con ese nombre.");
  const renamed = { ...current, name: clean };
  writeStore({
    ...store,
    inventories: store.inventories.map((item) => (item.id === id ? renamed : item)),
  });
  return renamed;
}

/**
 * Borra un inventario y pasa sus productos al que queda.
 * @param farmId - Finca activa.
 * @param id - Inventario a borrar.
 */
export function removeInventory(farmId: number, id: string) {
  const mine = listInventories(farmId);
  if (mine.length <= 1) throw new Error("La finca necesita al menos un inventario.");
  const keep = mine.find((item) => item.id !== id);
  if (!keep) throw new Error("No se encontró el inventario.");
  const store = readStore();
  const productInventory = { ...store.productInventory };
  for (const [productId, inventoryId] of Object.entries(productInventory)) {
    if (inventoryId === id) productInventory[productId] = keep.id;
  }
  writeStore({
    inventories: store.inventories.filter((item) => item.id !== id),
    productInventory,
  });
}

/**
 * Inventario donde está el producto. Si nadie lo movió, es el principal.
 * @param farmId - Finca activa.
 * @param productId - Producto.
 * @returns Id del inventario.
 */
export function inventoryIdFor(farmId: number, productId: number): string {
  const inventories = listInventories(farmId);
  const stored = readStore().productInventory[String(productId)];
  if (stored && inventories.some((item) => item.id === stored)) return stored;
  return inventories[0].id;
}

/**
 * Deja el producto en el inventario elegido.
 * @param productId - Producto.
 * @param inventoryId - Inventario de la finca.
 */
const DEMO_BOOKS = "agrotech-t.demo-books";

/**
 * Reparte los datos de prueba: la esperanza queda con dos inventarios
 * y las demás fincas con uno.
 * @param farmId - Finca activa.
 * @param farmName - Nombre de la finca.
 * @param productIds - Productos que ya existen.
 * @returns Inventarios de esa finca.
 */
export function arrangeDemoInventories(
  farmId: number,
  farmName: string,
  productIds: number[],
): FarmInventory[] {
  if (!farmName) return listInventories(farmId);
  const mark = `${DEMO_BOOKS}.${farmId}`;
  if (localStorage.getItem(mark)) return listInventories(farmId);
  const books = listInventories(farmId);
  const two = farmName.toLowerCase().includes("esperanza");
  if (two && !books.some((item) => item.name.toLowerCase() === "bodega")) {
    const bodega = addInventory(farmId, "Bodega");
    productIds.forEach((id, index) => {
      if (index % 2 === 0) placeProduct(id, bodega.id);
    });
  }
  localStorage.setItem(mark, "1");
  return listInventories(farmId);
}

export function placeProduct(productId: number, inventoryId: string) {
  const store = readStore();
  writeStore({
    ...store,
    productInventory: { ...store.productInventory, [String(productId)]: inventoryId },
  });
}
