/**
 * Pruebas del cliente HTTP compartido.
 *
 * Propósito: asegurar que los errores conservan código y campos extra, y que
 * las respuestas sin contenido (204) no fallan.
 * @author Cristian Deysdayr Jimenez
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  deleteJson,
  getJson,
  isApiError,
  postJson,
  toApiError,
} from "../../src/services/api/client.ts";

function reply(status: number, body?: unknown, raw?: string) {
  const text = raw ?? (body === undefined ? "" : JSON.stringify(body));
  const response = new Response(status === 204 ? null : text, { status });
  vi.stubGlobal("fetch", vi.fn(async () => response));
}

async function captured(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (cause) {
    if (cause instanceof ApiError) return cause;
    throw cause;
  }
  throw new Error("se esperaba un ApiError");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiError", () => {
  it("es un Error con mensaje, código y campos extra", () => {
    const error = new ApiError(502, "no se pudo entregar la invitación", { invitation_id: 12 });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.message).toBe("no se pudo entregar la invitación");
    expect(error.status).toBe(502);
    expect(error.extra).toEqual({ invitation_id: 12 });
    expect(error.isBadGateway).toBe(true);
  });

  it("diferencia 400, 403, 404, 409, 429 y 502", () => {
    const flags = (status: number) => {
      const e = new ApiError(status, "x");
      return [
        e.isBadRequest,
        e.isForbidden,
        e.isNotFound,
        e.isConflict,
        e.isRateLimited,
        e.isBadGateway,
      ];
    };
    expect(flags(400)).toEqual([true, false, false, false, false, false]);
    expect(flags(403)).toEqual([false, true, false, false, false, false]);
    expect(flags(404)).toEqual([false, false, true, false, false, false]);
    expect(flags(409)).toEqual([false, false, false, true, false, false]);
    expect(flags(429)).toEqual([false, false, false, false, true, false]);
    expect(flags(502)).toEqual([false, false, false, false, false, true]);
    expect(new ApiError(401, "x").isUnauthorized).toBe(true);
  });

  it("toApiError separa el mensaje de los campos extra", () => {
    const error = toApiError(409, { error: "ya perteneces a esta finca", code: "dup" });
    expect(error.serverMessage).toBe("ya perteneces a esta finca");
    expect(error.extra).toEqual({ code: "dup" });
  });

  it("toApiError usa un mensaje genérico si el cuerpo no trae error", () => {
    expect(toApiError(500, undefined).message).toBe("No se pudo completar la solicitud");
    expect(toApiError(500, ["x"]).message).toBe("No se pudo completar la solicitud");
    expect(toApiError(500, { error: "" }).message).toBe("No se pudo completar la solicitud");
  });

  it("isApiError filtra por código cuando se indica", () => {
    const error = new ApiError(404, "x");
    expect(isApiError(error)).toBe(true);
    expect(isApiError(error, 404)).toBe(true);
    expect(isApiError(error, 409)).toBe(false);
    expect(isApiError(new Error("x"))).toBe(false);
  });
});

describe("cliente HTTP", () => {
  it("conserva el código HTTP y el mensaje del servidor", async () => {
    reply(403, { error: "solo el administrador puede hacer este cambio" });
    const error = await captured(getJson("/api/v1/farms/1/members/", "t"));
    expect(error.status).toBe(403);
    expect(error.message).toBe("solo el administrador puede hacer este cambio");
  });

  it("conserva campos adicionales como invitation_id en un 502", async () => {
    reply(502, { error: "no se pudo entregar la invitación", invitation_id: 12 });
    const error = await captured(postJson("/api/v1/farms/1/invitations/", {}, "t"));
    expect(error.status).toBe(502);
    expect(error.extra.invitation_id).toBe(12);
  });

  it("mantiene el aviso legible de los 429", async () => {
    reply(429, { error: "Límite de intentos alcanzado. Se restablece en 5 minutos." });
    const error = await captured(postJson("/api/v1/invitations/accept/", {}, "t"));
    expect(error.isRateLimited).toBe(true);
    expect(error.message).toBe("Límite de intentos alcanzado. Se restablece en 5 minutos.");
  });

  it("un error sin cuerpo JSON también es ApiError con su código", async () => {
    reply(500, undefined, "<html>error</html>");
    const error = await captured(getJson("/x/", ""));
    expect(error.status).toBe(500);
    expect(error.message).toBe("No se pudo completar la solicitud");
  });

  it("un POST con 204 resuelve sin intentar leer JSON", async () => {
    reply(204);
    await expect(postJson("/api/v1/farms/1/leave/", {}, "t")).resolves.toBeUndefined();
  });

  it("un DELETE con 204 resuelve", async () => {
    reply(204);
    await expect(deleteJson("/api/v1/farms/1/", "t")).resolves.toBeUndefined();
  });

  it("un DELETE fallido lanza ApiError con código", async () => {
    reply(409, { error: "la finca debe conservar al menos un administrador" });
    const error = await captured(deleteJson("/api/v1/farms/1/members/2/", "t", { reason: "" }));
    expect(error.status).toBe(409);
  });

  it("envía el token Bearer y el cuerpo del DELETE", async () => {
    reply(204);
    await deleteJson("/api/v1/farms/1/members/2/", "abc", { reason: "fin" });
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("DELETE");
    expect(init.body).toBe(JSON.stringify({ reason: "fin" }));
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer abc");
  });

  it("devuelve el cuerpo JSON en respuestas exitosas", async () => {
    reply(200, [{ id: 1 }]);
    await expect(getJson("/api/v1/farms/", "t")).resolves.toEqual([{ id: 1 }]);
  });
});
