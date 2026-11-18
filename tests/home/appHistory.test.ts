/**
 * Historial del shell autenticado.
 */

import { describe, expect, it, vi } from "vitest";
import {
  appHistoryState,
  isAppHistoryState,
  pushAppHistory,
  replaceAppHistory,
  subscribeAppHistory,
} from "../../src/features/home/services/appHistory.ts";

describe("appHistory", () => {
  it("reconoce solo estados de la app", () => {
    expect(isAppHistoryState(null)).toBe(false);
    expect(isAppHistoryState({ section: "home" })).toBe(false);
    expect(isAppHistoryState(appHistoryState("inventario", "lista"))).toBe(true);
  });

  it("empuja y sustituye entradas del historial", () => {
    const history = { pushState: vi.fn(), replaceState: vi.fn() };
    pushAppHistory("fincas", "lista", history);
    replaceAppHistory("home", undefined, history);
    expect(history.pushState).toHaveBeenCalledWith(
      { agrotechApp: true, section: "fincas", view: "lista" },
      "",
      "/",
    );
    expect(history.replaceState).toHaveBeenCalledWith(
      { agrotechApp: true, section: "home" },
      "",
      "/",
    );
  });

  it("avisa en popstate con estado de app o null", () => {
    const listeners = new Map<string, EventListener>();
    const target = {
      addEventListener: (type: string, fn: EventListener) => {
        listeners.set(type, fn);
      },
      removeEventListener: (type: string) => {
        listeners.delete(type);
      },
    };
    const onPop = vi.fn();
    const stop = subscribeAppHistory(onPop, target);
    const fire = (state: unknown) => {
      listeners.get("popstate")?.({ state } as Event);
    };
    fire(appHistoryState("galpon"));
    fire(null);
    expect(onPop).toHaveBeenNthCalledWith(1, { agrotechApp: true, section: "galpon" });
    expect(onPop).toHaveBeenNthCalledWith(2, null);
    stop();
    expect(listeners.has("popstate")).toBe(false);
  });
});
