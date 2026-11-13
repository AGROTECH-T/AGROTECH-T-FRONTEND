/**
 * Pantalla posterior al ingreso.
 *
 * Propósito: montar el shell y las secciones de escritorio.
 * Contexto: Inicio, Inventario y el perfil de la cuenta.
 * @author Cristian Deysdayr Jimenez
 */

import { useEffect, useState } from "react";
import { AppShell, type AppSection } from "../../../components/layout/index.ts";
import { NoticeStack, useNotices } from "../../../components/ui/NoticeStack.tsx";
import type { Account } from "../../auth/types/index.ts";
import { ConfiguracionScreen } from "../../configuracion/index.ts";
import { FarmsScreen } from "../../farms/index.ts";
import { GalponPanel } from "../../galpon/components/GalponPanel.tsx";
import { InventarioPanel } from "../../inventario/index.ts";
import { ProfileScreen } from "../../profile/index.ts";
import { HomeHub } from "./HomeHub.tsx";

type StockView =
  | "lista"
  | "crear"
  | "entrada"
  | "salida"
  | "historial"
  | "inventarios"
  | "catalogo"
  | "categorias"
  | "unidades"
  | "medidas"
  | "reportes"
  | "ajustes"
  | "consumo"
  | "prestamos"
  | "pedido"
  | "bajo";

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
};

/**
 * Elige el contenido según la sección activa.
 * @param section - Sección actual del shell.
 * @param account - Cuenta autenticada.
 * @param onAccountChange - Notifica la cuenta ya actualizada.
 * @returns El panel correspondiente.
 */
function renderSection(
  section: AppSection,
  account: Account,
  onAccountChange: (account: Account) => void,
  farmView: "lista" | "crear",
  onFarmView: (view: "lista" | "crear") => void,
  stockView: StockView,
  onStockView: (view: StockView) => void,
  stockTick: number,
  onCreateFarm: () => void,
  onLeaveCreate: () => void,
) {
  if (section === "fincas") {
    return <FarmsScreen view={farmView} onView={onFarmView} onLeaveCreate={onLeaveCreate} />;
  }
  if (section === "inventario") {
    return (
      <InventarioPanel
        view={stockView}
        tick={stockTick}
        onView={onStockView}
        onCreateFarm={onCreateFarm}
      />
    );
  }
  if (section === "galpon") return <GalponPanel onCreateFarm={onCreateFarm} />;
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
export function HomeScreen({ account, onAccountChange, onLogout }: Readonly<Props>) {
  const [section, setSection] = useState<AppSection>("home");
  const [farmView, setFarmView] = useState<"lista" | "crear">("lista");
  const [stockView, setStockView] = useState<StockView>("lista");
  const [stockTick, setStockTick] = useState(0);
  const [backToInventory, setBackToInventory] = useState(false);
  const notices = useNotices();

  const go = (next: AppSection, view?: string) => {
    if (next !== "perfil" && !account.modulos.includes(next)) return;
    setSection(next);
    if (next === "fincas") setFarmView(view === "crear" ? "crear" : "lista");
    if (next === "inventario") {
      setStockView(asStockView(view));
      if (asStockView(view) === "lista") setStockTick((current) => current + 1);
    }
  };

  const content = renderSection(
    section,
    account,
    onAccountChange,
    farmView,
    setFarmView,
    stockView,
    setStockView,
    stockTick,
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
