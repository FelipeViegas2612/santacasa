import { useNavigate, useLocation } from "react-router-dom";
import "./Sidebar.css";

const NAV_ITEMS = [
  {
    label: "Acolhidos",
    path: "/acolhidos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="7" r="4"/>
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        <path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
      </svg>
    ),
    match: "/acolhidos",
  },
  {
    label: "Quartos",
    path: "/quartos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    match: "/quartos",
  },
  {
    label: "Medicamentos",
    path: "/medicamentos",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
        <path d="M12 8v8M8 12h8" strokeLinecap="round"/>
      </svg>
    ),
    match: "/medicamentos",
  },
  {
    label: "Painel TV",
    path: "/tv",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="14" rx="2"/>
        <path d="M8 22h8M12 18v4"/>
      </svg>
    ),
    match: "/tv",
  },
];

export default function Sidebar({ active }) {
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { localStorage.removeItem("user"); return {}; } })();

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-top">
        <div className="app-sidebar-divider" />
        <nav className="app-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.path}
              className={`app-sidebar-item${active === item.match ? " active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              <span className="app-sidebar-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
      </div>
      <div className="app-sidebar-bottom">
        <div className="app-sidebar-divider" />
        <div className="app-sidebar-profile" onClick={() => navigate("/perfil")}>
          <span className="app-sidebar-avatar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
          </span>
          <span className="app-sidebar-username">{user.name || "Usuário"}</span>
        </div>
      </div>
    </aside>
  );
}
