/**
 * Pantalla posterior al ingreso.
 *
 * Propósito: montar el shell y las secciones de escritorio.
 * Contexto: Inicio, Inventario y el perfil de la cuenta.
 * @author Cristian Deysdayr Jimenez
 */

import { useState } from "react";
import { AppShell, type AppSection } from "../../../components/layout/index.ts";
import type { Account } from "../../auth/types/index.ts";
import { ConfiguracionScreen } from "../../configuracion/index.ts";
import { FarmsScreen } from "../../farms/index.ts";
import { InventarioPanel } from "../../inventario/index.ts";
import { ProfileScreen } from "../../profile/index.ts";
import { HomeHub } from "./HomeHub.tsx";

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
  focusFarmId?: number,
) {
  if (section === "fincas") return <FarmsScreen initialFarmId={focusFarmId} account={account} />;
  if (section === "inventario") return <InventarioPanel account={account} />;
  if (section === "configuracion") return <ConfiguracionScreen />;
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
  const content = renderSection(section, account, onAccountChange, focusFarmId);
  const navigate = (next: AppSection) => {
    setFocusFarmId(undefined);
    setSection(next);
  };

  return (
    <AppShell account={account} section={section} onNavigate={navigate} onLogout={onLogout}>
      {content}
    </AppShell>
  );
}
