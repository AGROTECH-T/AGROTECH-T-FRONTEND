/**
 * Interfaz vacía del inventario.
 *
 * Propósito: mostrar el marco visual del listado sin lógica aún.
 * Contexto: shell de escritorio; el módulo de datos viene después.
 * @author Cristian Deysdayr Jimenez
 */

/**
 * Cabecera, búsqueda y estado vacío del inventario.
 * @returns Panel de interfaz listo para conectar datos.
 */
export function InventarioPanel() {
  return (
    <section className="panel" aria-labelledby="inventario-title">
      <header className="panel__header">
        <h1 id="inventario-title" className="panel__title">Inventario</h1>
        <p className="panel__lead">Productos y stock de la finca</p>
      </header>

      <div className="inventario-toolbar">
        <label className="inventario-search">
          <span className="visually-hidden">Buscar producto</span>
          <input type="search" name="q" placeholder="Buscar producto..." disabled />
        </label>
        <button type="button" className="btn-primary" disabled>
          + Nuevo ítem
        </button>
      </div>

      <div className="inventario-empty" role="status">
        <p className="inventario-empty__title">Aún no hay productos</p>
        <p className="inventario-empty__hint">
          Aquí verás el listado cuando conectemos el módulo de inventario.
        </p>
      </div>
    </section>
  );
}
