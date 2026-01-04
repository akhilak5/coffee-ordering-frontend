// src/pages/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import BookingManagement from "./BookingManagement";
import { Link, useLocation } from "react-router-dom";

// ==== BASE STATS (fallback values if no real data yet) ====
const STATS = {
  totalRevenue: 45210,
  activeOrders: 24,
  todaysRevenue: 3820,
  customers: 0,
  chefs: 0,
  waiters: 0,
};

// Fallback activity if nothing loaded yet
const RECENT_ACTIVITY = [
  {
    id: 1,
    type: "ORDER",
    label: "New order ORD-002",
    time: "2 mins ago",
    meta: "₹240 • 2 items",
  },
  {
    id: 2,
    type: "BOOKING",
    label: "New booking confirmed",
    time: "10 mins ago",
    meta: "Evening slot • 4 guests",
  },
  {
    id: 3,
    type: "ORDER",
    label: "Order ORD-001 marked as completed",
    time: "30 mins ago",
    meta: "₹270",
  },
  {
    id: 4,
    type: "STAFF",
    label: "Waiter Anil logged in",
    time: "1 hour ago",
    meta: "Shift: Evening",
  },
];

// ===== Small helpers =====
function formatDateTime(value) {
  if (!value) return "—";
  try {
    let v = value;
    if (typeof v === "string") {
      const match = v.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      if (match) v = match[1];
    }
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}

function formatOrderCode(id) {
  if (id == null) return "—";
  const n = Number(id);
  if (!Number.isFinite(n)) return String(id);
  return `ORD-${String(n).padStart(3, "0")}`;
}

// ====== MAIN COMPONENT ======
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const [currentUser, setCurrentUser] = useState(null);
  // 🔥 Load logged-in admin from localStorage
useEffect(() => {
  try {
    const saved = localStorage.getItem("user");
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
    }
  } catch (err) {
    console.error("Failed to load admin user from localStorage:", err);
  }
}, []);


  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  const [stats, setStats] = useState(STATS);
  const [userMap, setUserMap] = useState({});
  const [staff, setStaff] = useState([]);
  
 
    const [chefWorkloads, setChefWorkloads] = useState([]);
    const [waiterWorkloads, setWaiterWorkloads] = useState([]);

  const location = useLocation();


  const {
    totalRevenue,
    activeOrders: staticActiveOrders,
    todaysRevenue,
    customers,
    chefs,
    waiters,
  } = stats;

    // ------------------ ORDERS loader / polling ------------------
  // loads orders and sets state (used throughout the dashboard)
  async function loadOrders() {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const res = await fetch("http://localhost:8080/orders/all");
      if (!res.ok) {
        // try alternate path if your backend differs
        console.warn("orders/all returned", res.status, "trying /orders");
        const r2 = await fetch("http://localhost:8080/orders");
        if (!r2.ok) {
          throw new Error("Failed to fetch orders");
        }
        const d2 = await r2.json();
        setOrders(Array.isArray(d2) ? d2 : []);
        return;
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setOrdersError("Failed to load orders");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  // load orders at mount and poll every 10s so workloads stay updated
  useEffect(() => {
    loadOrders();
    const iv = setInterval(loadOrders, 10000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


    // 🔁 Load CUSTOMERS and STAFF once (and start chef workload polling)
  useEffect(() => {
    // load users/customers
    async function loadUserCount() {
      try {
        const res = await fetch("http://localhost:8080/users/all");
        if (!res.ok) {
          console.error("Failed to load users/all:", res.status);
          return;
        }

        const data = await res.json();
        if (!Array.isArray(data)) return;

        let usersCount = 0;
        const map = {};

        data.forEach((u) => {
          if (!u || u.id == null) return;

          const roleRaw = u.role || "";
          const role = roleRaw.toUpperCase();

          const isChef = role.includes("CHEF");
          const isWaiter = role.includes("WAITER");
          const isAdmin = role.includes("ADMIN");
          const isUser = !isChef && !isWaiter && !isAdmin;

          if (isUser) usersCount++;

          map[u.id] = u;
        });

        setStats((prev) => ({
          ...prev,
          customers: usersCount,
        }));
        setUserMap(map);
      } catch (err) {
        console.error("Failed to load user count", err);
      }
    }

    // load staff (ACTIVE)
    async function loadStaffCount() {
      try {
        let res = await fetch("http://localhost:8080/staff");

        if (!res.ok) {
          console.warn(
            "Failed to load /staff (status:",
            res.status,
            ") – trying /staff/all"
          );
          res = await fetch("http://localhost:8080/staff/all");
        }

        if (!res.ok) {
          console.error(
            "Failed to load staff from /staff or /staff/all, status:",
            res.status
          );
          return;
        }

        const raw = await res.json();
        if (!Array.isArray(raw)) {
          console.error("Staff response is not an array:", raw);
          return;
        }

        const staffData = raw.filter(
          (s) => (s.status || "").toUpperCase() === "ACTIVE"
        );

        let chefsCount = 0;
        let waitersCount = 0;

        staffData.forEach((s) => {
          const rawRole = s.role || s.staffRole || "";
          const role = rawRole.toUpperCase();
          if (role === "CHEF") chefsCount++;
          if (role === "WAITER") waitersCount++;
        });

        setStats((prev) => ({
          ...prev,
          chefs: chefsCount,
          waiters: waitersCount,
        }));
        setStaff(staffData);
      } catch (err) {
        console.error("Failed to load staff", err);
      }
    }

    // start: load both once
    loadUserCount();
    loadStaffCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


    // ---------- helpers to make workload robust ----------
  // convert any id-like value to string for tolerant matching
  function idToKey(v) {
    if (v == null) return "";
    return String(v).trim();
  }

  function computeChefWorkloadsFromOrders(ordersList = []) {
  const inactive = new Set(["COMPLETED", "SERVED", "CANCELLED"]);

  const counts = {}; // chefId -> count

  ordersList.forEach((o) => {
    const status = String(o.status || "").toUpperCase();
    if (inactive.has(status)) return;

    // Chef accepted
    if (o.chefStaffId != null) {
      const key = String(o.chefStaffId).trim();
      counts[key] = (counts[key] || 0) + 1;
      return; // ← if chef accepted, DO NOT count assignedStaffId
    }

    // Admin-assigned CHEF
    if (
      o.assignedStaffId != null &&
      String(o.assignedStaffRole || "").toUpperCase() === "CHEF"
    ) {
      const key = String(o.assignedStaffId).trim();
      counts[key] = (counts[key] || 0) + 1;
    }
  });

  return Object.keys(counts).map((chefId) => ({
    chefId,
    activeOrders: counts[chefId],
  }));
}


  // given a staff object `s` and current chefWorkloads array, return number
  function getActiveOrdersForStaff(s, workloads = []) {
    const possibleStaffKeys = [
      idToKey(s.id),
      idToKey(s.userId),
      idToKey(s.staffId),
      idToKey(s.staff_id),
    ].filter(Boolean);

    // try workloads array first (from backend)
    for (const w of workloads || []) {
      const wid = idToKey(
        w.chefId ?? w.chef_id ?? w.id ?? w.staffId ?? w.staff_id
      );
      if (!wid) continue;
      if (possibleStaffKeys.includes(wid)) {
        return Number(w.activeOrders ?? w.active_orders ?? 0) || 0;
      }
    }

    // fallback: compute from frontend orders (will be used if API returned nothing)
    const fw = computeChefWorkloadsFromOrders(orders || []);
    for (const w of fw) {
      if (possibleStaffKeys.includes(idToKey(w.chefId))) return w.activeOrders || 0;
    }
    return 0;
  }
  // ---------- end helpers ----------


    // load chef workloads (so admin dropdown shows active orders count)


      // load chef workloads (so admin dropdown shows active orders count)
  useEffect(() => {
    async function loadChefWorkload() {
      try {
        const res = await fetch("http://localhost:8080/admin/chefs/workload");
        if (!res.ok) {
          console.warn("Failed to load chef workload:", res.status);
          // fallback to compute from orders
          const fallback = computeChefWorkloadsFromOrders(orders || []);
          setChefWorkloads(fallback);
          return;
        }
        const data = await res.json();

        // if backend returns empty array or objects without counts -> fallback
        const okShape =
          Array.isArray(data) &&
          data.length > 0 &&
          (data[0].hasOwnProperty("chefId") ||
            data[0].hasOwnProperty("chef_id") ||
            data[0].hasOwnProperty("id"));

        if (!okShape) {
          // fallback to computed if backend response not shaped as expected
          const fallback = computeChefWorkloadsFromOrders(orders || []);
          setChefWorkloads(fallback);
          return;
        }

        // otherwise use backend but normalize keys
        const normalized = (data || []).map((d) => ({
          chefId: idToKey(
            d.chefId ?? d.chef_id ?? d.id ?? d.staffId ?? d.staff_id
          ),
          activeOrders: Number(d.activeOrders ?? d.active_orders ?? 0) || 0,
        }));
        setChefWorkloads(normalized);
      } catch (err) {
        console.error("Failed to load chef workload", err);
        // fallback
        const fallback = computeChefWorkloadsFromOrders(orders || []);
        setChefWorkloads(fallback);
      }
    }

    loadChefWorkload();
    const iv = setInterval(loadChefWorkload, 15000);
    return () => clearInterval(iv);

    // we intentionally include `orders` so if orders update, fallback recomputes.
  }, [orders]);

  useEffect(() => {
  async function loadWaiterWorkload() {
    try {
      const res = await fetch("http://localhost:8080/admin/waiters/workload");
      if (!res.ok) return;

      const data = await res.json();
      if (Array.isArray(data)) {
        setWaiterWorkloads(data);
      }
    } catch (err) {
      console.error("Failed to load waiter workload", err);
    }
  }

  loadWaiterWorkload();
  const iv = setInterval(loadWaiterWorkload, 15000);
  return () => clearInterval(iv);
}, []);


      // restore admin helpers used by OrdersTab (called when rendering)
  // still keep function, but UI won't call it now
  async function updateOrderStatus(id, nextStatus) {
    try {
      await fetch(`http://localhost:8080/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      // reload orders after update
      await loadOrders();
    } catch (err) {
      console.error("Failed to update order status:", err);
      alert("Failed to update order status");
    }
  }

  // assign chef / waiter
  async function assignOrderStaff(orderId, staffUserId, staffRole) {
    try {
      await fetch(`http://localhost:8080/orders/${orderId}/assign-staff`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: staffUserId,
          staffRole: staffRole,
        }),
      });
      await loadOrders();
    } catch (err) {
      console.error("Failed to assign staff to order:", err);
      alert("Failed to assign staff to order");
    }
  }

  const computedActiveOrders =
    orders.length > 0
      ? orders.filter(
          (o) =>
            o.status !== "COMPLETED" &&
            o.status !== "CANCELLED" &&
            o.status !== "SERVED"
        ).length
      : staticActiveOrders;

  const recentOrders = orders.slice(0, 4);

 const totalRevenueFromOrders = orders.reduce((sum, o) => {
  const amt = Number(o.total ?? 0) || 0;
  return sum + amt;
}, 0);


  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysRevenueFromOrders = orders.reduce((sum, o) => {
  // accept multiple timestamp fields
  const rawDate =
    o.placedAt ??
    o.placed_at ??
    o.createdAt ??
    o.created_at ??
    o.order_time ??
    null;
  if (!rawDate) return sum;

  let v = rawDate;
  if (typeof v === "string") {
    const match = v.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    if (match) v = match[1];
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return sum;
  d.setHours(0, 0, 0, 0);

  if (d.getTime() !== today.getTime()) return sum;

  // numeric coercion
  const amt = Number(o.total ?? 0) || 0;
  return sum + amt;
}, 0);


  const displayTotalRevenue =
    orders.length > 0 ? totalRevenueFromOrders : totalRevenue;
  const displayTodaysRevenue =
    orders.length > 0 ? todaysRevenueFromOrders : todaysRevenue;

  return (
    <div className="min-h-screen pt-8 bg-gradient-to-b from-[#FFF5E1] via-[#FFF9F2] to-[#FFF]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col lg:flex-row gap-10">
        {/* LEFT SIDEBAR */}
        <aside className="w-full lg:w-72 bg-white rounded-3xl shadow-xl border border-amber-100 p-6 space-y-8">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full bg-amber-700 text-white">
              👑 ADMIN
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-3 tracking-tight">
              Dashboard
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Manage users, orders and statistics.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="stat-small bg-amber-50 text-amber-800">
              {customers}
              <span>Users</span>
            </div>
            <div className="stat-small bg-emerald-50 text-emerald-700">
              {chefs}
              <span>Chefs</span>
            </div>
            <div className="stat-small bg-blue-50 text-blue-700">
              {waiters}
              <span>Waiters</span>
            </div>
          </div>

          <div className="space-y-2">
            <button
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
                activeTab === "OVERVIEW"
                  ? "bg-amber-600 text:white font-semibold shadow-md text-white"
                  : "hover:bg-amber-50 text-gray-700"
              }`}
              onClick={() => setActiveTab("OVERVIEW")}
            >
              📊 Overview
            </button>

            <button
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
                activeTab === "BOOKINGS"
                  ? "bg-amber-600 text-white font-semibold shadow-md"
                  : "hover:bg-amber-50 text-gray-700"
              }`}
              onClick={() => setActiveTab("BOOKINGS")}
            >
              📅 Booking Management
            </button>

            <button
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
                activeTab === "ORDERS"
                  ? "bg-amber-600 text-white font-semibold shadow-md"
                  : "hover:bg-amber-50 text-gray-700"
              }`}
              onClick={() => setActiveTab("ORDERS")}
            >
              🧾 Order Management
            </button>

            <Link
              to="/admin/staff"
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
                location.pathname === "/admin/staff"
                  ? "bg-amber-600 text-white font-semibold shadow-md"
                  : "hover:bg-amber-50 text-gray-700"
              }`}
            >
              👨‍🍳 Staff
            </Link>

            <Link
              to="/admin/menu"
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
                location.pathname === "/admin/menu"
                  ? "bg-amber-600 text-white font-semibold shadow-md"
                  : "hover:bg-amber-50 text-gray-700"
              }`}
            >
              🍽️ Menu
            </Link>

            <Link
              to="/admin/reports"
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
                location.pathname === "/admin/reports"
                  ? "bg-amber-600 text-white font-semibold shadow-md"
                  : "hover:bg-amber-50 text-gray-700"
              }`}
            >
              📈 Reports
            </Link>
            <Link
  to="/admin/reviews"
  className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
    location.pathname === "/admin/reviews"
      ? "bg-amber-600 text-white font-semibold shadow-md"
      : "hover:bg-amber-50 text-gray-700"
  }`}
>
  ⭐ Reviews
</Link>


            

            <button
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
                activeTab === "PROFILE"
                  ? "bg-amber-600 text-white font-semibold shadow-md"
                  : "hover:bg-amber-50 text-gray-700"
              }`}
              onClick={() => setActiveTab("PROFILE")}
            >
              👤 Profile
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 space-y-8">
          {activeTab === "OVERVIEW" && (
            <OverviewTab
              totalRevenue={displayTotalRevenue}
              activeOrders={computedActiveOrders}
              todaysRevenue={displayTodaysRevenue}
              recentOrders={recentOrders}
              allOrders={orders}
            />
          )}

          {activeTab === "ORDERS" && (
            <OrdersTab
              orders={orders}
              loading={ordersLoading}
              error={ordersError}
              onStatusChange={updateOrderStatus}
              staff={staff}
              onAssignStaff={assignOrderStaff}
              chefWorkloads={chefWorkloads} 
               waiterWorkloads={waiterWorkloads} 
            />
          )}

          {activeTab === "BOOKINGS" && <BookingManagement />}
          {activeTab === "PROFILE" && <AdminProfileTab user={currentUser} />}
        </main>
      </div>

      <style>{`
        .stat-card {
          color: white;
          padding: 18px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        .stat-card span {
          font-size: 12px;
          opacity: 0.9;
        }
        .stat-card strong {
          font-size: 22px;
        }
        .stat-small {
          padding: 10px 0;
          border-radius: 10px;
          text-align: center;
          font-weight: bold;
          display: flex;
          flex-direction: column;
          font-size: 14px;
        }
        .stat-small span {
          font-size: 10px;
          opacity: 0.7;
        }
        .card-section {
          background: white;
          border-radius: 24px;
          border: 1px solid #f1e5d0;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .section-header h3 {
          font-size: 14px;
          font-weight: 700;
        }
        .section-header span {
          font-size: 10px;
          background: #FFF3D6;
          padding: 3px 8px;
          border-radius: 8px;
          color: #B65A00;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}

// ====== OVERVIEW TAB ======
function OverviewTab({
  totalRevenue,
  activeOrders,
  todaysRevenue,
  recentOrders,
  allOrders = [],
}) {
  const [recentBookings, setRecentBookings] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    async function loadRecentBookings() {
      try {
        const res = await fetch("http://localhost:8080/reservations/all");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const sorted = [...data].sort((a, b) => (b.id || 0) - (a.id || 0));
          setRecentBookings(sorted.slice(0, 5));
        }
      } catch (err) {
        console.error("Failed to load recent bookings", err);
      }
    }
    loadRecentBookings();
  }, []);

  const bookingActivity =
    recentBookings && recentBookings.length > 0
      ? recentBookings.map((b) => {
          const rawSlot = (b.slot || "").toLowerCase();
          const slotLabel =
            rawSlot === "morning"
              ? "Morning (9–12)"
              : rawSlot === "afternoon"
              ? "Afternoon (12–4)"
              : rawSlot === "evening"
              ? "Evening (4–9)"
              : b.slot || "—";

          return {
            id: `booking-${b.id}`,
            type: "BOOKING",
            label: b.userName
              ? `Booking by ${b.userName}`
              : `Booking #${b.id}`,
            meta: `${b.date || "No date"} • ${slotLabel} • ${
              b.guests != null ? b.guests : "-"
            } guests • ${b.status || "PENDING"}`,
            time: b.date || "",
          };
        })
      : [];

  const orderActivity =
  recentOrders && recentOrders.length > 0
    ? recentOrders.map((o) => {
        const timeVal =
          o.placedAt ??
          o.placed_at ??
          o.createdAt ??
          o.created_at ??
          o.order_time ??
          null;
        return {
          id: `order-${o.id}`,
          type: "ORDER",
          label: `Order ${o.orderCode || formatOrderCode(o.id)}`,
          meta: `₹${o.total} • Status: ${o.status} • ${o.customer || o.customerName || "—"}`,
          time: formatDateTime(timeVal),
        };
      })
    : [];


  let activityList = [...orderActivity, ...bookingActivity];
  if (activityList.length === 0) {
    activityList = RECENT_ACTIVITY;
  } else {
    activityList = activityList.slice(0, 6);
  }

  // === WEEKLY SALES DATA ===
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalsByDate = {};
  allOrders.forEach((o) => {
  // accept multiple timestamp fields from backend
  const rawDate =
    o.placedAt ??
    o.placed_at ??
    o.createdAt ??
    o.created_at ??
    o.order_time ??
    o.timestamp ??
    null;

  if (!rawDate) return;

  let v = rawDate;
  if (typeof v === "string") {
    // accept "YYYY-MM-DD" or full ISO "YYYY-MM-DDTHH:mm:ss"
    const match = v.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) v = match[1];
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return;
  d.setHours(0, 0, 0, 0);
  const key = d.toISOString().slice(0, 10);
  const amount = Number(o.total || 0);
  totalsByDate[key] = (totalsByDate[key] || 0) + amount;
});


  const weekDays = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - idx));
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
    return {
      key,
      label: weekday,
      revenue: totalsByDate[key] || 0,
    };
  });

  const maxRevenue = weekDays.reduce(
    (max, d) => (d.revenue > max ? d.revenue : max),
    0
  );
  const hasSales = maxRevenue > 0;

  const graphTop = 5;
  const graphBottom = 38;
  const viewHeight = 50;
  const graphLeft = 8;
  const graphRight = 92;

  const points = weekDays.map((d, idx) => {
    const x =
      weekDays.length === 1
        ? 50
        : graphLeft +
          (idx / (weekDays.length - 1)) * (graphRight - graphLeft);

    const normalized = maxRevenue ? d.revenue / maxRevenue : 0;
    const y = graphBottom - normalized * (graphBottom - graphTop);

    return { ...d, x, y };
  });

  const pathD =
    points.length > 0
      ? points
          .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x},${p.y}`)
          .join(" ")
      : "";

  const selectedText = selectedDay
    ? `${selectedDay.label} • Total revenue: ₹${selectedDay.revenue}`
    : "Click a point on the line to see total revenue for that day.";

  const yTicks = maxRevenue
    ? Array.from({ length: 5 }, (_, i) =>
        Math.round((maxRevenue / 4) * i)
      )
    : [0];

  return (
    <>
      {/* TOP CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="stat-card bg-emerald-600">
          <span>Total Revenue</span>
          <strong>₹{totalRevenue.toLocaleString()}</strong>
        </div>

        <div className="stat-card bg-amber-500">
          <span>Active Orders</span>
          <strong>{activeOrders}</strong>
        </div>

        <div className="stat-card bg-blue-500">
          <span>Today's Revenue</span>
          <strong>₹{todaysRevenue.toLocaleString()}</strong>
        </div>
      </div>

      {/* WEEKLY SALES */}
      <section className="card-section">
        <header className="section-header">
          <h3>Weekly Sales</h3>
          <span>
            {hasSales
              ? "Last 7 days • based on orders"
              : "No real sales yet • flat line"}
          </span>
        </header>

        <div className="mt-1">
          <div className="flex gap-3 items-stretch">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between text-[11px] text-gray-400 py-1">
              {yTicks
                .slice()
                .reverse()
                .map((v) => (
                  <span key={v}>₹{v}</span>
                ))}
            </div>

            {/* Chart box */}
            <div className="relative flex-1 h-40 md:h-48 border border-gray-200 rounded-2xl bg-white overflow-hidden">
              <svg
                viewBox={`0 0 100 ${viewHeight}`}
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                {/* grid lines */}
                {maxRevenue &&
                  yTicks
                    .filter((v) => v > 0)
                    .map((v) => {
                      const norm = v / maxRevenue;
                      const y =
                        graphBottom -
                        norm * (graphBottom - graphTop);
                      return (
                        <line
                          key={v}
                          x1="0"
                          y1={y}
                          x2="100"
                          y2={y}
                          className="stroke-gray-100"
                          strokeWidth="0.4"
                        />
                      );
                    })}

                <line
                  x1="0"
                  y1={graphBottom}
                  x2="100"
                  y2={graphBottom}
                  className="stroke-gray-200"
                  strokeWidth="0.6"
                />

                {hasSales && points.length > 1 && (
                  <path
                    d={
                      pathD +
                      ` L ${graphRight} ${graphBottom} L ${graphLeft} ${graphBottom} Z`
                    }
                    className="fill-emerald-100"
                    opacity="0.35"
                  />
                )}

                {points.length > 1 && (
                  <path
                    d={pathD}
                    fill="none"
                    className="stroke-emerald-500"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {points.map((p) => (
                  <circle
                    key={p.key}
                    cx={p.x}
                    cy={p.y}
                    r="1.7"
                    className="fill-emerald-500 cursor-pointer"
                    onClick={() =>
                      setSelectedDay({
                        label: p.label,
                        revenue: p.revenue,
                      })
                    }
                  />
                ))}
              </svg>

              {/* X-axis day labels */}
              <div className="absolute inset-0 pointer-events-none">
                {points.map((p) => (
                  <div
                    key={p.key}
                    className="absolute text-[11px] text-gray-500"
                    style={{
                      left: `${p.x}%`,
                      bottom: 4,
                      transform: "translateX(-50%)",
                    }}
                  >
                    {p.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-center text-gray-500">
            {selectedText}
          </p>
        </div>
      </section>

      {/* ORDER STATUS BREAKDOWN */}
      {(() => {
        const statusCounts = { COMPLETED: 0, IN_PROGRESS: 0, PENDING: 0 };

        allOrders.forEach((o) => {
          const raw = (o.status || "").toUpperCase();
          const s = raw === "SERVED" ? "COMPLETED" : raw;

          if (statusCounts[s] !== undefined) {
            statusCounts[s] += 1;
          }
        });

        const totalOrders =
          statusCounts.COMPLETED +
          statusCounts.IN_PROGRESS +
          statusCounts.PENDING;

        const breakdownRows = [
          { key: "COMPLETED", label: "Ready / Served", color: "bg-emerald-500" },
          { key: "IN_PROGRESS", label: "In Progress", color: "bg-amber-500" },
          { key: "PENDING", label: "Pending", color: "bg-slate-400" },
        ].map((row) => {
          const count = statusCounts[row.key] || 0;
          const pct = totalOrders
            ? Math.round((count / totalOrders) * 100)
            : 0;
          return { ...row, count, pct };
        });

        return (
          <section className="card-section">
            <header className="section-header">
              <h3>Order Status Breakdown</h3>
              <span>Based on {totalOrders} orders</span>
            </header>

            <div className="flex flex-col gap-3">
              {breakdownRows.map((o) => (
                <div key={o.key} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${o.color}`}></div>
                  <span className="text-sm text-gray-700 w-28">
                    {o.label}
                  </span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`${o.color} h-2 rounded-full`}
                      style={{ width: `${o.pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-800">
                    {o.pct}% ({o.count})
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* RECENT ACTIVITY */}
      <section className="card-section">
        <header className="section-header">
          <h3>Recent Activity</h3>
          <span>Latest orders & bookings</span>
        </header>

        {activityList.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">
            No recent activity yet.
          </div>
        ) : (
          <div className="space-y-3">
            {activityList.map((a) => {
              const typeColor =
                a.type === "ORDER"
                  ? "bg-blue-50 text-blue-700 border-blue-100"
                  : a.type === "BOOKING"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-amber-50 text-amber-700 border-amber-100";

              const typeLabel =
                a.type === "ORDER"
                  ? "Order"
                  : a.type === "BOOKING"
                  ? "Booking"
                  : "Staff";

              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 px-3 py-2 rounded-xl bg-gray-50/60 border border-gray-100 hover:bg-gray-50 transition"
                >
                  <span
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${typeColor}`}
                  >
                    {typeLabel}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {a.label}
                    </div>
                    {a.meta && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {a.meta}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 whitespace-nowrap">
                    {a.time}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

// ====== ADMIN PROFILE TAB ======
function AdminProfileTab({ user }) {
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);

  if (!user) {
    return (
      <section className="card-section">
        <header className="section-header">
          <h3>Profile</h3>
          <span>Admin account</span>
        </header>
        <div className="text-sm text-gray-500">
          User info not available. Please login again.
        </div>
      </section>
    );
  }

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "A";

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwdMsg(null);

    if (!pwd.current || !pwd.next || !pwd.confirm) {
      setPwdMsg({ type: "error", text: "Please fill all fields." });
      return;
    }
    if (pwd.next.length < 6) {
      setPwdMsg({
        type: "error",
        text: "Password must be at least 6 characters.",
      });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch("http://localhost:8080/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          oldPassword: pwd.current,
          newPassword: pwd.next,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setPwdMsg({ type: "error", text: data.error });
      } else {
        setPwdMsg({
          type: "success",
          text: "Password updated successfully!",
        });
        setPwd({ current: "", next: "", confirm: "" });
      }
    } catch (err) {
      console.error("Admin change password error:", err);
      setPwdMsg({
        type: "error",
        text: "Error changing password, please try again.",
      });
    } finally {
      setPwdLoading(false);
    }
  }

  return (
    <section className="card-section">
      <header className="section-header">
        <h3>Profile</h3>
        <span>Admin account</span>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: avatar + basic info */}
        <div className="md:w-1/3 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-2xl font-bold text-amber-700 shadow-inner">
            {initial}
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {user.name}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-100">
                Admin
              </span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center max-w-[220px]">
            Manage your account details and password here.
          </div>
        </div>

        {/* Right: info + change password button */}
        <div className="md:flex-1 space-y-4">
          {/* Info fields (input-like) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Full Name" value={user.name} />
            <InfoField label="Email" value={user.email} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Role" value="Admin" />
          </div>

          {/* Change password trigger */}
          <div className="pt-2 flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => {
                setPwdMsg(null);
                setShowPwdModal(true);
              }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800 transition"
            >
              Change Password
            </button>
            <span className="text-[11px] text-gray-500">
              If you forget your password, use <b>Forgot Password</b> on the
              login page.
            </span>
          </div>
        </div>
      </div>

      {/* Password Modal (like Chef) */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-bold text-amber-900">
                Change Password
              </h4>
              <button
                type="button"
                onClick={() => setShowPwdModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              Enter your current password and a new password.
            </p>

            {pwdMsg && (
              <div
                className={`mb-3 px-3 py-2 rounded-md text-xs font-medium ${
                  pwdMsg.type === "error"
                    ? "bg-red-100 text-red-600"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {pwdMsg.text}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  value={pwd.current}
                  onChange={(e) =>
                    setPwd({ ...pwd, current: e.target.value })
                  }
                  className="mt-1 px-3 py-2 rounded-xl w-full text-sm bg-white border border-amber-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-700">New Password</label>
                <input
                  type="password"
                  value={pwd.next}
                  onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                  className="mt-1 px-3 py-2 rounded-xl w-full text-sm bg-white border border-amber-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={pwd.confirm}
                  onChange={(e) =>
                    setPwd({ ...pwd, confirm: e.target.value })
                  }
                  className="mt-1 px-3 py-2 rounded-xl w-full text-sm bg-white border border-amber-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPwdModal(false)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium text-amber-700 bg-white hover:bg-amber-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2 rounded-lg text-sm bg-amber-700 text-white font-semibold hover:bg-amber-800 transition disabled:opacity-50"
                >
                  {pwdLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
// small reusable "input-like" field (for Admin profile)
function InfoField({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="w-full border rounded-xl px-3 py-2 text-sm bg-gray-50 text-gray-800 flex items-center justify-between">
        <span className="truncate">{value || "—"}</span>
      </div>
    </div>
  );
}

// ====== ORDERS TAB ======
function OrdersTab({
  orders,
  loading,
  error,
  onStatusChange, // not used now, status is read-only
  staff,
  onAssignStaff,
  chefWorkloads = [],
    waiterWorkloads = [], 
}) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  


  const filtered = orders.filter((o) => {
    const s = (o.status || "").toUpperCase();
    const matchesStatus =
      statusFilter === "ALL" ? true : s === statusFilter;

    const searchText = search.trim().toLowerCase();
    const matchesSearch =
      !searchText ||
      (o.orderCode || "").toLowerCase().includes(searchText) ||
      o.id.toString().includes(searchText) ||
      (o.customer || "").toLowerCase().includes(searchText);

    return matchesStatus && matchesSearch;
  });

  function badgeClasses(status) {
    const s = (status || "").toUpperCase();
    if (s === "COMPLETED")
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (s === "IN_PROGRESS")
      return "bg-amber-100 text-amber-700 border-amber-200";
    if (s === "PENDING")
      return "bg-slate-100 text-slate-700 border-slate-200";
    if (s === "SERVED")
      return "bg-green-200 text-green-800 border-green-300";
    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  function displayStatusLabel(status) {
    const s = (status || "").toUpperCase();
    if (s === "PENDING") return "Pending";
    if (s === "IN_PROGRESS") return "In progress";
    if (s === "COMPLETED") return "Ready to serve";
    if (s === "SERVED") return "Completed ✓";
    return s.replace("_", " ");
  }

  const staffOptions = staff || [];
  const chefs = staffOptions.filter(
    (s) => (s.role || "").toUpperCase() === "CHEF"
  );
  const waiters = staffOptions.filter(
    (s) => (s.role || "").toUpperCase() === "WAITER"
  );

  if (loading) {
    return (
      <section className="card-section">
        <div className="text-sm text-gray-500 py-4">
          Loading orders...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card-section">
        <div className="text-sm text-red-600 py-4">{error}</div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
          

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-900">
            Order Management
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Track all live orders, see status, assign staff, and monitor
            totals. Status is controlled by Chef &amp; Waiter.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg text-sm px-3 py-2 bg-white"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Ready to serve</option>
            <option value="SERVED">Completed ✓</option>
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order / customer"
            className="border rounded-lg text-sm px-3 py-2 bg-white min-w-[220px]"
          />
        </div>
      </div>

      <section className="card-section">
        {filtered.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">
            No orders match your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="hidden md:grid grid-cols-7 gap-4 px-4 py-2 text-[11px] font-semibold text-gray-500 border-b bg-gray-50">
              <div>Order ID</div>
              <div>Customer</div>
              <div>Items</div>
              <div>Total</div>
              <div>Status</div>
              <div>Assigned Staff</div>
              <div className="text-right">Placed At</div>
            </div>

            <div className="divide-y">
              {filtered.map((o) => {
                const statusUpper = (o.status || "").toUpperCase();
               const canAssignChef = statusUpper === "PENDING";
const canAssignWaiter = statusUpper === "COMPLETED";



                const isPending = statusUpper === "PENDING";
                const isCompletedOrServed =
                  statusUpper === "COMPLETED" || statusUpper === "SERVED";

                const hasChefAssigned = o.chefStaffId != null;
                const hasWaiterAssigned = o.waiterStaffId != null;

                const assignedChef = hasChefAssigned
                  ? staffOptions.find(
                      (s) =>
                        String(s.id) === String(o.chefStaffId) ||
                        String(s.userId) === String(o.chefStaffId)
                    )
                  : null;

                const assignedWaiter = hasWaiterAssigned
                  ? staffOptions.find(
                      (s) =>
                        String(s.id) === String(o.waiterStaffId) ||
                        String(s.userId) === String(o.waiterStaffId)
                    )
                  : null;

                

                return (
                  <div
                    key={o.id}
                    className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-4 px-4 py-3 items-start hover:bg-gray-50 transition"
                  >
                    {/* Order ID */}
                    <div className="text-sm font-semibold text-gray-900">
                      {o.orderCode || formatOrderCode(o.id)}
                    </div>

                    {/* Customer */}
                    <div className="text-sm text-gray-800">
                      {o.customer || o.customerName || "—"}

                    </div>

                    {/* Items */}
                    <div className="text-xs text-gray-700">
                      {o.items && o.items.length > 0 ? (
                        <ul className="space-y-0.5">
                          {o.items.map((it, idx) => (
                            <li key={idx} className="truncate">
                              {(it.qty ?? it.quantity ?? 1) + " × " + it.name}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>

                    {/* Total */}
                    <div className="text-sm font-semibold text-gray-900">
                      ₹{o.total}
                    </div>

                    {/* Status – READ-ONLY now */}
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-semibold ${badgeClasses(
                          o.status
                        )}`}
                      >
                        ● {displayStatusLabel(o.status)}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Updated automatically by Chef / Waiter.
                      </span>
                    </div>

                    {/* Assigned Staff */}
                    <div className="flex flex-col gap-1">
                      {/* ✅ CHEF */}
                     {assignedChef && (
  <span className="text-[11px] font-medium text-gray-700">
    Chef: {assignedChef.name}
  </span>
)}


                      {/* ✅ WAITER */}
                      {assignedWaiter && (
  <span className="text-[11px] font-medium text-gray-700">
    Waiter: {assignedWaiter.name}
  </span>
)}


                      {/* 🔹 Chef dropdown: only when order is PENDING and no chef yet */}
                      {canAssignChef &&
  !hasChefAssigned &&
  chefs.length > 0 && (



                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 w-12">
                              Chef
                            </span>
                            <select
                              className="text-[11px] border border-gray-300 rounded-full px-2 py-1 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                              defaultValue=""
                              onChange={(e) => {
                                const value = e.target.value;
                                if (!value) return;
                                const staffId = Number(value);
                                onAssignStaff(o.id, staffId, "CHEF");
                                e.target.value = "";
                              }}
                            >
                              <option value="">Select</option>
                             {chefs.map((c) => {
  // compute active orders for this chef from chefWorkloads prop first
  const possibleKeys = [
    String(c.id ?? ""),
    String(c.userId ?? ""),
    String(c.staffId ?? ""),
    String(c.staff_id ?? ""),
  ].filter(Boolean);

  // look in chefWorkloads (API-normalized items)
  let active = 0;
  if (Array.isArray(chefWorkloads) && chefWorkloads.length > 0) {
    for (const w of chefWorkloads) {
      const wid = String(w.chefId ?? w.chef_id ?? w.id ?? w.staffId ?? w.staff_id ?? "");
      if (!wid) continue;
      if (possibleKeys.includes(wid)) {
        active = Number(w.activeOrders ?? w.active_orders ?? 0) || 0;
        break;
      }
    }
  }

  // fallback: compute from orders prop (count non-completed orders assigned to this chef)
  if (!active && Array.isArray(orders) && orders.length > 0) {
    const inactive = new Set(["COMPLETED", "SERVED", "CANCELLED"]);
    active = orders.reduce((acc, o) => {
      const raw = (o.status || "").toUpperCase();
      const status = raw === "SERVED" ? "COMPLETED" : raw;
      if (inactive.has(status)) return acc;
      const possibleChefIds = [
        String(o.chefStaffId ?? ""),
        String(o.assignedStaffId ?? ""),
        String(o.chef_id ?? ""),
        String(o.chefId ?? ""),
        String(o.assigned_staff_id ?? ""),
      ].filter(Boolean);
      if (possibleChefIds.some((id) => possibleKeys.includes(id))) return acc + 1;
      return acc;
    }, 0);
  }

  const label = `${c.name} (${active})`;
  const optionValue = c.id ?? c.userId ?? c.staffId ?? c.staff_id ?? "";

  return (
    <option key={optionValue || `${c.name}-${Math.random()}`} value={optionValue}>
      {label}
    </option>
  );
})}





                            </select>
                          </div>
                        </div>
                      )}

                      {/* 🔹 Waiter dropdown */}
                     {canAssignWaiter &&
  !hasWaiterAssigned &&
  waiters.length > 0 && (


                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-500 w-12">
                                Waiter
                              </span>
                              <select
                                className="text-[11px] border border-gray-300 rounded-full px-2 py-1 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                                defaultValue=""
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (!value) return;
                                  const staffId = Number(value);
                                  onAssignStaff(o.id, staffId, "WAITER");
                                  e.target.value = "";
                                }}
                              >
                                <option value="">Select</option>
                                {waiters.map((w) => {
  let active = 0;

  if (Array.isArray(waiterWorkloads)) {
    const match = waiterWorkloads.find(
      (x) => String(x.waiterId) === String(w.id)
    );
    if (match) active = match.activeOrders || 0;
  }

  return (
    <option key={w.id} value={w.id}>
      {w.name} ({active})
    </option>
  );
})}

                              </select>
                            </div>
                          </div>
                        )}

                      {/* Helper text when truly no staff */}
                      {!hasWaiterAssigned && !hasChefAssigned && !isPending && (
                        <span className="text-[11px] text-gray-400">
                          No staff assigned
                        </span>
                      )}
                    </div>

                    {/* Placed At */}
                    <div className="text-xs text-gray-500 text-right">
                      {formatDateTime(o.placedAt || o.createdAt)}

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
