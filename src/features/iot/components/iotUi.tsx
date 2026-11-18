/**
 * Piezas visuales del módulo IoT.
 *
 * Propósito: guía desplegable y textos claros sin repetir marcado.
 * Contexto: mismo patrón de uso que la guía de galpón.
 * @author Cristian Deysdayr Jimenez
 */

import type { ReactNode } from "react";

type GuideProps = {
  title: string;
  lead?: string;
  steps: string[];
  example: string;
};

/**
 * Guía corta de configuración IoT (mostrar / ocultar).
 */
export function IotGuide({ title, lead, steps, example }: Readonly<GuideProps>) {
  return (
    <details className="iot-guide">
      <summary>
        <span className="iot-guide__badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" strokeLinecap="round" />
            <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="iot-guide__text">
          <strong>{title}</strong>
          {lead ? <small>{lead}</small> : null}
        </span>
        <span className="iot-guide__cta">
          <span className="iot-guide__cta-closed">Ver guía</span>
          <span className="iot-guide__cta-open">Ocultar</span>
        </span>
      </summary>
      <ol className="iot-guide__steps">
        {steps.map((step, index) => (
          <li key={step}>
            <span className="iot-guide__num">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p className="iot-guide__example">
        <strong>Ejemplo:</strong> {example}
      </p>
    </details>
  );
}

type StepCardProps = {
  step: number;
  title: string;
  tip: string;
  children: ReactNode;
};

/** Bloque de un paso de configuración con tip y contenido. */
export function IotStepCard({ step, title, tip, children }: Readonly<StepCardProps>) {
  return (
    <section className="iot-step">
      <header className="iot-step__head">
        <span className="iot-step__num" aria-hidden="true">{step}</span>
        <div>
          <h3>{title}</h3>
          <p>{tip}</p>
        </div>
      </header>
      <div className="iot-step__body">{children}</div>
    </section>
  );
}
