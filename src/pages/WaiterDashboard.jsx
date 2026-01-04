// src/pages/WaiterDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------- helpers ----------
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

// simple fake ETA based on number of items (optional, shown in cards)
function calcEtaMinutes(order) {
  const items = order.items || [];
  const base = 5;
  const perItem = 2;
  return base + items.length * perItem;
}

function badgeClasses(status) {
  const s = (status || "").toUpperCase();
  if (s === "PENDING")
    return "bg-amber-50 text-amber-700 border-amber-200";
  if (s === "IN_PROGRESS")
    return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "COMPLETED")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "SERVED")
    return "bg-green-200 text-green-800 border-green-300";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function prettyStatus(status) {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "Pending (Kitchen)";
  if (s === "IN_PROGRESS") return "In Kitchen";
  if (s === "COMPLETED") return "Ready to Serve";
  if (s === "SERVED") return "Completed ✓";
  return s.replace("_", " ");
}

// ---------- shared small components ----------
function SidebarButton({ label, icon, active, onClick, pulse }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
        active
          ? "bg-emerald-600 text-white font-semibold shadow-md"
          : "hover:bg-emerald-50 text-gray-700"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>

      {pulse && (
        <span className="ml-auto relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
      )}
    </button>
  );
}

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

// card used in multiple tabs (for waiter)
function OrderCard({ order, showEta = true, onServe, onAccept }) {
  const s = (order.status || "").toUpperCase();
  const eta = showEta ? calcEtaMinutes(order) : null;
  const noWaiterAssigned =
    order.waiterStaffId == null || order.waiterStaffId === undefined;

  return (
    <div className="rounded-2xl border border-amber-100 bg-white shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            Order
          </div>
          <div className="text-sm font-bold text-gray-900">
            {formatOrderCode(order.id)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {order.customerName || order.customer || "Customer"}
          </div>
          {order.tableNumber != null && (
  <div className="mt-0.5 text-[11px] font-semibold text-indigo-600">
    Table #{order.tableNumber}
  </div>

  

)}
{order.paymentStatus && (
  <div className="mt-1 text-[11px] font-semibold text-green-700">
    Payment: {order.paymentMethod} ({order.paymentStatus})
  </div>
)}


        </div>

        <span
          className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-semibold ${badgeClasses(
            s
          )}`}
        >
          ● {prettyStatus(s)}
        </span>
      </div>

      <div className="mt-1 text-xs text-gray-600 space-y-0.5">
        {(order.items || []).map((it, idx) => (
          <div key={idx}>
            {(it.qty ?? it.quantity ?? 1) + " × " + it.name}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2 text-xs">
        <div className="font-semibold text-gray-900">
          ₹{order.total != null ? order.total : 0}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          {eta && (
            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
              ETA ~ {eta} min
            </span>
          )}
          <span>{formatDateTime(order.createdAt || order.placedAt)}</span>
        </div>
      </div>

      {/* actions */}
      <div className="flex gap-2 mt-3">
        {/* Accept button – only for COMPLETED & unassigned orders when handler is passed */}
        {s === "COMPLETED" && onAccept && noWaiterAssigned && (
          <button
            className="text-[11px] px-3 py-1.5 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700"
            onClick={() => onAccept(order.id)}
          >
            Accept Order
          </button>
        )}
   

{/* ✅ PAYMENT BUTTONS (ONLY WHEN SERVED & NOT PAID) */}
{order.status === "SERVED" && order.paymentStatus !== "PAID" && (
  <div className="flex gap-2 mt-2 flex-wrap">

    {/* CASE 1: COD → show ONLY CASH */}
    {order.paymentMethod === "COD" && (
      <button
        className="text-[10px] px-3 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
        onClick={() =>
          fetch(`http://localhost:8080/orders/${order.id}/payment`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentMethod: "CASH" }),
          }).then(() => window.location.reload())
        }
      >
        Mark Paid (CASH)
      </button>
    )}

    {/* CASE 2: ONLINE → show info only (no buttons) */}
    {order.paymentMethod !== "COD" && (
      <span className="text-[11px] font-semibold text-green-700">
        Paid via {order.paymentMethod}
      </span>
    )}

  </div>
)}




        {/* Mark Served – for COMPLETED orders when handler is passed */}
        {s === "COMPLETED" && onServe && (
          <button
            className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            onClick={() => onServe(order.id)}
          >
            Mark as Served
          </button>
        )}
      </div>
    </div>
  );
}

// ========== MAIN PAGE ==========
export default function WaiterDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const [allOrders, setAllOrders] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false);
  const [seenAlertIds, setSeenAlertIds] = useState(() => {
    try {
      const raw = localStorage.getItem("waiter_seen_alert_ids");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // ✅ NEW: remember which COMPLETED-ready orders were already seen in Ready tab
  const [seenReadyIds, setSeenReadyIds] = useState(() => {
    try {
      const raw = localStorage.getItem("waiter_seen_ready_ids");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "waiter_seen_alert_ids",
      JSON.stringify(seenAlertIds)
    );
  }, [seenAlertIds]);

  // ✅ NEW: persist seen ready orders
  useEffect(() => {
    localStorage.setItem(
      "waiter_seen_ready_ids",
      JSON.stringify(seenReadyIds)
    );
  }, [seenReadyIds]);

  // basic guard – only WAITER allowed here
  useEffect(() => {
    if (!userId || (user.role || "").toUpperCase() !== "WAITER") {
      navigate("/login");
    }
  }, [userId, user, navigate]);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("http://localhost:8080/orders/all");
      if (!res.ok) throw new Error("Failed to load orders");

      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];

      setAllOrders(arr);
    } catch (err) {
      console.error("WaiterDashboard: failed to load orders", err);
      setError("Failed to load orders");
      setAllOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadStaff() {
    try {
      const res = await fetch("http://localhost:8080/staff");
      if (!res.ok) {
        console.error("WaiterDashboard: failed to load staff", res.status);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setStaffList(data);
      }
    } catch (err) {
      console.error("WaiterDashboard: error loading staff", err);
    }
  }

  useEffect(() => {
    if (userId) {
      loadOrders();
      loadStaff();
    }
  }, [userId]);

  async function updateStatus(id, nextStatus) {
    try {
      await fetch(`http://localhost:8080/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadOrders();
    } catch (err) {
      console.error("Failed to update order status", err);
      alert("Failed to update order status");
    }
  }

  // waiter marks order as SERVED
  async function markServed(orderId) {
    try {
      if (!myStaff || myStaff.id == null) {
        alert(
          "Waiter staff record not found. Please ask admin to add you in Staff."
        );
        return;
      }

      // Ensure this waiter is assigned (idempotent if already assigned)
      await fetch(`http://localhost:8080/orders/${orderId}/assign-staff`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: myStaff.id,
          staffRole: "WAITER",
        }),
      });

      // Now mark as SERVED
      await updateStatus(orderId, "SERVED");
    } catch (err) {
      console.error("Failed to mark order as served", err);
      alert("Failed to mark order as served");
    }
  }

  // NEW: waiter accepts a ready order → assigns to self but keeps status COMPLETED
  async function acceptReadyOrder(orderId) {
    try {
      if (!myStaff || myStaff.id == null) {
        alert(
          "Waiter staff record not found. Please ask admin to add you in Staff."
        );
        return;
      }

      await fetch(`http://localhost:8080/orders/${orderId}/assign-staff`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: myStaff.id,
          staffRole: "WAITER",
           acceptedAt: new Date().toISOString(),
        }),
      });

      // just reload; status stays COMPLETED
      await loadOrders();
    } catch (err) {
      console.error("Failed to accept order", err);
      alert("Failed to accept order");
    }
  }

  // ---------- derived lists (SHARED POOL for COMPLETED) ----------
  const {
  myAssigned,
  readyToServe,
  servedToday,
  history,
  activity,
  myStaff,
} = useMemo(() => {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);

  const myEmail = (user?.email || "").toLowerCase();
  const foundStaff = staffList.find((s) => {
    const sEmail = (s.email || "").toLowerCase();
    const sRole = (s.role || "").toUpperCase();
    const sStatus = (s.status || "").toUpperCase();
    return (
      sEmail === myEmail &&
      sRole === "WAITER" &&
      (sStatus === "ACTIVE" || sStatus === "INVITED")
    );
  });

  const myStaff = foundStaff || null;
  const myStaffIds = [];
  if (foundStaff && foundStaff.id != null) myStaffIds.push(Number(foundStaff.id));
  if (foundStaff && foundStaff.userId != null) myStaffIds.push(Number(foundStaff.userId));

  const assigned = [];        // all orders assigned to this waiter (any status)
  const sharedReadyList = []; // unassigned COMPLETED → shared pool
  const historyList = [];     // served (SERVED) orders for this waiter
  const activityList = [];

  for (const o of allOrders) {
    // 🚫 hide invalid orders (no booking)
if (o.tableNumber == null) continue;

    const status = (o.status || "").toUpperCase();
    const created = o.createdAt || o.placedAt;
    let createdDate = null;
    if (created) {
      const d = new Date(created);
      if (!Number.isNaN(d.getTime())) createdDate = d;
    }

    const hasWaiterAssigned = o.waiterStaffId != null;

    // SHARED POOL: COMPLETED & NO WAITER ASSIGNED
    if (status === "COMPLETED" && !hasWaiterAssigned) {
      sharedReadyList.push(o);
      activityList.push({
        id: `act-${o.id}-ready`,
        type: "READY",
        label: `Order ${formatOrderCode(o.id)} is ready to serve`,
        meta: o.items?.[0]?.name ? `(${o.items[0].name})` : "",
        time: "Just now",
        read: false,
        timestamp: createdDate ? createdDate.getTime() : Date.now(),
      });
    }

    // assigned to this waiter?
    const assignedToMe =
      myStaffIds.length > 0 &&
      o.waiterStaffId != null &&
      myStaffIds.includes(Number(o.waiterStaffId));

    if (assignedToMe) {
      // keep the assigned record (all statuses) — we'll filter for active/history later
      assigned.push(o);

      // only create ALERTs for admin-assigned (pending/in-progress) — keep existing behavior
      if (status === "PENDING" || status === "IN_PROGRESS") {
        activityList.push({
          id: `act-${o.id}-assigned`,
          type: "ALERT",
          label: `Order ${formatOrderCode(o.id)} assigned to you`,
          meta: o.items?.[0]?.name ? `(${o.items[0].name})` : "",
          time: "Assigned",
          read: false,
          timestamp: createdDate ? createdDate.getTime() : Date.now(),
        });
      }

      // When waiter has SERVED the order, send it to historyList (final)
      if (status === "SERVED") {
        historyList.push(o);
        activityList.push({
          id: `act-${o.id}-served`,
          type: "ORDER",
          label: `Served ${formatOrderCode(o.id)}`,
          meta: o.items?.[0]?.name ? `(${o.items[0].name})` : "",
          time: "Recently",
          read: false,
          timestamp: createdDate ? createdDate.getTime() : Date.now(),
        });

        // count for served today
        if (createdDate) {
          const key = createdDate.toISOString().slice(0, 10);
          if (key === todayKey) {
            // we'll compute servedToday from historyList below
          }
        }
      }
    }
  }

  // Derive the final lists the UI uses:
  // myAssigned = assigned orders assigned to this waiter that are NOT yet SERVED (active queue)
  const myAssignedFiltered = assigned.filter((o) => (o.status || "").toUpperCase() !== "SERVED");

  // readyToServe = server-completed orders which are NOT yet assigned (shared pool)
  const readyToServeFinal = sharedReadyList;

  // servedToday = served orders that have today's date (derived from historyList)
  const servedTodayFinal = historyList.filter((o) => {
    const created = o.createdAt || o.placedAt || o.servedAt || o.updatedAt;
    if (!created) return false;
    const d = new Date(created);
    if (Number.isNaN(d.getTime())) return false;
    return d.toISOString().slice(0, 10) === todayKey;
  });

  // history (all served orders assigned to this waiter)
  const historyFinal = historyList;

  return {
    myAssigned: myAssignedFiltered,
    readyToServe: readyToServeFinal,
    servedToday: servedTodayFinal,
    history: historyFinal,
    activity: activityList,
    myStaff,
  };
}, [allOrders, staffList, user]);


  // alerts that have NOT been seen yet by this waiter
  const unreadNotifications = useMemo(
    () =>
      activity.filter(
        (a) => a.type === "ALERT" && !seenAlertIds.includes(a.id)
      ),
    [activity, seenAlertIds]
  );

  useEffect(() => {
    setHasUnreadAlerts(
      unreadNotifications.length > 0 && activeTab !== "NOTIFICATIONS"
    );
  }, [unreadNotifications, activeTab]);

  const summaryText = useMemo(() => {
    const pendingCount = readyToServe.length; // not accepted yet
    // Active orders = orders assigned TO THIS WAITER that are not yet served
// (we consider PENDING / IN_PROGRESS / COMPLETED as "active" until waiter marks SERVED)
const activeCount = myAssigned.filter((o) => {
  const s = (o.status || "").toUpperCase();
  return s !== "SERVED"; // exclude already served orders
}).length;
 // accepted but not served
    const servedTodayCount = servedToday.length; // already served
    const totalServedAll = history.length;

    return {
      pendingCount,
      activeCount,
      servedTodayCount,
      totalServedAll,
    };
  }, [readyToServe, myAssigned, servedToday, history]);

  // ✅ there is at least one COMPLETED-ready order this waiter hasn't seen yet
  const hasUnseenReady = useMemo(
    () =>
      readyToServe.some(
        (o) => o.id != null && !seenReadyIds.includes(o.id)
      ),
    [readyToServe, seenReadyIds]
  );

  const isLoading = loading;
  const hasError = !!error;

  return (
    <div className="min-h-screen pt-8 bg-gradient-to-b from-[#FFF5E1] via-[#FFF9F2] to-[#FFF]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col lg:flex-row gap-10">
        {/* LEFT SIDEBAR */}
        <aside className="w-full lg:w-72 bg-white rounded-3xl shadow-xl border border-amber-100 p-6 space-y-8">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full bg-emerald-700 text-white">
              🧑‍🍽️ WAITER
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-3 tracking-tight">
              Service Panel
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Track ready orders and mark them as served.
            </p>
          </div>

          {/* small stats – like Chef: Active / Pending / Today */}
          <div className="grid grid-cols-3 gap-3">
            <div className="stat-small bg-emerald-50 text-emerald-800">
              {summaryText.activeCount}
              <span>Active</span>
            </div>
            <div className="stat-small bg-amber-50 text-amber-800">
              {summaryText.pendingCount}
              <span>Pending</span>
            </div>
            <div className="stat-small bg-blue-50 text-blue-700">
              {summaryText.servedTodayCount}
              <span>Today</span>
            </div>
          </div>

          {/* nav */}
          <div className="space-y-2">
            <SidebarButton
              label="Overview"
              icon="📊"
              active={activeTab === "OVERVIEW"}
              onClick={() => setActiveTab("OVERVIEW")}
            />
            <SidebarButton
              label="Ready to Serve"
              icon="🍽️"
              active={activeTab === "READY"}
              // 🔴 pulse only for *unseen* ready orders + not already on READY tab
              pulse={hasUnseenReady && activeTab !== "READY"}
              onClick={() => {
                // 👀 mark all current ready orders as "seen" for this waiter
                const ids = readyToServe
                  .map((o) => o.id)
                  .filter((id) => id != null);

                setSeenReadyIds((prev) => [...new Set([...prev, ...ids])]);
                setActiveTab("READY");
              }}
            />
            <SidebarButton
              label="Active Orders"
              icon="📦"
              active={activeTab === "ASSIGNED"}
              onClick={() => setActiveTab("ASSIGNED")}
            />
            <SidebarButton
              label="Served History"
              icon="📜"
              active={activeTab === "HISTORY"}
              onClick={() => setActiveTab("HISTORY")}
            />
            <SidebarButton
              label="Notifications"
              icon="🔔"
              active={activeTab === "NOTIFICATIONS"}
              pulse={hasUnreadAlerts && activeTab !== "NOTIFICATIONS"}
              onClick={() => {
                // mark ONLY alert notifications as seen
                const alertIds = activity
                  .filter((a) => a.type === "ALERT")
                  .map((a) => a.id);

                setSeenAlertIds((prev) => [
                  ...new Set([...prev, ...alertIds]),
                ]);
                setHasUnreadAlerts(false);
                setActiveTab("NOTIFICATIONS");
              }}
            />
            <SidebarButton
              label="Profile"
              icon="👤"
              active={activeTab === "PROFILE"}
              onClick={() => setActiveTab("PROFILE")}
            />
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 space-y-8 pb-8">
          {isLoading && (
            <section className="card-section">
              <div className="text-sm text-gray-500">Loading orders...</div>
            </section>
          )}
          {hasError && !isLoading && (
            <section className="card-section">
              <div className="text-sm text-red-600">{error}</div>
            </section>
          )}

          {!isLoading && !hasError && (
            <>
              {activeTab === "OVERVIEW" && (
                <WaiterOverviewTab
                  readyToServe={readyToServe}
                  summary={summaryText}
                  activity={activity}
                  history={history}
                  onAccept={acceptReadyOrder}
                />
              )}

              {activeTab === "READY" && (
                <ReadyToServeTab
                  orders={readyToServe}
                  onAccept={acceptReadyOrder}
                />
              )}

              {activeTab === "ASSIGNED" && (
                <AssignedOrdersTab orders={myAssigned} onServe={markServed} />
              )}

              {activeTab === "HISTORY" && <HistoryTab orders={history} />}

              {activeTab === "NOTIFICATIONS" && (
                <NotificationsTab activity={activity} />
              )}

              {activeTab === "PROFILE" && (
                <ProfileTab user={user} staff={myStaff} summary={summaryText} />
              )}
            </>
          )}
        </main>
      </div>

      {/* local styles – same pattern as Admin/Chef */}
      <style>{`
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

// ========== TABS ==========

function WaiterOverviewTab({
  readyToServe,
  summary,
  activity,
  history,
  onAccept,
}) {
  const topTwo = readyToServe.slice(0, 2);

  // ====== helpers ======
  function getOrderDate(o) {
    const raw = o.servedAt || o.createdAt || o.placedAt;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function getOrderRating(o) {
    if (o.feedbackRating != null) return Number(o.feedbackRating);
    if (o.rating != null) return Number(o.rating);
    return null;
  }

  function getOrderComment(o) {
    if (o.feedbackComment != null && o.feedbackComment !== "") {
      return o.feedbackComment;
    }
    if (o.comment != null && o.comment !== "") {
      return o.comment;
    }
    return null;
  }

  // range for cards + chart (7d / 30d / all)
  const [rangeKey, setRangeKey] = useState("7"); // "7" | "30" | "ALL"

  function getRangeInfo(key) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (key === "7") {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { from, days: 7, label: "7 days" };
    }
    if (key === "30") {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      return { from, days: 30, label: "30 days" };
    }
    // ALL
    return { from: null, days: null, label: "All time" };
  }

  const { from: rangeFrom, days: rangeDaysCount, label: rangeLabel } =
    getRangeInfo(rangeKey);

  // all SERVED orders in selected range (for cards)
  const servedInRange = (history || []).filter((o) => {
    const d = getOrderDate(o);
    if (!d) return false;
    if (!rangeFrom) return true; // ALL
    return d >= rangeFrom;
  });

  const totalServedInRange = servedInRange.length;

  const avgOrdersPerDayRange =
    rangeDaysCount && rangeDaysCount > 0
      ? (totalServedInRange / rangeDaysCount).toFixed(1)
      : totalServedInRange.toString();

  // ====== average serving time (createdAt → servedAt) in minutes ======
 let avgServingMinutes = null;

if (servedInRange.length > 0) {
  let minutesSum = 0;
  let count = 0;

  for (const o of servedInRange) {
    // START = createdAt or placedAt
    const startRaw = o.acceptedAt || o.waiterAcceptedAt || o.createdAt || o.placedAt;

    // END = servedAt → the timestamp when waiter marked “Served”
    const endRaw = o.servedAt;

    if (!startRaw || !endRaw) continue;

    const start = new Date(startRaw);
    const end = new Date(endRaw);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) continue;

    const diffMinutes = diffMs / 60000;

    // ignore unrealistic times
    if (diffMinutes > 180) continue;

    minutesSum += diffMinutes;
    count++;
  }

  if (count > 0) {
    avgServingMinutes = (minutesSum / count).toFixed(1);
  }
}


  // ====== feedback stats (overall rating + review count) ======
  const feedbackOrders = (history || []).filter(
    (o) => getOrderRating(o) != null
  );

  let avgRating = null;
  let totalReviews = 0;

  if (feedbackOrders.length > 0) {
    let sum = 0;
    for (const o of feedbackOrders) {
      const r = getOrderRating(o);
      if (r != null && !Number.isNaN(r) && r > 0) {
        sum += r;
        totalReviews += 1;
      }
    }
    if (totalReviews > 0) {
      avgRating = (sum / totalReviews).toFixed(1);
    }
  }

  // star distribution (5 → 1)
  const starBuckets = [5, 4, 3, 2, 1].map((star) => {
    const count = feedbackOrders.filter(
      (o) => getOrderRating(o) === star
    ).length;
    const percent =
      totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, percent };
  });

  // recent comments list (max 10)
  const feedbackComments = feedbackOrders
    .map((o) => {
      const d = getOrderDate(o);
      return {
        id: o.id,
        rating: getOrderRating(o),
        comment: getOrderComment(o),
        date: d,
      };
    })
    .filter((f) => f.comment && f.comment.trim() !== "")
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.getTime() - a.date.getTime();
    })
    .slice(0, 10);

  // ====== CHART (uses same rangeKey) ======
  const chartData = useMemo(() => {
    const servedList = history || [];

    const safeDate = (o) => {
      const d = getOrderDate(o); // servedAt / createdAt helper above
      if (!d || Number.isNaN(d.getTime())) return null;
      return d;
    };

    // ---------- ALL TIME: like Chef dashboard ----------
    // Only real served dates, no fixed 30-day window
    if (rangeKey === "ALL") {
      const map = new Map();

      servedList.forEach((o) => {
        const d = safeDate(o);
        if (!d) return;
        const key = d.toISOString().slice(0, 10); // yyyy-mm-dd
        map.set(key, (map.get(key) || 0) + 1);
      });

      const keys = Array.from(map.keys()).sort(); // oldest → newest

      return keys.map((key) => {
        const d = new Date(key);
        const dd = d.getDate().toString().padStart(2, "0");
        const mm = (d.getMonth() + 1).toString().padStart(2, "0");

        return {
          date: key,
          label: `${dd}/${mm}`, // ALL → DD/MM
          served: map.get(key) || 0,
        };
      });
    }

    // ---------- 7 days / 30 days rolling window ----------
    const map = new Map();

    servedList.forEach((o) => {
      const d = safeDate(o);
      if (!d) return;
      if (rangeFrom && d < rangeFrom) return; // keep only inside range

      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });

    const result = [];
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);

    let daysWindow = rangeKey === "30" ? 30 : 7;

    for (let i = daysWindow - 1; i >= 0; i--) {
      const d = new Date(todayLocal);
      d.setDate(todayLocal.getDate() - i);
      const key = d.toISOString().slice(0, 10);

      let label;
      if (rangeKey === "7") {
        // 7 days → DD/MM
        label = `${d.getDate().toString().padStart(2, "0")}/${(
          d.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}`;
      } else {
        // 30 days → only date (10, 11, 12, ...)
        label = d.getDate().toString().padStart(2, "0");
      }

      result.push({
        date: key,
        label,
        served: map.get(key) || 0,
      });
    }

    return result;
  }, [history, rangeFrom, rangeKey]);

  return (
    <>
      {/* TITLE */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1">
            Waiter Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            See ready orders, accept them, and track your serving performance.
          </p>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="w-full mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* 1) Orders served + range dropdown */}
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase">
              Orders served
            </div>
            <select
              value={rangeKey}
              onChange={(e) => setRangeKey(e.target.value)}
              className="text-[11px] font-semibold border border-emerald-200 rounded-full px-2 py-0.5 bg-white text-emerald-700 focus:outline-none"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="ALL">All time</option>
            </select>
          </div>
          <div className="mt-1 text-lg font-bold text-emerald-900">
            {totalServedInRange}
          </div>
          <div className="mt-0.5 text-[11px] text-emerald-700/80">
            In {rangeLabel}
          </div>
        </div>

        {/* 2) Avg orders / day */}
        <div className="rounded-2xl bg-blue-50 border border-blue-200 text-center px-3 py-3">
          <div className="text-[11px] font-semibold text-blue-700 uppercase">
            Avg orders / day
          </div>
          <div className="mt-1 text-lg font-bold text-blue-900">
            {avgOrdersPerDayRange}
          </div>
          <div className="mt-0.5 text-[11px] text-blue-700/80">
            Based on {rangeLabel}
          </div>
        </div>

        {/* 3) Avg serving time + feedback count */}
        <div className="rounded-2xl bg-amber-50 border border-amber-200 text-center px-3 py-3">
          <div className="text-[11px] font-semibold text-amber-700 uppercase">
            Avg serving time
          </div>
          <div className="mt-1 text-lg font-bold text-amber-900">
            {avgServingMinutes != null ? `${avgServingMinutes} min` : "—"}
          </div>
          
        </div>
      </div>

      {/* SERVING PERFORMANCE CHART */}
      <section className="card-section mt-1 mb-4">
        <header className="section-header">
          <h3>Serving Performance</h3>
          <span>Orders you served – {rangeLabel}</span>
        </header>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tickMargin={8} />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickMargin={10}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="served"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Ready to Serve section (top 2) */}
      <section className="card-section mt-1">
        <header className="section-header">
          <h3>Ready to Serve</h3>
          <span>Orders that chef has completed</span>
        </header>

        {topTwo.length === 0 ? (
          <div className="text-sm text-gray-500">
            No orders ready right now. They&apos;ll appear here once chef
            marks them as <b>Completed</b>.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topTwo.map((o) => (
              <OrderCard key={o.id} order={o} onAccept={onAccept} />
            ))}
          </div>
        )}
      </section>

      

      {/* Recent Activity (unchanged layout) */}
      <section className="card-section">
        <header className="section-header">
          <h3>Recent Activity</h3>
          <span>Latest ready & served updates</span>
        </header>
        {activity.length === 0 ? (
          <div className="text-sm text-gray-500">No recent updates yet.</div>
        ) : (
          <div className="space-y-3">
            {activity.slice(0, 5).map((a) => {
              const typeColor =
                a.type === "ALERT"
                  ? "bg-red-50 text-red-700 border-red-100"
                  : "bg-blue-50 text-blue-700 border-blue-100";
              const typeLabel = a.type === "ALERT" ? "Alert" : "Order";
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

function ReadyToServeTab({ orders, onAccept }) {
  return (
    <section className="card-section">
      <header className="section-header">
        <h3>Ready to Serve</h3>
        <span>Accept an order to take responsibility</span>
      </header>

      {orders.length === 0 ? (
        <div className="text-sm text-gray-500">
          No orders are ready at the moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} onAccept={onAccept} />
          ))}
        </div>
      )}
    </section>
  );
}

function AssignedOrdersTab({ orders, onServe }) {
  return (
    <section className="card-section">
      <header className="section-header">
        <h3>All Assigned Orders</h3>
        <span>Orders mapped to this waiter</span>
      </header>

      {orders.length === 0 ? (
        <div className="text-sm text-gray-500">
          No orders assigned to you yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} onServe={onServe} />
          ))}
        </div>
      )}
    </section>
  );
}

function HistoryTab({ orders }) {
  return (
    <section className="card-section">
      <header className="section-header">
        <h3>Served History</h3>
        <span>Completed orders (SERVED)</span>
      </header>

      {orders.length === 0 ? (
        <div className="text-sm text-gray-500">
          You haven&apos;t completed any served orders yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((o) => (
            <OrderCard key={o.id} order={o} showEta={false} />
          ))}
        </div>
      )}
    </section>
  );
}

function NotificationsTab({ activity }) {
  // Only admin-assigned alerts (type === 'ALERT')
  const alerts = activity.filter((a) => a.type === "ALERT");

  return (
    <section className="card-section">
      <header className="section-header">
        <h3>Notifications</h3>
        <span>Admin assigned orders</span>
      </header>

      {alerts.length === 0 ? (
        <div className="text-sm text-gray-500">No notifications at the moment.</div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100"
            >
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-red-600 text-white">
                ALERT
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-red-800">{a.label}</div>
                {a.meta && <div className="text-xs text-red-600 mt-0.5">{a.meta}</div>}
              </div>
              <div className="text-[11px] text-red-500 whitespace-nowrap">{a.time}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


// Profile (same style as chef profile but for waiter)
function ProfileTab({ user, staff, summary }) {
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);

  if (!user) {
    return (
      <section className="card-section">
        <header className="section-header">
          <h3>Profile</h3>
          <span>Your account details</span>
        </header>
        <div className="text-sm text-gray-500">
          User info not available. Please login again.
        </div>
      </section>
    );
  }

  const staffRole =
    staff && staff.role
      ? staff.role.charAt(0) + staff.role.slice(1).toLowerCase()
      : "Waiter";
  const staffStatus =
    staff && staff.status
      ? staff.status.charAt(0) + staff.status.slice(1).toLowerCase()
      : "Active";
  const joinedAt =
    staff && staff.joinedAt ? formatDateTime(staff.joinedAt) : "—";

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "W";

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
      console.error("Waiter change password error:", err);
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
        <span>Waiter account</span>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: avatar + quick chips */}
        <div className="md:w-1/3 flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700 shadow-inner">
            {initial}
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-gray-900">
              {user.name}
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
                {staffRole}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[11px] font-semibold border ${
                  staffStatus.toUpperCase() === "ACTIVE"
                    ? "bg-blue-50 text-blue-700 border-blue-100"
                    : "bg-slate-50 text-slate-700 border-slate-200"
                }`}
              >
                {staffStatus}
              </span>
            </div>
          </div>

          {/* tiny performance badges */}
          <div className="mt-2 grid grid-cols-3 gap-2 w-full">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-2 py-2 text-center">
              <div className="text-[10px] text-emerald-700 uppercase">
                Active
              </div>
              <div className="text-sm font-bold text-emerald-900">
                {summary.activeCount}
              </div>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-100 px-2 py-2 text-center">
              <div className="text-[10px] text-amber-700 uppercase">
                Pending
              </div>
              <div className="text-sm font-bold text-amber-900">
                {summary.pendingCount}
              </div>
            </div>
            <div className="rounded-2xl bg-blue-50 border border-blue-100 px-2 py-2 text-center">
              <div className="text-[10px] text-blue-700 uppercase">
                Today
              </div>
              <div className="text-sm font-bold text-blue-900">
                {summary.servedTodayCount}
              </div>
            </div>
          </div>
        </div>

        {/* Right: info fields (input-like) */}
        <div className="md:flex-1 space-y-4">
          {/* row 1 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Full Name" value={user.name} />
            <InfoField label="Email" value={user.email} />
          </div>

          {/* row 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Staff Role" value={staffRole} />
            <InfoField label="Staff Status" value={staffStatus} />
          </div>

          {/* row 3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="Joined as Staff" value={joinedAt} />
            <InfoField
              label="Total Orders Served"
              value={summary.totalServedAll}
            />
          </div>

          {/* change password – modal like Chef */}
          <div className="pt-2 flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => {
                setPwdMsg(null);
                setShowPwdModal(true);
              }}
              className="inline-flex items-center px-4 py-2 rounded-full bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800"
            >
              Change Password
            </button>
            <span className="text-[11px] text-gray-500">
              If you forget your password, use <b>Forgot Password</b> from the
              login page.
            </span>
          </div>
        </div>
      </div>

      {/* Password modal */}
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







