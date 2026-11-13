/**
 * Opciones de los filtros de reportes.
 *
 * Propósito: cargar una sola vez los productos y las categorías de la finca.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { getInventoryCatalog, listProducts } from "../services/inventoryApi.ts";
import type { CatalogOption, Product } from "../types/index.ts";

/**
 * Productos activos e inactivos de la finca.
 * @param farmId - Finca del reporte.
 * @returns Lista para el selector.
 */
export function useProductOptions(farmId: number): Product[] {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    void listProducts(farmId)
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch(() => {
        if (active) setProducts([]);
      });
    return () => {
      active = false;
    };
  }, [farmId]);

  return products;
}

/**
 * Categorías del catálogo de la finca.
 * @returns Lista para el selector.
 */
export function useCategoryOptions(): CatalogOption[] {
  const [categories, setCategories] = useState<CatalogOption[]>([]);

  useEffect(() => {
    let active = true;
    void getInventoryCatalog()
      .then((catalog) => {
        if (active) setCategories(catalog.categories);
      })
      .catch(() => {
        if (active) setCategories([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return categories;
}
