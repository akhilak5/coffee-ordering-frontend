// src/components/Layout/IconSidebar.jsx
import React from "react";
import { NavLink, useLocation } from "react-router-dom";

function Icon({ name, className = "w-5 h-5" }) {
  // small inline icons (kept simple and accessible)
  switch (name) {
    case "dashboard":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="3" width="7" height="8" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="13" width="7" height="8" rx="1" />
        </svg>
      );
    case "book":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 5h14v14H3z" />
          <path d="M7 3v18" />
          <path d="M17 7h3" />
        </svg>
      );
    case "bookings":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M8 2v4" />
          <path d="M16 2v4" />
        </svg>
      );
    case "menu":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      );
    case "orders":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 7h18" />
          <path d="M7 21V7" />
          <path d="M17 21V7" />
        </svg>
      );
    case "history":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M21 12a9 9 0 1 1-3-6.7L21 6" />
          <path d="M12 7v6l4 2" />
        </svg>
      );
    default:
      return null;
  }
}

export default function IconSidebar() {
  const location = useLocation();
  const activeClass = "bg-amber-100 shadow-inner ring-1 ring-amber-200";

  const items = [
    { to: "/dashboard", label: "Dashboard", key: "dashboard", icon: "dashboard" },
    { to: "/dashboard/book", label: "Book a Table", key: "book", icon: "book" },
    { to: "/dashboard/bookings", label: "My Bookings", key: "bookings", icon: "bookings" },
    { to: "/dashboard/menu", label: "Order Food", key: "menu", icon: "menu" },
    { to: "/dashboard/orders", label: "My Orders", key: "orders", icon: "orders" },
    { to: "/dashboard/history", label: "History", key: "history", icon: "history" },
  ];

  return (
    <aside className="fixed left-0 top-[72px] bottom-0 w-64 bg-gradient-to-b from-[#FFF3DE] to-[#FFF9F5] border-r p-6 z-40">
      

      <nav className="space-y-2">
        {items.map((it) => {
          // Important: dashboard should only be active for exact "/dashboard" (so subroutes won't highlight it)
          const isDashboard = it.key === "dashboard";
          let isActive = false;

          if (isDashboard) {
            isActive = location.pathname === "/dashboard" || location.pathname === "/dashboard/";
          } else {
            // for other items: active when pathname starts with the item path
            isActive = location.pathname === it.to || location.pathname.startsWith(it.to + "/") || location.pathname === it.to;
          }

          return (
            <NavLink
              key={it.key}
              to={it.to}
              className={`flex items-center gap-3 p-3 rounded-lg transition ${isActive ? activeClass : "hover:bg-white/60"}`}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="w-9 h-9 rounded-md bg-white/90 flex items-center justify-center">
                <Icon name={it.icon} className="w-5 h-5 text-amber-700" />
              </div>
              <div className="text-sm text-gray-700">{it.label}</div>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}














