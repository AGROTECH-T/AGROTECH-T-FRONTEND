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
import { InventarioPanel } from "../../inventario/index.ts";
import { ProfileScreen } from "../../profile/index.ts";
import { HomeHub } from "./HomeHub.tsx";

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
) {
  if (section === "inventario") return <InventarioPanel />;
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
  const content = renderSection(section, account, onAccountChange);

  return (
    <AppShell account={account} section={section} onNavigate={setSection} onLogout={onLogout}>
      {content}
    </AppShell>
  );
}
