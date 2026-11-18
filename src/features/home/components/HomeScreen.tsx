/**
 * Pantalla posterior al ingreso.
 *
 * Propósito: montar el shell y las secciones de escritorio.
 * Contexto: Inicio, Inventario y el perfil de la cuenta.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useRef, useState } from "react";
import { AppShell, type AppSection } from "../../../components/layout/index.ts";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import type { Account } from "../../auth/types/index.ts";
import { ConfiguracionScreen } from "../../configuracion/index.ts";
import { FarmsScreen } from "../../farms/index.ts";
import { GalponPanel } from "../../galpon/components/GalponPanel.tsx";
import { InventarioPanel, type StockView } from "../../inventario/index.ts";
import { IotScreen } from "../../iot/index.ts";
import { ProfileScreen } from "../../profile/index.ts";
import {
  pushAppHistory,
  replaceAppHistory,
  subscribeAppHistory,
  type AppHistoryState,
} from "../services/appHistory.ts";
import { HomeHub } from "./HomeHub.tsx";

function asStockView(view?: string): StockView {
  if (
    view === "crear" ||
    view === "entrada" ||
    view === "salida" ||
    view === "historial" ||
    view === "inventarios" ||
    view === "catalogo" ||
    view === "categorias" ||
    view === "unidades" ||
    view === "medidas" ||
    view === "reportes" ||
    view === "ajustes" ||
    view === "consumo" ||
    view === "prestamos" ||
    view === "pedido" ||
    view === "bajo"
  ) {
    return view;
  }
  return "lista";
}

type Props = {
  account: Account;
  onAccountChange: (account: Account) => void;
  onLogout: () => void;
  /** Sección con la que se abre el shell (p. ej. tras aceptar una invitación). */
  initialSection?: AppSection;
  /** Finca que Fincas debe abrir una sola vez al montar. */
  initialFarmId?: number;
};

/**
 * Elige el contenido según la sección activa.
 * @param section - Sección actual del shell.
 * @param account - Cuenta autenticada.
 * @param onAccountChange - Notifica la cuenta ya actualizada.
 * @param focusFarmId - Finca que Fincas abre al montar, si existe.
 * @returns El panel correspondiente.
 */
function renderSection(
  section: AppSection,
  account: Account,
  onAccountChange: (account: Account) => void,
  farmView: "lista" | "crear",
  farmTick: number,
  onFarmView: (view: "lista" | "crear") => void,
  stockView: StockView,
  onStockView: (view: StockView) => void,
  stockTick: number,
  galponTick: number,
  onCreateFarm: () => void,
  onLeaveCreate: () => void,
  onOpenInventory: (farmId: number, inventoryId?: string) => void,
  onOpenGalpon: (farmId: number, houseId?: number) => void,
  focusFarmId?: number,
  inventoryFocus?: { farmId: number; inventoryId?: string } | null,
  galponFocus?: { farmId: number; houseId?: number } | null,
) {
  if (section === "fincas") {
    return (
      <FarmsScreen
        initialFarmId={focusFarmId}
        account={account}
        view={farmView}
        tick={farmTick}
        onView={onFarmView}
        onLeaveCreate={onLeaveCreate}
        onOpenInventory={onOpenInventory}
        onOpenGalpon={onOpenGalpon}
      />
    );
  }
  if (section === "inventario") {
    return (
      <InventarioPanel
        view={stockView}
        tick={stockTick}
        onView={onStockView}
        onCreateFarm={onCreateFarm}
        initialFarmId={inventoryFocus?.farmId}
        initialInventoryId={inventoryFocus?.inventoryId}
      />
    );
  }
  if (section === "galpon") {
    return (
      <GalponPanel
        tick={galponTick}
        onCreateFarm={onCreateFarm}
        initialFarmId={galponFocus?.farmId}
        initialHouseId={galponFocus?.houseId}
      />
    );
  }
  if (section === "iot") return <IotScreen />;
  if (section === "configuracion") return <ConfiguracionScreen account={account} />;
  if (section === "perfil") {
    return <ProfileScreen account={account} onAccountChange={onAccountChange} />;
  }
  return <HomeHub account={account} />;
}

/**
 * Orquesta la navegación del área autenticada.
 * @param props - Cuenta activa, su actualización y el cierre de sesión.
 * @returns Shell con la sección activa.
 */
export function HomeScreen({
  account,
  onAccountChange,
  onLogout,
  initialSection,
  initialFarmId,
}: Readonly<Props>) {
  const [section, setSection] = useState<AppSection>(initialSection ?? "home");
  const [focusFarmId, setFocusFarmId] = useState<number | undefined>(initialFarmId);
  const [farmView, setFarmView] = useState<"lista" | "crear">("lista");
  const [farmTick, setFarmTick] = useState(0);
  const [stockView, setStockView] = useState<StockView>("lista");
  const [stockTick, setStockTick] = useState(0);
  const [galponTick, setGalponTick] = useState(0);
  const [backToInventory, setBackToInventory] = useState(false);
  const [inventoryFocus, setInventoryFocus] = useState<{
    farmId: number;
    inventoryId?: string;
  } | null>(null);
  const [galponFocus, setGalponFocus] = useState<{
    farmId: number;
    houseId?: number;
  } | null>(null);
  const notices = useNotices();
  const skippingHistory = useRef(false);
  const placeRef = useRef<AppHistoryState>({
    agrotechApp: true,
    section: initialSection ?? "home",
  });
  const modulesRef = useRef(account.modulos);
  modulesRef.current = account.modulos;

  const activeView = (next: AppSection, view?: string) => {
    if (next === "fincas") return view === "crear" ? "crear" : "lista";
    if (next === "inventario") return asStockView(view);
    if (next === "galpon") return "galpones";
    return view;
  };

  const remember = (next: AppSection, view?: string) => {
    placeRef.current = view
      ? { agrotechApp: true, section: next, view }
      : { agrotechApp: true, section: next };
  };

  const applySection = (next: AppSection, view?: string) => {
    if (next !== "perfil" && !modulesRef.current.includes(next)) return;
    setFocusFarmId(undefined);
    if (next !== "inventario") setInventoryFocus(null);
    if (next !== "galpon") setGalponFocus(null);
    setSection(next);
    remember(next, activeView(next, view));
    if (next === "fincas") {
      setFarmView(view === "crear" ? "crear" : "lista");
      setFarmTick((current) => current + 1);
    }
    if (next === "inventario") {
      setStockView(asStockView(view));
      setStockTick((current) => current + 1);
    }
    if (next === "galpon") {
      setGalponTick((current) => current + 1);
    }
  };

  const go = (next: AppSection, view?: string) => {
    if (next !== "perfil" && !account.modulos.includes(next)) return;
    const resolved = activeView(next, view);
    const same =
      next === section &&
      (next === "fincas"
        ? resolved === farmView
        : next === "inventario"
          ? resolved === stockView
          : true);
    applySection(next, view);
    if (!same && !skippingHistory.current) pushAppHistory(next, resolved);
  };

  const openInventory = (farmId: number, inventoryId?: string) => {
    if (!account.modulos.includes("inventario")) return;
    setFocusFarmId(undefined);
    setGalponFocus(null);
    setInventoryFocus({ farmId, inventoryId });
    setSection("inventario");
    setStockView("lista");
    setStockTick((current) => current + 1);
    remember("inventario", "lista");
    if (!skippingHistory.current) pushAppHistory("inventario", "lista");
  };

  const openGalpon = (farmId: number, houseId?: number) => {
    if (!account.modulos.includes("galpon")) return;
    setFocusFarmId(undefined);
    setInventoryFocus(null);
    setGalponFocus({ farmId, houseId });
    setSection("galpon");
    setGalponTick((current) => current + 1);
    remember("galpon", "galpones");
    if (!skippingHistory.current) pushAppHistory("galpon", "galpones");
  };

  useEffect(() => {
    const start = initialSection ?? "home";
    remember(start);
    replaceAppHistory(start);
    return subscribeAppHistory((state: AppHistoryState | null) => {
      if (!state) {
        // Atrás saldría de la app → reponemos entrada y conservamos la sesión.
        const place = placeRef.current;
        pushAppHistory(place.section, place.view);
        return;
      }
      if (state.section !== "perfil" && !modulesRef.current.includes(state.section)) {
        replaceAppHistory("home");
        skippingHistory.current = true;
        applySection("home");
        skippingHistory.current = false;
        return;
      }
      skippingHistory.current = true;
      applySection(state.section, state.view);
      skippingHistory.current = false;
    });
  }, [initialSection]);

  const content = renderSection(
    section,
    account,
    onAccountChange,
    farmView,
    farmTick,
    setFarmView,
    stockView,
    setStockView,
    stockTick,
    galponTick,
    () => {
      setBackToInventory(section === "inventario");
      go("fincas", "crear");
    },
    () => {
      if (backToInventory) {
        setBackToInventory(false);
        setSection("inventario");
        return;
      }
      setFarmView("lista");
    },
    openInventory,
    openGalpon,
    focusFarmId,
    inventoryFocus,
    galponFocus,
  );

  useEffect(() => {
    if (section !== "perfil" && !account.modulos.includes(section)) {
      setSection("home");
    }
  }, [account.modulos, section]);

  useEffect(() => {
    const flash = sessionStorage.getItem("agrotech-t.flash");
    if (!flash) return;
    sessionStorage.removeItem("agrotech-t.flash");
    notices.push([flash], "ok");
  }, [notices]);

  return (
    <AppShell
      account={account}
      section={section}
      view={section === "inventario" ? stockView : section === "galpon" ? "galpones" : farmView}
      onNavigate={go}
      onLogout={onLogout}
    >
      <NoticeStack items={notices.items} onClose={notices.close} />
      {content}
    </AppShell>
  );
}
