/**
 * Buscador de una pestaña del catálogo.
 *
 * Propósito: filtrar la lista de la pestaña abierta.
 * Contexto: medida, unidad y categoría usan el mismo control.
 * @author Cristian Deysdayr Jimenez
 */

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
};

/**
 * Campo de búsqueda del catálogo.
 * @param props - Valor, cambio y textos.
 * @returns Buscador.
 */
export function CatalogSearch({ value, onChange, label, placeholder }: Readonly<Props>) {
  return (
    <label className="cat-search">
      <span className="visually-hidden">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
