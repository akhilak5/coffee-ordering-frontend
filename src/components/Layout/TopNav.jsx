// src/components/Layout/TopNav.jsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function TopNav({
  user,
  onLogout,
  cartCount = 0,
  onCartClick,
  showCart = true,
}) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const nav = useNavigate();

  const role = (user?.role || "").toUpperCase();
  const isUser = role === "USER";
  const isAdmin = role === "ADMIN";

  const isHome = location.pathname === "/";

  function handleBrandClick() {
    if (isAdmin) nav("/admin");
    else if (user) nav("/dashboard");
    else nav("/");
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      {/* Yellow gradient bar */}
      <div className="h-[72px] w-full bg-gradient-to-r from-amber-500 via-amber-400 to-orange-400 shadow-md border-b border-amber-300/60">
        <div className="max-w-6xl mx-auto h-full flex items-center justify-between px-4 md:px-6">
          {/* Brand */}
          <button
            onClick={handleBrandClick}
            className="flex items-center gap-3 text-white"
          >
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow">
              <img
                src="/coffee-icon.png"
                alt="JavaBite"
                className="w-8 h-8 rounded-full object-cover"
              />
            </div>
            <div className="text-left">
              <div className="text-lg font-extrabold tracking-wide">
                JavaBite
              </div>
              <div className="text-[11px] uppercase tracking-[0.12em] text-white/80">
                {isAdmin ? "Admin panel" : "Coffee & Bistro"}
              </div>
            </div>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* HOME LINK in navbar – only when NOT logged in */}
            {!user && (
              <Link
                to="/"
                className={`hidden sm:inline-block text-sm font-medium px-3 py-1.5 rounded-full border transition
                  ${
                    isHome
                      ? "bg-white/20 border-white/70 text-white"
                      : "border-transparent text-white/90 hover:bg-white/10 hover:border-white/40"
                  }`}
              >
                Home
              </Link>
            )}

            {/* Cart icon → only for logged-in USER, never for admin */}
            {user && isUser && showCart && (
              <button
                onClick={onCartClick}
                className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/95 text-amber-800 shadow-sm hover:bg-white transition"
              >
                <span className="text-xl">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[11px] text-white flex items-center justify-center px-1">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* If not logged in → Login / Register buttons */}
            {!user && (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-amber-900 bg-white/95 shadow-sm hover:bg-white"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-white border border-white/80 hover:bg-white/10"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Logged-in avatar dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setOpen((o) => !o)}
                  className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-sm border border-amber-200"
                >
                  <span className="text-sm font-semibold text-amber-800">
                    {user.name?.[0]?.toUpperCase() || "U"}
                  </span>
                </button>

                {open && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden"
                    onMouseLeave={() => setOpen(false)}
                  >
                    {/* Header with name/email */}
                    <div className="px-3 py-2 bg-amber-50/70 border-b border-amber-100">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        {isAdmin ? "Admin" : "Signed in as"}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.email}
                      </div>
                    </div>

                    {/* USER menu (dashboard, orders, history, view profile) */}
                    {isUser && (
                      <>
                        <button
                          onClick={() => {
                            setOpen(false);
                            nav("/dashboard");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                        >
                          Dashboard
                        </button>

                        <button
                          onClick={() => {
                            setOpen(false);
                            nav("/dashboard/orders");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                        >
                          My orders
                        </button>

                        <button
                          onClick={() => {
                            setOpen(false);
                            nav("/dashboard/history");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                        >
                          History
                        </button>

                        <button
                          onClick={() => {
                            setOpen(false);
                            nav("/dashboard/profile");
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-amber-50"
                        >
                          View Profile
                        </button>

                        <div className="border-t border-amber-50 my-1" />
                      </>
                    )}

                    {/* ADMIN (or any role) – Logout */}
                   
                    <button
                      onClick={() => {
                        setOpen(false);
                        onLogout && onLogout();
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}










