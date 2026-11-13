/**
 * Pruebas del diálogo de confirmación.
 *
 * Propósito: comprobar el contenido, el estado de carga, el tono de
 * advertencia y el bloqueo de envíos repetidos.
 * Contexto: el entorno de pruebas es node; se renderiza a HTML estático.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConfirmDialog, createSubmitGuard } from "../../src/components/ui/ConfirmDialog.tsx";

type DialogProps = Parameters<typeof ConfirmDialog>[0];

function render(props: Partial<DialogProps> = {}) {
  return renderToStaticMarkup(
    createElement(ConfirmDialog, {
      open: true,
      title: "¿Desactivar la finca?",
      description: "Dejará de estar operativa.",
      onConfirm: () => undefined,
      onCancel: () => undefined,
      ...props,
    }),
  );
}

describe("ConfirmDialog", () => {
  it("no renderiza nada cerrado", () => {
    expect(render({ open: false })).toBe("");
  });

  it("muestra título, descripción y textos de los botones", () => {
    const html = render({ confirmLabel: "Sí, desactivar", cancelLabel: "Volver" });
    expect(html).toContain("<dialog");
    expect(html).toContain("¿Desactivar la finca?");
    expect(html).toContain("Dejará de estar operativa.");
    expect(html).toContain("Sí, desactivar");
    expect(html).toContain("Volver");
    expect(html).toContain('class="btn-primary"');
    expect(html).not.toContain("disabled");
  });

  it("usa los textos por defecto", () => {
    const html = render();
    expect(html).toContain("Confirmar");
    expect(html).toContain("Cancelar");
  });

  it("en carga deshabilita ambos botones y muestra el texto pendiente", () => {
    const html = render({ loading: true, pendingLabel: "Desactivando..." });
    expect(html.match(/disabled=""/g)?.length).toBe(2);
    expect(html).toContain("Desactivando...");
    expect(html).toContain('aria-busy="true"');
  });

  it("el tono de advertencia usa el botón de peligro existente", () => {
    const html = render({ tone: "warning" });
    expect(html).toContain("confirm-dialog is-warning");
    expect(html).toContain('class="btn-danger"');
  });

  it("muestra el error como alerta", () => {
    expect(render({ error: "No se pudo desactivar" })).toContain('role="alert"');
  });
});

describe("createSubmitGuard", () => {
  it("ignora una segunda ejecución mientras la primera sigue en curso", async () => {
    const run = createSubmitGuard();
    let calls = 0;
    let release: () => void = () => undefined;
    const slow = () =>
      new Promise<void>((resolve) => {
        calls += 1;
        release = resolve;
      });
    const first = run(slow);
    const second = await run(slow);
    expect(second).toBe(false);
    release();
    expect(await first).toBe(true);
    expect(calls).toBe(1);
  });

  it("vuelve a permitir ejecutar al terminar, incluso si falla", async () => {
    const run = createSubmitGuard();
    await expect(run(() => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(await run(() => undefined)).toBe(true);
  });
});
