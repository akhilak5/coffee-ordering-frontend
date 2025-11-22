// src/App.jsx
// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import "./index.css";
import ProtectedRoute from "./components/ProtectedRoute";

import ChefDashboard from "./pages/ChefDashboard";
import WaiterDashboard from "./pages/WaiterDashboard";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  // --- TOAST (single source of truth) ---
  // toast: { id:number, message:string, type: "success"|"error"|"info" }
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success", duration = 2500) {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, duration);
  }
  // -----------------------------------------

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  // CART
  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // LOGIN POPUP
  const [authPopup, setAuthPopup] = useState(false);

  function addToCart(item, qty = 1) {
    if (!user) {
      setAuthPopup(true);
      return;
    }

    setCart((prev) => {
      const found = prev.find((i) => i.id === item.id);
      if (found) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [...prev, { ...item, qty }];
    });
  }

  const openCart = () => setDrawerOpen(true);
  const closeCart = () => setDrawerOpen(false);

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((i) => i.id !== id));

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">

      {/* NAVBAR */}
      <nav className="w-full bg-amber-50 border-b border-amber-200 fixed top-0 left-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">

          {/* LEFT - LOGO */}
          <div className="flex items-center gap-3">
            <img
              src={process.env.PUBLIC_URL + "/coffee-icon.png"}
              alt="logo"
              className="w-10 h-16 rounded-full"
            />
            <h1 className="text-xl font-bold text-amber-800">JavaBite</h1>
          </div>

          {/* RIGHT - NAV LINKS */}
          <div className="flex items-center gap-6">

            <Link to="/" className="text-gray-700 hover:text-amber-700">Home</Link>

            {/* role-based dashboard links */}
            {user?.role === "CHEF" && (
              <Link to="/chef" className="text-gray-700 hover:text-amber-700">Chef</Link>
            )}
            {user?.role === "WAITER" && (
              <Link to="/waiter" className="text-gray-700 hover:text-amber-700">Waiter</Link>
            )}
            {user?.role === "ADMIN" && (
              <Link to="/admin" className="text-gray-700 hover:text-amber-700">Admin</Link>
            )}

            {/* show Login only when logged out */}
            {!user && (
              <Link to="/login" className="text-gray-700 hover:text-amber-700">Login</Link>
            )}

            {/* CART ICON */}
            <button
              onClick={openCart}
              className="relative p-2 rounded hover:bg-gray-100"
              type="button"
            >
              <svg
                className="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-2 6h13M16 21a1 1 0 100-2 1 1 0 000 2zm-7 0a1 1 0 100-2 1 1 0 000 2z"/>
              </svg>

              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
              )}
            </button>

            {/* Register (when logged out) or Logout (when logged in) */}
            {!user ? (
              <Link
                to="/register"
                className="bg-amber-700 text-white px-4 py-2 rounded-lg shadow hover:bg-amber-800"
              >
                Register
              </Link>
            ) : (
              <button
                onClick={() => {
                  setUser(null);
                  localStorage.removeItem("user");
                  showToast("Logged out", "success"); // simple green toast
                }}
                className="text-red-600 px-3 py-1"
              >
                Logout
              </button>
            )}

          </div>
        </div>
      </nav>

      {/* ROUTES */}
      <main className="flex-1 pt-20">
        <Routes>
          <Route path="/" element={<Home addToCart={addToCart} />} />
          <Route path="/register" element={
            <Register
              onRegistered={(u) => {
                setUser(u);
                showToast("Registered successfully", "success");
              }}
            />
          } />
          <Route path="/login" element={
            <Login
              onLogin={(u) => {
                setUser(u);
                showToast("Login successful", "success");
              }}
              showToast={showToast}
            />
          } />

          <Route
            path="/chef"
            element={
              <ProtectedRoute user={user} allowedRoles={["CHEF", "ADMIN"]}>
                <ChefDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/waiter"
            element={
              <ProtectedRoute user={user} allowedRoles={["WAITER", "ADMIN"]}>
                <WaiterDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

        </Routes>
      </main>

      {/* CART DRAWER */}
      <div className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`}>
        {/* overlay */}
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${drawerOpen ? "opacity-100" : "opacity-0"}`}
          onClick={closeCart}
        />

        {/* RIGHT DRAWER */}
        <aside
          className={`absolute right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cart</h3>
              <button onClick={closeCart} className="text-sm text-gray-500">✕</button>
            </div>

            <div className="overflow-auto space-y-3 flex-1">
              {cart.length === 0 ? (
                <div className="text-gray-500">Your cart is empty.</div>
              ) : (
                cart.map((it) => (
                  <div key={it.id} className="bg-gray-50 p-3 rounded-lg flex items-start justify-between">
                    <div>
                      <div className="font-semibold">{it.name}</div>
                      <div className="text-sm text-gray-600">Qty: {it.qty}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold">₹{(it.price || 0) * it.qty}</div>
                      <button onClick={() => removeFromCart(it.id)} className="text-sm text-red-500 mt-1">Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">Total</div>
                <div className="font-bold">₹{total}</div>
              </div>

              <button className="w-full bg-blue-600 text-white py-2 rounded">Proceed</button>
              <button onClick={clearCart} className="w-full border border-gray-300 py-2 rounded mt-2">Clear</button>
            </div>
          </div>
        </aside>
      </div>

      {/* LOGIN / REGISTER POPUP */}
      {authPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-80 rounded-2xl shadow-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900">Please Login</h3>
            <p className="text-sm text-gray-600 mt-2">You must login or register before adding items to cart.</p>

            <div className="flex gap-3 mt-5">
              <Link to="/login" className="flex-1 bg-amber-700 text-white py-2 rounded-md" onClick={() => setAuthPopup(false)}>Login</Link>

              <Link to="/register" className="flex-1 border border-amber-700 text-amber-700 py-2 rounded-md" onClick={() => setAuthPopup(false)}>Register</Link>
            </div>

            <button onClick={() => setAuthPopup(false)} className="mt-4 text-sm text-gray-600 hover:underline">Close</button>
          </div>
        </div>
      )}

      {/* TOAST — rectangular, right side, just below navbar */}
      {toast && (
        <div
          className="fixed top-[72px] right-6 z-50 animate-toastSlide pointer-events-none"
          aria-live="polite"
        >
          <div
            className={`pointer-events-auto max-w-xs w-full px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium
              ${toast.type === "success" ? "bg-emerald-600" :
              toast.type === "error" ? "bg-red-600" :
              "bg-sky-600"}`}
            role="status"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">{toast.message}</span>

              {/* CLOSE BUTTON */}
              <button
                onClick={() => setToast(null)}
                className="flex-none text-white/80 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#0E1525] text-white pt-14 pb-8 mt-10">
        <div className="max-w-screen-xl mx-auto px-6 md:px-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* About Section */}
          <div>
            <h3 className="text-xl font-bold mb-4">JavaBite</h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              JavaBite brings you freshly brewed coffee, cozy ambience, and a friendly atmosphere to relax and recharge every day.
            </p>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
            <p className="text-sm text-gray-300">📞 +91 7989007702</p>
            <p className="text-sm text-gray-300 mt-1">✉️ support@javabite.com</p>
            <p className="text-sm text-gray-300 mt-1">📍 123 Coffee Lane, Downtown</p>

            {/* Social */}
            <div className="flex gap-4 mt-4">
              <a className="text-gray-300 hover:text-white text-xl">🌐</a>
              <a className="text-gray-300 hover:text-white text-xl">📘</a>
              <a className="text-gray-300 hover:text-white text-xl">📸</a>
              <a className="text-gray-300 hover:text-white text-xl">🐦</a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="/" className="hover:underline">Home</a></li>
              <li><a href="#menu-preview" className="hover:underline">Menu</a></li>
              <li><a href="#why" className="hover:underline">Why JavaBite</a></li>
              <li><a href="#services" className="hover:underline">Services</a></li>
              <li><a href="#contact" className="hover:underline">Contact</a></li>
            </ul>
          </div>

          {/* Visit Us (NO MAP) */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Visit Us</h4>

            <p className="text-sm text-gray-300">
              We’re located in the heart of the city with a warm, cozy space waiting for you.
            </p>

            <p className="text-sm text-gray-300 mt-3">
              Open Hours:
              <br /> Mon – Fri: 8:00 AM – 8:00 PM
              <br /> Sat – Sun: 9:00 AM – 9:00 PM
            </p>
          </div>

        </div>

        <div className="mt-10 border-t border-gray-700 pt-5 text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} JavaBite. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
