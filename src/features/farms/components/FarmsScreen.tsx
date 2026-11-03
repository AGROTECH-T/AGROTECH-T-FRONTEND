/**
 * Pantalla de fincas.
 *
 * Propósito: listar, crear y consultar las fincas de la cuenta.
 * Contexto: Farms v1; mismo diseño neomórfico del shell.
 * @author Cristian Deysdayr Jimenez
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { listFarms } from "../services/farmsApi.ts";
import type { Farm } from "../types/index.ts";
import { FarmCreateForm } from "./FarmCreateForm.tsx";
import { FarmDetail } from "./FarmDetail.tsx";
import { FarmList } from "./FarmList.tsx";

/**
 * Orquesta listado, alta y detalle.
 * @returns Panel de Fincas.
 */
export function FarmsScreen() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Farm | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setFarms(await listFarms());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las fincas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return farms;
    return farms.filter((farm) => farm.name.toLowerCase().includes(needle));
  }, [farms, query]);

  if (selected) {
    return (
      <section className="panel" aria-label="Detalle de finca">
        <FarmDetail
          farm={selected}
          onBack={() => setSelected(null)}
          onUpdated={(farm) => {
            setFarms((current) =>
              current
                .map((item) => (item.id === farm.id ? farm : item))
                .sort((a, b) => a.id - b.id),
            );
            setSelected(farm);
          }}
          onDeleted={(farmId) => {
            setFarms((current) => current.filter((item) => item.id !== farmId));
            setSelected(null);
          }}
        />
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="farms-title">
      <header className="panel__header">
        <h1 id="farms-title" className="panel__title">
          Fincas
        </h1>
        <p className="panel__lead">Tus fincas y el rol que tienes en cada una.</p>
      </header>

      <div className="farm-toolbar">
        <label className="farm-search">
          <span className="visually-hidden">Buscar finca</span>
          <input
            type="search"
            name="q"
            placeholder="Buscar finca..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setCreating(true)}
          disabled={creating}
        >
          + Nueva finca
        </button>
      </div>

      {creating ? (
        <FarmCreateForm
          onCancel={() => setCreating(false)}
          onCreated={(farm) => {
            setFarms((current) => [...current, farm].sort((a, b) => a.id - b.id));
            setCreating(false);
            setSelected(farm);
          }}
        />
      ) : null}

      {loading ? (
        <p className="farm-state" role="status">
          Cargando fincas...
        </p>
      ) : null}

      {!loading && error ? (
        <div className="farm-state" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-primary" onClick={() => void load()}>
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error && filtered.length === 0 ? (
        <div className="farm-empty" role="status">
          <p className="farm-empty__title">
            {farms.length === 0 ? "Aún no tienes fincas" : "No hay coincidencias"}
          </p>
          <p className="farm-empty__hint">
            {farms.length === 0
              ? "Crea la primera con el botón Nueva finca."
              : "Prueba con otro nombre en el buscador."}
          </p>
        </div>
      ) : null}

      {!loading && !error && filtered.length > 0 ? (
        <FarmList farms={filtered} onSelect={setSelected} />
      ) : null}
    </section>
  );
}
