/**
 * Foto ya guardada de un producto.
 *
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { productImageUrl } from "../services/inventoryApi.ts";
import type { Product } from "../types/index.ts";

/**
 * Dirección local de la foto, vacía si el producto no tiene.
 */
export function useProductPhoto(farmId: number, product: Product): string {
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    if (!product.has_image) {
      setPhoto("");
      return;
    }
    let alive = true;
    let current = "";
    void productImageUrl(farmId, product.id)
      .then((url) => {
        if (!alive) {
          URL.revokeObjectURL(url);
          return;
        }
        current = url;
        setPhoto(url);
      })
      .catch(() => {
        if (alive) setPhoto("");
      });
    return () => {
      alive = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [farmId, product.id, product.updated_at, product.has_image]);

  return photo;
}
