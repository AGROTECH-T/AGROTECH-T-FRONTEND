/**
 * Pruebas de F10.2: etapas del acceso y bienvenida del onboarding.
 *
 * Propósito: la bienvenida aparece solo a cuentas verificadas sin fincas ni
 * invitación; quien tiene fincas no vuelve a ella; la invitación conserva la
 * prioridad; crear una finca respeta lo que confirma el backend, evita el
 * doble envío y actualiza cuenta y destino; "Entrar como invitado" muestra el
 * formulario común de códigos (F10.3.5; su flujo se prueba en
 * tests/invitations/invitationCode.test.ts) y el paso de unión confirmada.
 * Contexto: entorno node (sin DOM): no se prueban clics reales, sino la vista
 * estática y la lógica que usan los componentes. Respuestas simuladas.
 * @author Cristian Deysdayr Jimenez
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSubmitGuard } from "../../src/components/ui/ConfirmDialog.tsx";
import { ApiError } from "../../src/services/api/client.ts";
import {
  authStage,
  farmAccessFrom,
  type FarmAccess,
} from "../../src/features/auth/services/authStage.ts";
import type { Account } from "../../src/features/auth/types/index.ts";
import { FarmCreateForm } from "../../src/features/farms/components/FarmCreateForm.tsx";
import { farmScreenActions } from "../../src/features/farms/components/FarmsScreen.tsx";
import { createFarm } from "../../src/features/farms/services/farmsApi.ts";
import {
  FORBIDDEN_MESSAGE,
  NETWORK_MESSAGE,
  runFarmCreation,
  SESSION_MESSAGE,
  UNVERIFIED_MESSAGE,
} from "../../src/features/farms/services/farmCreation.ts";
import type { Farm } from "../../src/features/farms/types/index.ts";
import { emptyInventoryState } from "../../src/features/inventario/services/inventoryAccess.ts";
import { OnboardingView } from "../../src/features/onboarding/components/OnboardingScreen.tsx";
import {
  ACCOUNT_LABEL,
  accountName,
  canCreateFarm,
  completeFarmCreation,
  CREATE_BLOCKED_MESSAGE,
  createBlockedReason,
  GUEST_EMPTY_MESSAGE,
  GUEST_PROMPT,
  GUEST_TITLE,
  normalizeGuestCode,
  ONBOARDING_OPTIONS,
  type OnboardingStep,
  showsFooter,
  UNVERIFIED_BLOCKED_MESSAGE,
  VERIFIED_BADGE,
  WELCOME_QUESTION,
  WELCOME_TITLE,
} from "../../src/features/onboarding/services/onboarding.ts";

const NEWCOMER: Account = {
  id: 7,
  first_name: "Ana",
  last_name: "Pérez",
  identification: "12345678",
  phone: "3001234567",
  correo: "ana@example.com",
  is_active: true,
  email_verified: true,
  can_create_farms: false,
  can_create_first_farm: true,
  can_open_inactive_farms: false,
};
const BLOCKED: Account = { ...NEWCOMER, can_create_first_farm: false };
const FARM: Farm = {
  id: 41,
  name: "La Primera",
  role: "administrador",
  created_at: "2026-11-12T08:00:00Z",
  updated_at: "2026-11-12T08:00:00Z",
  is_active: true,
  deactivated_at: null,
};

const noop = () => undefined;

function view(step: OnboardingStep, overrides: Partial<Parameters<typeof OnboardingView>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(OnboardingView, {
      account: NEWCOMER,
      step,
      createdFarm: null,
      joinedFarm: null,
      onChoose: noop,
      onCreated: noop,
      onOpenFarm: noop,
      onGuestJoined: noop,
      onOpenJoined: noop,
      onSkip: noop,
      onLogout: noop,
      ...overrides,
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("etapa del acceso", () => {
  const unverified = { ...NEWCOMER, email_verified: false };

  it("usuario nuevo verificado sin fincas ve la bienvenida", () => {
    expect(authStage(NEWCOMER, null, "none")).toBe("welcome");
  });

  it.each<FarmAccess>(["some", "dismissed"])("con acceso %s no vuelve al onboarding", (access) => {
    expect(authStage(NEWCOMER, null, access)).toBe("home");
  });

  it("mientras se revisan las fincas (o si falló) no muestra bienvenida ni panel", () => {
    expect(authStage(NEWCOMER, null, "unknown")).toBe("checking");
    expect(authStage(NEWCOMER, null, "error")).toBe("checking");
  });

  it("la invitación pendiente tiene prioridad sobre la bienvenida", () => {
    expect(authStage(NEWCOMER, "token", "none")).toBe("invitation");
    expect(authStage(NEWCOMER, "token", "unknown")).toBe("invitation");
  });

  it("sin verificar ve la verificación, aunque tenga invitación o no tenga fincas", () => {
    expect(authStage(unverified, null, "none")).toBe("verify");
    expect(authStage(unverified, "token", "none")).toBe("verify");
    expect(authStage(null, "token", "none")).toBe("access");
  });

  it("sin el tercer argumento conserva el comportamiento previo", () => {
    expect(authStage(NEWCOMER, null)).toBe("home");
  });

  it("decide el acceso a partir del listado y de las fincas desactivadas", () => {
    expect(farmAccessFrom([], NEWCOMER)).toBe("none");
    expect(farmAccessFrom([FARM], NEWCOMER)).toBe("some");
    expect(farmAccessFrom([], { can_open_inactive_farms: true })).toBe("some");
  });
});

describe("bienvenida", () => {
  it("muestra el saludo, la pregunta y las dos opciones", () => {
    const html = view("choose");
    expect(html).toContain(WELCOME_TITLE);
    expect(html).toContain(WELCOME_QUESTION);
    expect(html).toContain('data-option="create"');
    expect(html).toContain('data-option="guest"');
    expect(html).toContain("Crear una finca");
    expect(html).toContain("Entrar como invitado");
    expect(html).toContain("Cerrar sesión");
    expect(html).toContain("ana@example.com");
  });

  it("con la excepción de primera finca muestra el formulario", () => {
    const html = view("create");
    expect(html).toContain("Crea tu primera finca");
    expect(html).toContain('name="name"');
    expect(html).not.toContain(CREATE_BLOCKED_MESSAGE);
  });

  it("con la capacidad global también muestra el formulario", () => {
    const html = view("create", { account: { ...BLOCKED, can_create_farms: true } });
    expect(html).toContain('name="name"');
  });

  it("sin autorización explica el motivo y no muestra el formulario", () => {
    const html = view("create", { account: BLOCKED });
    expect(html).toContain(CREATE_BLOCKED_MESSAGE);
    expect(html).not.toContain('name="name"');
    expect(html).not.toContain("Crear finca</button>");
  });

  it("solo crea si el backend lo confirma y el correo está verificado", () => {
    expect(canCreateFarm(NEWCOMER)).toBe(true);
    expect(canCreateFarm(BLOCKED)).toBe(false);
    expect(canCreateFarm({ ...BLOCKED, can_create_farms: undefined, can_create_first_farm: undefined })).toBe(false);
    expect(canCreateFarm({ ...NEWCOMER, email_verified: false })).toBe(false);
    expect(createBlockedReason({ ...NEWCOMER, email_verified: false })).toBe(UNVERIFIED_BLOCKED_MESSAGE);
    expect(createBlockedReason(NEWCOMER)).toBe("");
  });

  it("confirma la creación y ofrece abrir la finca", () => {
    const html = view("created", { createdFarm: FARM });
    expect(html).toContain("Finca «La Primera» creada. Ya eres su administrador.");
    expect(html).toContain("Abrir mi finca");
    expect(html).not.toContain("Ir al inicio");
  });
});

describe("entrar como invitado", () => {
  it("muestra el formulario del código", () => {
    const html = view("guest");
    expect(html).toContain(GUEST_TITLE);
    expect(html).toContain(GUEST_PROMPT);
    expect(html).toContain('name="invitation-code"');
    expect(html).toContain("Continuar");
  });

  it("el paso de invitado usa el formulario común de códigos (F10.3.5)", () => {
    expect(normalizeGuestCode(" ab 12\tcd ")).toBe("AB12CD");
    expect(GUEST_EMPTY_MESSAGE).toBe("Escribe el código que recibiste.");
    const html = view("guest");
    expect(html).toContain('data-code-step="enter"');
    expect(html).toContain("Volver");
    expect(html).not.toContain("todavía no está conectada");
  });

  it("mostrar el paso de invitado no llama al backend ni guarda nada", () => {
    const fetchMock = vi.fn();
    const storage = { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    view("guest");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("tras unirse muestra la confirmación y el acceso a la finca", () => {
    const html = view("joined", {
      joinedFarm: { farmId: 9, message: "Te uniste a «El Roble» como Operador." },
    });
    expect(html).toContain('data-step="joined"');
    expect(html).toContain("Te uniste a «El Roble» como Operador.");
    expect(html).toContain("Abrir la finca");
    expect(html).not.toContain("Ir al inicio");
  });
});

describe("crear la primera finca", () => {
  it("nombre inválido: no llama al backend", async () => {
    const create = vi.fn(async () => FARM);
    expect((await runFarmCreation("   ", create)).kind).toBe("invalid");
    expect((await runFarmCreation("x".repeat(101), create)).kind).toBe("invalid");
    expect(create).not.toHaveBeenCalled();
  });

  it("crea con el nombre recortado", async () => {
    const create = vi.fn(async () => FARM);
    expect(await runFarmCreation("  La Primera ", create)).toEqual({ kind: "created", farm: FARM });
    expect(create).toHaveBeenCalledWith("La Primera");
  });

  it.each([
    ["403 sin verificar", new ApiError(403, "verifica tu correo para crear fincas"), UNVERIFIED_MESSAGE],
    ["403 sin permiso", new ApiError(403, "tu cuenta no tiene permiso para crear fincas"), FORBIDDEN_MESSAGE],
    ["401", new ApiError(401, "la sesion vencio"), SESSION_MESSAGE],
    ["red", new TypeError("Failed to fetch"), NETWORK_MESSAGE],
  ])("error %s: muestra un mensaje claro", async (_label, error, message) => {
    const result = await runFarmCreation("Finca", async () => {
      throw error;
    });
    expect(result).toEqual({ kind: "error", message });
  });

  it("400 del backend: muestra su mensaje", async () => {
    const result = await runFarmCreation("Finca", async () => {
      throw new ApiError(400, "el nombre de la finca es obligatorio");
    });
    expect(result.kind).toBe("error");
    expect(result.kind === "error" && result.message).toContain("nombre de la finca");
  });

  it("bloqueo de doble envío: dos envíos simultáneos crean una sola finca", async () => {
    let finish: (farm: Farm) => void = () => undefined;
    const create = vi.fn(() => new Promise<Farm>((resolve) => (finish = resolve)));
    const guard = createSubmitGuard();
    const first = guard(async () => {
      await runFarmCreation("Finca", create);
    });
    const second = guard(async () => {
      await runFarmCreation("Finca", create);
    });
    expect(await second).toBe(false);
    finish(FARM);
    expect(await first).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("el formulario reutilizado muestra título y acción del onboarding", () => {
    const html = renderToStaticMarkup(
      createElement(FarmCreateForm, {
        title: "Crea tu primera finca",
        cancelLabel: "Volver",
        onCreated: noop,
        onCancel: noop,
      }),
    );
    expect(html).toContain("Crea tu primera finca");
    expect(html).toContain("Volver");
    expect(html).toContain("Crear finca");
  });

  it("tras crear relee /auth/me y abre la finca creada", async () => {
    const refreshed = { ...NEWCOMER, can_create_farms: true, can_create_first_farm: false };
    const result = await completeFarmCreation(FARM, NEWCOMER, async () => refreshed);
    expect(result).toEqual({
      account: refreshed,
      landing: { section: "fincas", farmId: FARM.id },
      refreshed: true,
    });
    expect(authStage(result.account, null, "some")).toBe("home");
  });

  it("si la relectura falla conserva la cuenta y abre la finca igual", async () => {
    const result = await completeFarmCreation(FARM, NEWCOMER, async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(result.account).toBe(NEWCOMER);
    expect(result.refreshed).toBe(false);
    expect(result.landing.farmId).toBe(FARM.id);
  });

  it("envía POST /api/v1/farms/ con solo el nombre", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => "sesion-jwe",
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(FARM), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    await createFarm("La Primera");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/farms\/$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ name: "La Primera" });
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer sesion-jwe");
  });
});

describe("capacidad de crear en Fincas e Inventario", () => {
  it("la excepción de primera finca habilita Nueva finca", () => {
    expect(farmScreenActions(NEWCOMER).canCreate).toBe(true);
    expect(farmScreenActions(BLOCKED).canCreate).toBe(false);
    expect(farmScreenActions(undefined).canCreate).toBe(true);
  });

  it("el inventario vacío invita a crear la primera finca", () => {
    expect(emptyInventoryState(NEWCOMER).title).toBe("Primero crea una finca");
    expect(emptyInventoryState(BLOCKED).title).toBe("Aún no perteneces a ninguna finca");
  });
});

describe("distribución en dos paneles", () => {
  type Node = { type: unknown; props: Record<string, unknown> };
  // Subcomponentes locales sin hooks: se expanden para alcanzar los botones
  // reales y sus manejadores sin un DOM.
  const LOCAL = new Set(["OnboardingView", "IntroPanel", "ChooseStep", "ActionCard", "CheckIcon"]);

  function elements(node: unknown, found: Node[] = []): Node[] {
    if (Array.isArray(node)) {
      for (const child of node) elements(child, found);
      return found;
    }
    if (!node || typeof node !== "object" || !("props" in node)) return found;
    const el = node as Node;
    if (typeof el.type === "function" && LOCAL.has((el.type as { name: string }).name)) {
      return elements((el.type as (p: unknown) => unknown)(el.props), found);
    }
    found.push(el);
    elements(el.props.children, found);
    return found;
  }

  function tree(step: OnboardingStep, overrides: Partial<Parameters<typeof OnboardingView>[0]> = {}) {
    const handlers = { onChoose: vi.fn(), onSkip: vi.fn(), onLogout: vi.fn() };
    const root = createElement(OnboardingView, {
      account: NEWCOMER,
      step,
      createdFarm: null,
      joinedFarm: null,
      onCreated: noop,
      onOpenFarm: noop,
      onGuestJoined: noop,
      onOpenJoined: noop,
      ...handlers,
      ...overrides,
    });
    return { nodes: elements(root), ...handlers };
  }

  function buttonWith(nodes: Node[], text: string) {
    const match = nodes.find((n) => n.type === "button" && n.props.children === text);
    if (!match) throw new Error(`sin botón «${text}»`);
    return match;
  }

  it("panel izquierdo: marca, insignia de correo verificado, saludo y cuenta real", () => {
    const html = view("choose");
    expect(html).toContain('class="panel onboard-intro"');
    expect(html).toContain('class="brand-mark onboard-logo"');
    expect(html).toContain("AGROTECH-T");
    expect(html).toContain("data-verified");
    expect(html).toContain(VERIFIED_BADGE);
    expect(html).toContain(WELCOME_TITLE);
    expect(html).toContain(WELCOME_QUESTION);
    expect(html).toContain(`aria-label="${ACCOUNT_LABEL}"`);
    expect(html).toContain("Ana Pérez");
    expect(html).toContain("ana@example.com");
  });

  it("la insignia depende de email_verified de la cuenta", () => {
    const html = view("choose", { account: { ...NEWCOMER, email_verified: false } });
    expect(html).not.toContain(VERIFIED_BADGE);
  });

  it("sin nombre muestra la identificación; nunca datos ficticios", () => {
    const other: Account = {
      ...NEWCOMER,
      first_name: " ",
      last_name: "",
      identification: "99887766",
      correo: "campo.largo.de.correo.electronico@finca-muy-lejana.example.org",
    };
    expect(accountName(other)).toBe("99887766");
    expect(accountName(NEWCOMER)).toBe("Ana Pérez");
    const html = view("choose", { account: other });
    expect(html).toContain("99887766");
    expect(html).toContain(other.correo);
    expect(html).not.toContain("ana@example.com");
    expect(html).not.toContain("Ana Pérez");
  });

  it("dos tarjetas article con un solo botón cada una, sin controles anidados", () => {
    const html = view("choose");
    const articles = html.match(/<article[\s\S]*?<\/article>/g) ?? [];
    expect(articles).toHaveLength(2);
    for (const article of articles) {
      expect(article.match(/<button/g)).toHaveLength(1);
      expect(article).toMatch(/^<article class="onboard-option" aria-labelledby="onboard-(create|guest)-title"/);
    }
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
    expect(articles[0]).toContain("Crear una finca");
    expect(articles[0]).toContain("Registra tu finca y administra tu espacio de trabajo.");
    expect(articles[0]).toContain('data-option="create"');
    expect(articles[0]).toContain("Crear mi finca</button>");
    expect(articles[1]).toContain("Entrar como invitado");
    expect(articles[1]).toContain("Únete a una finca con la invitación que recibiste.");
    expect(articles[1]).toContain('data-option="guest"');
    expect(articles[1]).toContain("Tengo una invitación</button>");
    expect(html).toContain('type="button" class="solid onboard-option__action"');
    expect(html).toContain('aria-describedby="onboard-create-title onboard-create-text"');
  });

  it("cada botón abre su paso: crear → FarmCreateForm, invitación → InvitationCodeForm", () => {
    const { nodes, onChoose } = tree("choose");
    const create = nodes.find((n) => n.props["data-option"] === "create");
    const guest = nodes.find((n) => n.props["data-option"] === "guest");
    (create?.props.onClick as () => void)();
    (guest?.props.onClick as () => void)();
    expect(onChoose.mock.calls).toEqual([["create"], ["guest"]]);
    expect(ONBOARDING_OPTIONS.map((o) => [o.option, o.step, o.action])).toEqual([
      ["create", "create", "Crear mi finca"],
      ["guest", "guest", "Tengo una invitación"],
    ]);
    expect(view("create")).toContain('name="name"');
    expect(view("guest")).toContain('name="invitation-code"');
  });

  it("una cuenta sin permiso ve las mismas tarjetas y el paso explicativo de siempre", () => {
    const { nodes, onChoose } = tree("choose", { account: BLOCKED });
    const create = buttonWith(nodes, "Crear mi finca");
    expect(create.props.disabled).toBeUndefined();
    (create.props.onClick as () => void)();
    expect(onChoose).toHaveBeenCalledWith("create");
    const html = view("create", { account: BLOCKED });
    expect(html).toContain(CREATE_BLOCKED_MESSAGE);
    expect(html).toContain("onboard-intro");
  });

  it.each<OnboardingStep>(["choose", "create", "guest", "created", "joined"])(
    "el panel izquierdo se mantiene en el paso %s",
    (step) => {
      const html = view(step, {
        createdFarm: FARM,
        joinedFarm: { farmId: 9, message: "Te uniste a «El Roble» como Operador." },
      });
      expect(html).toContain("onboard-intro");
      expect(html).toContain("ana@example.com");
      expect(html).toContain(`class="panel onboard-actions" aria-label="Primeros pasos" data-step="${step}"`);
      expect(html.match(/class="panel onboard-intro"/g)).toHaveLength(1);
    },
  );

  it("el pie se muestra salvo tras crear o unirse, y conserva sus salidas", () => {
    expect((["choose", "create", "guest", "created", "joined"] as const).map(showsFooter)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    for (const step of ["create", "guest"] as const) {
      const html = view(step);
      expect(html).toContain("Ir al inicio");
      expect(html).toContain("Cerrar sesión");
    }
    const { nodes, onSkip, onLogout } = tree("choose");
    (buttonWith(nodes, "Ir al inicio").props.onClick as () => void)();
    (buttonWith(nodes, "Cerrar sesión").props.onClick as () => void)();
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("los controles son botones con nombre visible y la pantalla tiene un título", () => {
    const html = view("choose");
    expect(html.match(/<h2 id="onboard-title">/g)).toHaveLength(1);
    expect(html).toContain('aria-labelledby="onboard-title"');
    expect(html).toContain('<nav class="onboard-footer" aria-label="Salidas">');
    for (const button of html.match(/<button[^>]*>[^<]*<\/button>/g) ?? []) {
      expect(button).toContain('type="button"');
      expect(button.replace(/<[^>]+>/g, "").trim()).not.toBe("");
    }
  });
});
