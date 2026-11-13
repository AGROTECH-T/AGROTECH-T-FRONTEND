/**
 * Alta del catálogo en una sola hoja.
 *
 * Propósito: elegir lo que ya existe y escribir solo lo que falta.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState, type FormEvent } from "react";
import { createBaseUnit, createCategory, createCustomUnit, getInventoryCatalog } from "../services/inventoryApi.ts";
import type { InventoryCatalog } from "../types/index.ts";

type Props = {
  farmId: number;
  onNotice: (message: string) => void;
  onSaved: () => void;
};

/**
 * Tres filas: medida, cómo se llama y grupo.
 * @param props - Finca y aviso al guardar.
 * @returns Hoja de alta.
 */
export function CatalogChain({ farmId, onNotice, onSaved }: Readonly<Props>) {
  const [catalog, setCatalog] = useState<InventoryCatalog | null>(null);
  const [open, setOpen] = useState(false);
  const [measure, setMeasure] = useState("nueva");
  const [measureName, setMeasureName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState(false);
  const [countName, setCountName] = useState("");
  const [amount, setAmount] = useState("");
  const [group, setGroup] = useState("nuevo");
  const [groupName, setGroupName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [gaps, setGaps] = useState<Record<string, string>>({});

  useEffect(() => {
    void getInventoryCatalog().then((data) => {
      setCatalog(data);
      setMeasure(data.base_units?.[0]?.id ?? "nueva");
      setGroup(data.categories[0]?.id ?? "nuevo");
    }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo");
    });
  }, []);

  const reset = () => {
    setMeasure(catalog?.base_units?.[0]?.id ?? "nueva");
    setMeasureName("");
    setSymbol("");
    setDecimals(false);
    setCountName("");
    setAmount("");
    setGroup(catalog?.categories[0]?.id ?? "nuevo");
    setGroupName("");
    setGaps({});
    setError("");
    setOpen(false);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (measure === "nueva" && !measureName.trim()) next.measureName = "Escribe cómo se llama.";
    if (measure === "nueva" && !symbol.trim()) next.symbol = "Escribe las letras.";
    if (!countName.trim()) next.countName = "Escribe cómo lo llamas.";
    const number = amount.trim().replace(",", ".");
    if (!number || Number(number) <= 0) next.amount = "Escribe el número.";
    if (group === "nuevo" && !groupName.trim()) next.groupName = "Escribe la categoría.";
    setGaps(next);
    if (Object.keys(next).length) return;

    setPending(true);
    setError("");
    try {
      let baseCode = measure;
      if (measure === "nueva") {
        const created = await createBaseUnit(farmId, {
          name: measureName.trim(),
          symbol: symbol.trim(),
          decimals,
        });
        baseCode = created.created ?? "";
        if (!baseCode) throw new Error("No se pudo guardar la medida");
      }
      let groupCode = group;
      if (group === "nuevo") {
        const created = await createCategory(farmId, { name: groupName.trim(), unit_codes: [] });
        groupCode = created.created ?? "";
        if (!groupCode) throw new Error("No se pudo guardar la categoría");
      }
      await createCustomUnit(farmId, {
        stem: countName.trim(),
        label: countName.trim(),
        base_unit: baseCode,
        factor: number,
        categories: [groupCode],
      });
      const fresh = await getInventoryCatalog();
      setCatalog(fresh);
      reset();
      onSaved();
      onNotice("agregado");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar");
    } finally {
      setPending(false);
    }
  };

  if (!open) {
    return (
      <div className="cat-chain__add">
        <button type="button" className="btn-primary" onClick={() => setOpen(true)}>+ Agregar</button>
      </div>
    );
  }

  const bases = catalog?.base_units ?? [];
  const groups = catalog?.categories ?? [];

  return (
    <form className="cat-chain" onSubmit={(event) => void save(event)}>
      <div className="cat-chain__row">
        <strong>¿Con qué mides?</strong>
        <div className="cat-chain__fields">
          <select value={measure} onChange={(event) => setMeasure(event.target.value)} disabled={pending}>
            <option value="nueva">+ Crear otra</option>
            {bases.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          {measure === "nueva" ? (
            <>
              <input
                value={measureName}
                maxLength={60}
                placeholder="Kilo"
                onChange={(event) => { setMeasureName(event.target.value); setGaps((current) => ({ ...current, measureName: "" })); }}
                disabled={pending}
              />
              <input
                value={symbol}
                maxLength={10}
                placeholder="kg"
                onChange={(event) => { setSymbol(event.target.value); setGaps((current) => ({ ...current, symbol: "" })); }}
                disabled={pending}
              />
              <button type="button" className={decimals ? "easy-chip" : "easy-chip is-on"} onClick={() => setDecimals(false)}>
                Número entero
              </button>
              <button type="button" className={decimals ? "easy-chip is-on" : "easy-chip"} onClick={() => setDecimals(true)}>
                Permite decimales
              </button>
            </>
          ) : null}
        </div>
      </div>
      {gaps.measureName || gaps.symbol ? <p className="field-miss">{gaps.measureName || gaps.symbol}</p> : null}

      <div className="cat-chain__row cat-chain__row--open">
        <strong>¿Cómo lo llamas?</strong>
        <div className="cat-chain__fields">
          <input
            value={countName}
            maxLength={80}
            placeholder="Bulto, caja o el kilo suelto"
            onChange={(event) => { setCountName(event.target.value); setGaps((current) => ({ ...current, countName: "" })); }}
            disabled={pending}
          />
        </div>
      </div>
      {gaps.countName ? <p className="field-miss">{gaps.countName}</p> : null}

      <div className="cat-chain__row cat-chain__row--open">
        <strong>¿Cuántos lleva?</strong>
        <div className="cat-chain__fields">
          <input
            value={amount}
            inputMode="decimal"
            placeholder="1 si sale suelto. 50 si trae 50"
            onChange={(event) => { setAmount(event.target.value); setGaps((current) => ({ ...current, amount: "" })); }}
            disabled={pending}
          />
        </div>
      </div>
      {gaps.amount ? <p className="field-miss">{gaps.amount}</p> : null}

      <div className="cat-chain__row">
        <strong>¿En qué categoría va?</strong>
        <div className="cat-chain__fields">
          <select value={group} onChange={(event) => setGroup(event.target.value)} disabled={pending}>
            <option value="nuevo">+ Crear otra</option>
            {groups.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          {group === "nuevo" ? (
            <input
              value={groupName}
              maxLength={80}
              placeholder="Semilla, abono o herramienta"
              onChange={(event) => { setGroupName(event.target.value); setGaps((current) => ({ ...current, groupName: "" })); }}
              disabled={pending}
            />
          ) : null}
        </div>
      </div>
      {gaps.groupName ? <p className="field-miss">{gaps.groupName}</p> : null}
      {error ? <p className="farm-form__error" role="alert">{error}</p> : null}
      <div className="cat-chain__actions">
        <button type="submit" className="btn-primary" disabled={pending}>Guardar</button>
        <button type="button" className="btn-danger" disabled={pending} onClick={reset}>Cancelar</button>
      </div>
    </form>
  );
}
