/**
 * Pantalla de inventario.
 *
 * Propósito: elegir finca y operar su stock.
 * Contexto: cada producto exige código de barras.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useState } from "react";
import { listFarms } from "../../farms/services/farmsApi.ts";
import type { Farm } from "../../farms/types/index.ts";
import { listProducts } from "../services/inventoryApi.ts";
import type { Product } from "../types/index.ts";
import { InventarioBrowser } from "./InventarioBrowser.tsx";
import { ProductDetail } from "./ProductDetail.tsx";

/**
 * Orquesta finca activa, listado y detalle.
 * @returns Panel de Inventario.
 */
export function InventarioPanel() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void listFarms()
      .then((items) => {
        setFarms(items);
        setFarmId(items[0]?.id ?? null);
        if (items.length === 0) setLoading(false);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : "No se pudieron cargar las fincas");
        setLoading(false);
      });
  }, []);

  const loadProducts = useCallback(async (id: number) => {
    setLoading(true);
    setError("");
    try {
      setProducts(await listProducts(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el inventario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (farmId != null) void loadProducts(farmId);
  }, [farmId, loadProducts]);

  if (selected && farmId != null) {
    return (
      <section className="panel">
        <ProductDetail
          farmId={farmId}
          product={selected}
          onBack={() => setSelected(null)}
          onChanged={(product) => {
            setSelected(product);
            setProducts((current) =>
              current.map((item) => (item.id === product.id ? product : item)),
            );
          }}
        />
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="inventario-title">
      <header className="panel__header">
        <h1 id="inventario-title" className="panel__title">
          Inventario
        </h1>
        <p className="panel__lead">Productos y stock de la finca (código de barras obligatorio).</p>
      </header>

      {farms.length > 0 ? (
        <label className="inv-farm">
          <span>Finca</span>
          <select
            value={farmId ?? ""}
            onChange={(event) => {
              setFarmId(Number(event.target.value));
              setSelected(null);
            }}
          >
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {farms.length === 0 && !error ? (
        <div className="inventario-empty" role="status">
          <p className="inventario-empty__title">Primero crea una finca</p>
          <p className="inventario-empty__hint">El inventario vive dentro de una finca.</p>
        </div>
      ) : null}

      {farmId != null ? (
        <InventarioBrowser
          farmId={farmId}
          products={products}
          loading={loading}
          error={error}
          onReload={() => void loadProducts(farmId)}
          onSelect={setSelected}
          onCreated={(product) => {
            setProducts((current) => [...current, product]);
            setSelected(product);
          }}
        />
      ) : null}
    </section>
  );
}
