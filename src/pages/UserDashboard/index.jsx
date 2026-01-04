// src/pages/UserDashboard/index.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import IconSidebar from "../../components/Layout/IconSidebar";
import OverviewPanel from "./OverviewPanel";
import OrdersPage from "./OrdersPage";
import ProfilePage from "./ProfilePage";
import BookTablePage from "./BookTablePage";
import MyBookingsPage from "./MyBookingsPage";
import MenuPage from "./MenuPage";
import HistoryPage from "./HistoryPage";
import CartPage from "./CheckOut";


export default function UserDashboard({ showToast, addToCart ,cart,
  setCart }) {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true); // keeps initial glitch away
  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);

  // 🔹 Load user once from localStorage
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      setUser(u || null);
    } catch {
      setUser(null);
    } finally {
      setUserLoading(false);
    }
  }, []);

  // 🔹 Load bookings for current user
  const refreshBookings = useCallback(async () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      const id = u?.id ?? u?.ID;
      if (!id) {
        setBookings([]);
        if (typeof window !== "undefined") window.__debugBookings = [];
        return;
      }

      const res = await fetch(
        `http://localhost:8080/reservations/my?userId=${encodeURIComponent(id)}`
      );
      if (!res.ok) {
        console.warn("Failed to fetch bookings:", res.status);
        setBookings([]);
        if (typeof window !== "undefined") window.__debugBookings = [];
        return;
      }
      const data = await res.json();
      const safe = Array.isArray(data) ? data : [];
      setBookings(safe);

      // 🔍 expose for console debugging
      if (typeof window !== "undefined") {
        window.__debugBookings = safe;
      }
    } catch (err) {
      console.error("Error loading bookings:", err);
      setBookings([]);
      if (typeof window !== "undefined") window.__debugBookings = [];
    }
  }, []);

  // 🔹 Load orders for current user
  const refreshOrders = useCallback(async () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      const id = u?.id ?? u?.ID;
      if (!id) {
        setOrders([]);
        return;
      }

      const res = await fetch(
        `http://localhost:8080/orders/my?userId=${encodeURIComponent(id)}`
      );
      if (!res.ok) {
        console.warn("Failed to fetch orders:", res.status);
        setOrders([]);
        return;
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading orders:", err);
      setOrders([]);
    }
  }, []);

  // 🔹 After user is known → load bookings + orders
  useEffect(() => {
    if (user && (user.id || user.ID)) {
      refreshBookings();
      refreshOrders();
    }
  }, [user, refreshBookings, refreshOrders]);

  function countActiveUpcomingBookings(arr = []) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return arr.filter((b) => {
      const status = (b.status || "").toUpperCase();
      if (status === "CANCELLED") return false;
      const d = b.date ? new Date(b.date) : null;
      if (!d) return true;
      d.setHours(0, 0, 0, 0);
      return d >= today;
    }).length;
  }

  async function checkAvailability({ date, timeSlot, partySize } = {}) {
    if (!date || !timeSlot) {
      showToast?.("Please select date & time.", "error");
      return { ok: false, error: "missing_parameters" };
    }

    try {
      const url = `http://localhost:8080/reservations/availability?date=${encodeURIComponent(
        date
      )}&slot=${encodeURIComponent(timeSlot)}`;

      const res = await fetch(url, { method: "GET" });

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        const text = await res.text();
        console.error("Expected JSON, got HTML:", text.slice(0, 200));
        showToast?.("Server returned HTML. Wrong API URL.", "error");
        return { ok: false, error: "html_response" };
      }

      const data = await res.json();

      if (!res.ok) {
        showToast?.("Availability check failed.", "error");
        return { ok: false, error: data };
      }

      return { ok: true, data };
    } catch (err) {
      console.error("Availability error:", err);
      showToast?.("Network error while checking availability", "error");
      return { ok: false, error: err };
    }
  }

  // 🔹 Show loading screen instead of glitch while user is loading
  if (userLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB]">
      <IconSidebar />

      <div style={{ marginLeft: 256 }} className="pt-4 px-6 pb-10">
        <Routes>
          {/* overview */}
          <Route
            index
            element={
              <OverviewPanel
                profile={user}
                orders={orders}
                 bookingsCount={bookings.length}          // total
      
              />
            }
          />

          {/* history */}
          <Route
            path="history"
            element={<HistoryPage bookings={bookings} orders={orders} />}
          />

          {/* menu */}
          <Route
            path="menu"
            element={<MenuPage addToCart={addToCart} showToast={showToast} />}
          />

          {/* cart */}
<Route
  path="cart"
  element={
    <CartPage
      cart={cart}
      setCart={setCart}
      showToast={showToast}
    />
  }
/>


          {/* orders list */}
          <Route path="/orders" element={<OrdersPage />} />


          {/* bookings */}
          <Route
            path="bookings"
            element={
              <MyBookingsPage
                showToast={showToast}
                refreshBookings={refreshBookings}
              />
            }
          />

          {/* profile */}
          <Route path="profile" element={<ProfilePage user={user} />} />

          {/* book table */}
          <Route
            path="book"
            element={
              <BookTablePage
                showToast={showToast}
                onBooked={(booking) => {
                  console.log("Booked:", booking);
                  refreshBookings();
                }}
                checkAvailability={checkAvailability}
              />
            }
          />
        </Routes>
      </div>
    </div>
  );
}


















