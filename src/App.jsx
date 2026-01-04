// src/App.jsx
import React, { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import "./index.css";
import ProtectedRoute from "./components/ProtectedRoute";

import ChefDashboard from "./pages/ChefDashboard";
import WaiterDashboard from "./pages/WaiterDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import TopNav from "./components/Layout/TopNav";
import ResetPassword from "./pages/ResetPassword";
import StaffPage from "./pages/StaffPage";
import StaffActivatePage from "./pages/StaffActivatePage";
import AdminMenuPage from "./pages/AdminMenuPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminReviewsPage from "./pages/AdminReviewsPage";



export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboardRoute = location.pathname.startsWith("/dashboard");
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isStaffRoute =
    location.pathname.startsWith("/chef") ||
    location.pathname.startsWith("/waiter");

  // ✅ Read user from localStorage on first load
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.error) {
        localStorage.removeItem("user");
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  // ✅ Keep localStorage in sync with user state
  useEffect(() => {
    try {
      if (user && !user.error) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
      }
    } catch {
      // ignore
    }
  }, [user]);

  const [toast, setToast] = useState(null);
  function showToast(message, type = "success", duration = 2500) {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, duration);
  }

  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cart")) || [];
    } catch {
      return [];
    }
  });

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("cart", JSON.stringify(cart));
    } catch {}
  }, [cart]);

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
      {/* TOP NAV */}
      <TopNav
        user={user}
        onLogout={() => {
          setUser(null);
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          localStorage.removeItem("cart");
          setCart([]);
          showToast("Logged out", "success");
          navigate("/", { replace: true });
        }}
        onProfileClick={() => {
          if (!user) return;
          const role = (user.role || "").toUpperCase();

          if (role === "ADMIN") {
            navigate("/admin?tab=PROFILE");
          } else if (role === "CHEF") {
            navigate("/chef?tab=PROFILE");
          } else if (role === "WAITER") {
            navigate("/waiter?tab=PROFILE");
          } else {
            navigate("/dashboard"); // user profile; you can change later
          }
        }}
        cartCount={cart.reduce((s, i) => s + i.qty, 0)}
        onCartClick={openCart}
        showCart={user?.role === "USER"}
      />

      {/* ROUTES */}
      <main className="flex-1 pt-[72px] bg-[#F8F9FB]">
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/register"
            element={
              <Register
                onRegistered={(u) => {
                  setUser(u);
                  showToast("Registered successfully", "success");
                  navigate("/dashboard", { replace: true });
                }}
              />
            }
          />

          <Route path="/staff/activate" element={<StaffActivatePage />} />

          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                <AdminReportsPage />
              </ProtectedRoute>
            }
          />

          

          <Route
            path="/login"
            element={
              <Login
                onLogin={(u) => {
                  setUser(u);
                  showToast("Login successful", "success");

                  const role = (u?.role || "").toUpperCase();
                  if (role === "ADMIN") navigate("/admin", { replace: true });
                  else if (role === "CHEF") navigate("/chef", { replace: true });
                  else if (role === "WAITER")
                    navigate("/waiter", { replace: true });
                  else navigate("/dashboard", { replace: true });
                }}
                showToast={showToast}
              />
            }
          />

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
          <Route
  path="/admin/reviews"
  element={
    <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
      <AdminReviewsPage />
    </ProtectedRoute>
  }
/>


          {/* Staff management page (only ADMIN) */}
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                <StaffPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/menu"
            element={
              <ProtectedRoute user={user} allowedRoles={["ADMIN"]}>
                <AdminMenuPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/reset-password"
            element={<ResetPassword showToast={showToast} />}
          />

          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute
                user={user}
                allowedRoles={["USER", "ADMIN", "CHEF", "WAITER"]}
              >
                <UserDashboard
                  showToast={showToast}
                  addToCart={addToCart}
                  cart={cart}
                  setCart={setCart}
                />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* CART DRAWER */}
      <div
        className={`fixed inset-0 z-50 ${
          drawerOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeCart}
        />
        <aside
          className={`absolute right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform ${
            drawerOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="p-5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Cart</h3>
              <button onClick={closeCart} className="text-sm text-gray-500">
                ✕
              </button>
            </div>

            <div className="overflow-auto space-y-3 flex-1">
              {cart.length === 0 ? (
                <div className="text-gray-500">Your cart is empty.</div>
              ) : (
                cart.map((it) => (
                  <div
                    key={it.id}
                    className="bg-gray-50 p-3 rounded-lg flex items-start justify-between"
                  >
                    <div>
                      <div className="font-semibold">{it.name}</div>
                      <div className="text-sm text-gray-600">
                        Qty: {it.qty}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-semibold">
                        ₹{(it.price || 0) * it.qty}
                      </div>
                      <button
                        onClick={() => removeFromCart(it.id)}
                        className="text-sm text-red-500 mt-1"
                      >
                        Remove
                      </button>
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

              <button
  className="w-full bg-blue-600 text-white py-2 rounded"
  onClick={() => {
    closeCart();
    navigate("/dashboard/cart");
  }}
>
  Checkout
</button>


              <button
                onClick={clearCart}
                className="w-full border border-gray-300 py-2 rounded mt-2"
              >
                Clear
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* LOGIN POPUP */}
      {authPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-80 rounded-2xl shadow-2xl p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900">Please Login</h3>
            <p className="text-sm text-gray-600 mt-2">
              You must login or register before adding items to cart.
            </p>

            <div className="flex gap-3 mt-5">
              <Link
                to="/login"
                className="flex-1 bg-amber-700 text-white py-2 rounded-md"
                onClick={() => setAuthPopup(false)}
              >
                Login
              </Link>
              <Link
                to="/register"
                className="flex-1 border border-amber-700 text-amber-700 py-2 rounded-md"
                onClick={() => setAuthPopup(false)}
              >
                Register
              </Link>
            </div>
            <button
              onClick={() => setAuthPopup(false)}
              className="mt-4 text-sm text-gray-600 hover:underline"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          className="fixed top-[72px] right-6 z-50 animate-toastSlide pointer-events-none"
          aria-live="polite"
        >
          <div
            className={`pointer-events-auto max-w-xs w-full px-4 py-3 rounded-lg shadow-xl text-white text-sm font-medium
              ${
                toast.type === "success"
                  ? "bg-emerald-600"
                  : toast.type === "error"
                  ? "bg-red-600"
                  : "bg-sky-600"
              }`}
            role="status"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="truncate">{toast.message}</span>
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

      {/* FOOTER */}
      {/* 🔹 Hide footer on dashboard, admin, chef, waiter */}
      {!isDashboardRoute && !isAdminRoute && !isStaffRoute && (
        <footer className="bg-[#0E1525] text-white pt-14 pb-8 mt-10">
          <div className="max-w-screen-xl mx-auto px-6 md:px-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <h3 className="text-xl font-bold mb-4">JavaBite</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                JavaBite brings you freshly brewed coffee, cozy ambience, and a
                friendly atmosphere to relax and recharge every day.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Contact Us</h4>
              <p className="text-sm text-gray-300">📞 +91 7989007702</p>
              <p className="text-sm text-gray-300 mt-1">
                ✉️ javabite.cafe@gmail.com
              </p>
              <p className="text-sm text-gray-300 mt-1">
                📍 123 Coffee Lane, Downtown
              </p>

              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  className="text-gray-300 hover:text-white text-xl"
                  aria-label="Website"
                >
                  🌐
                </button>
                <button
                  type="button"
                  className="text-gray-300 hover:text-white text-xl"
                  aria-label="Facebook"
                >
                  📘
                </button>
                <button
                  type="button"
                  className="text-gray-300 hover:text-white text-xl"
                  aria-label="Instagram"
                >
                  📸
                </button>
                <button
                  type="button"
                  className="text-gray-300 hover:text-white text-xl"
                  aria-label="Twitter"
                >
                  🐦
                </button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <a href="/" className="hover:underline">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#menu-preview" className="hover:underline">
                    Menu
                  </a>
                </li>
                <li>
                  <a href="#why" className="hover:underline">
                    Why JavaBite
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:underline">
                    Services
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:underline">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-4">Visit Us</h4>
              <p className="text-sm text-gray-300">
                We’re located in the heart of the city with a warm, cozy space
                waiting for you.
              </p>
              <p className="text-sm text-gray-300 mt-3">
  <span className="font-semibold text-white">
    ⏰ Open Hours / Booking Slots
  </span>
  <br />
  Morning: 9:00 AM – 12:00 PM
  <br />
  Afternoon: 12:00 PM – 4:00 PM
  <br />
  Evening: 4:00 PM – 9:00 PM
</p>

            </div>
          </div>

          <div className="mt-10 border-t border-gray-700 pt-5 text-center text-gray-400 text-sm">
            © {new Date().getFullYear()} JavaBite. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}
