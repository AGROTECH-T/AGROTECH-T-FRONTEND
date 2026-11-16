/**
 * Campo de búsqueda del catálogo.
 *
 * Propósito: el mismo buscador de inventario, en cada lista del catálogo.
 * @author Cristian Deysdayr Jimenez
 */

type Props = {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
};

/**
 * Buscador de una lista del catálogo.
 * @param props - Texto, cambio y copy de esa lista.
 * @returns Campo de búsqueda.
 */
export function CatalogSearch({ value, onChange, label, placeholder }: Readonly<Props>) {
  return (
    <div className="inv-bar">
      <label className="inventario-search">
        <span className="visually-hidden">{label}</span>
        <input
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}
