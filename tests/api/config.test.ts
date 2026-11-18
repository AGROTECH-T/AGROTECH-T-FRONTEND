import { describe, expect, it } from "vitest";
import { apiUrlProblem, checkBuildApiUrl, isLoopbackHost } from "../../src/services/api/apiUrlCheck.ts";
import {
  ApiConfigError,
  DEV_API_FALLBACK,
  LOOPBACK_API_URL_MESSAGE,
  MISSING_API_URL_MESSAGE,
  resolveApiRoot,
} from "../../src/services/api/config.ts";

const PUBLIC = "https://backend.example.test";

describe("resolveApiRoot", () => {
  it("uses the local fallback only in development", () => {
    expect(resolveApiRoot({ DEV: true })).toBe(DEV_API_FALLBACK);
    expect(() => resolveApiRoot({ DEV: false })).toThrow(ApiConfigError);
    expect(() => resolveApiRoot({ DEV: false, VITE_API_URL: "   " })).toThrow(MISSING_API_URL_MESSAGE);
  });

  it("normalizes the configured URL", () => {
    expect(resolveApiRoot({ DEV: false, VITE_API_URL: ` ${PUBLIC}/ ` , pageHost: "app.example.test" })).toBe(PUBLIC);
  });

  it("refuses a loopback API from a page served on a public host", () => {
    expect(() => resolveApiRoot({ DEV: false, VITE_API_URL: "http://localhost:8090", pageHost: "app.example.test" }))
      .toThrow(LOOPBACK_API_URL_MESSAGE);
    expect(resolveApiRoot({ DEV: false, VITE_API_URL: "http://localhost:8090", pageHost: "localhost" }))
      .toBe("http://localhost:8090");
    expect(resolveApiRoot({ DEV: true, VITE_API_URL: "http://localhost:8090", pageHost: "app.example.test" }))
      .toBe("http://localhost:8090");
  });

  it("rejects non-http URLs outside development", () => {
    expect(() => resolveApiRoot({ DEV: false, VITE_API_URL: "ftp://x.test" })).toThrow(ApiConfigError);
  });
});

describe("build check", () => {
  it("classifies URLs", () => {
    expect(apiUrlProblem(undefined)).toBe("missing");
    expect(apiUrlProblem("not a url")).toBe("invalid");
    expect(apiUrlProblem("http://127.0.0.1:8090")).toBe("loopback");
    expect(apiUrlProblem(PUBLIC)).toBeNull();
    expect(isLoopbackHost("api.localhost")).toBe(true);
    expect(isLoopbackHost("[::1]")).toBe(true);
    expect(isLoopbackHost("localhost.example.test")).toBe(false);
  });

  it("fails the build on Render and only warns locally", () => {
    expect(checkBuildApiUrl(undefined, true).level).toBe("error");
    expect(checkBuildApiUrl("http://localhost:8090", true).level).toBe("error");
    expect(checkBuildApiUrl(undefined, false).level).toBe("warn");
    expect(checkBuildApiUrl("http://localhost:8090", false).level).toBe("warn");
    expect(checkBuildApiUrl("nope", false).level).toBe("error");
    expect(checkBuildApiUrl(PUBLIC, true).level).toBe("ok");
  });
});
