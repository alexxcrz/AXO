import { ClipboardList, History, LayoutDashboard, Menu } from "lucide-react";
import { PAGE_CUSTOM_BOARDS, PAGE_DASHBOARD, PAGE_HISTORY } from "../utils/constantes.js";

const TABS = [
  { id: "home", page: PAGE_DASHBOARD, label: "Inicio", Icon: LayoutDashboard },
  { id: "boards", page: PAGE_CUSTOM_BOARDS, label: "Tableros", Icon: ClipboardList },
  { id: "history", page: PAGE_HISTORY, label: "Historial", Icon: History },
  { id: "menu", page: null, label: "Menu", Icon: Menu },
];

export default function MobileBottomNav({ activePage, onNavigate, onOpenMenu }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegacion principal">
      {TABS.map(({ id, page, label, Icon }) => {
        const isActive = page ? activePage === page : false;
        return (
          <button
            key={id}
            type="button"
            className={`mobile-bottom-nav__item${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
            aria-label={label}
            onClick={() => {
              if (id === "menu") {
                onOpenMenu?.();
                return;
              }
              onNavigate?.(page);
            }}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
