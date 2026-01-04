// src/pages/ChefDashboard.jsx
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

// simple fake ETA based on number of items
function calcEtaMinutes(order) {
  const items = order.items || [];
  const base = 10;
  const perItem = 3;
  return base + items.length * perItem;
}

function badgeClasses(status) {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "IN_PROGRESS")
    return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "PENDING")
    return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

function prettyStatus(status) {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "Pending";
  if (s === "IN_PROGRESS") return "In progress";
  if (s === "COMPLETED") return "Ready to Serve";
  if (s === "SERVED") return "Completed ✓"; // final from waiter, still show “Completed”
  return s.replace("_", " ");
}

// helper: treat COMPLETED + SERVED as done
function isDoneStatus(status) {
  const s = (status || "").toUpperCase();
  return s === "COMPLETED" || s === "SERVED";
}
// ---------- helper: attach reviews to orders' items ----------
function attachReviewsToOrders(orders, reviews) {
  const map = new Map();
  const revs = Array.isArray(reviews) ? reviews : [];

  // Build a map keyed by either:
  //  - `${orderId}::id::${menuId}`  (when review uses menu id keys)
  //  - `${orderId}::name::${normalizedMenuName}` (when review lists items by name)
  revs.forEach((r, idx) => {
    // Case A: review object contains an items[] array (your provided JSON)
    if (Array.isArray(r.items) && (r.orderId != null || r.order_id != null)) {
      const orderId = String(r.orderId ?? r.order_id);
      r.items.forEach((it) => {
        const menuName = (it.item ?? it.name ?? "").toString().trim().toLowerCase();
        if (!menuName) return;
        const key = `${orderId}::name::${menuName}`;
        // store the item-level review (keep rating/comment fields)
        map.set(key, {
          rating: it.rating ?? it.item_rating ?? null,
          comment:
            it.comment ??
            it.item_review ??
            it.reviewComment ??
            (it.note ?? "") ??
            "",
        });
      });
      return;
    }

    // Case B: legacy per-item review records (with menu id fields)
    const orderIdRaw =
      r.order_id ?? r.orderId ?? r.order ?? r.orderIdStr ?? r.orderIdStr;
    const menuIdRaw =
      r.menu_item_id ??
      r.menuItemId ??
      r.menu_item ??
      r.menuId ??
      r.menu_itemId ??
      r.menu_id;

    if (orderIdRaw != null && menuIdRaw != null) {
      const key = `${String(orderIdRaw)}::id::${String(menuIdRaw)}`;
      map.set(key, {
        rating: r.rating ?? r.item_rating ?? r.score ?? null,
        comment:
          r.comment ??
          r.item_review ??
          r.reviewComment ??
          (r.note ?? "") ??
          "",
      });
    }
  });

  // Debug hint (will appear in console if map has keys)
  if (map.size > 0) {
    console.debug("attachReviewsToOrders: built review keys sample:", Array.from(map.keys()).slice(0, 8));
  } else {
    console.debug("attachReviewsToOrders: no review keys built (reviews may be empty)");
  }

  return (Array.isArray(orders) ? orders : []).map((o) => {
    const items = Array.isArray(o.items) ? o.items : [];

    const newItems = items.map((it) => {
      // try to find by menu id first
      const menuIdRaw =
        it.menuItemId ?? it.menu_item_id ?? it.menu_item ?? it.id ?? it.menuId ?? it.menu_id;
      const menuId = menuIdRaw == null ? null : String(menuIdRaw);

      // also compute normalized name for fallback
      const itemName = (it.name ?? it.item ?? "").toString().trim().toLowerCase();

      // lookup order id
      const orderId = String(o.id);

      // candidate keys
      const byIdKey = menuId ? `${orderId}::id::${menuId}` : null;
      const byNameKey = itemName ? `${orderId}::name::${itemName}` : null;

      // pick review if found
      const rev =
        (byIdKey && map.has(byIdKey) && map.get(byIdKey)) ||
        (byNameKey && map.has(byNameKey) && map.get(byNameKey)) ||
        null;

      // derive rating/comment from either existing item fields or the attached review
      const rating =
        it.rating ??
        it.item_rating ??
        (rev ? rev.rating ?? null : null);

      const comment =
        it.comment ??
        it.reviewComment ??
        (rev ? rev.comment ?? "" : "") ??
        "";

      return {
        ...it,
        rating: rating == null ? null : rating,
        comment: comment == null ? "" : String(comment),
      };
    });

    return { ...o, items: newItems };
  });
}

// When reviews arrive, attach to existing orders if items don't already have ratings

// REPLACE existing OrderCard with this one
function OrderCard({ order, showEta = true, onStart, onComplete }) {
  const s = (order.status || "").toUpperCase();
  const eta = showEta ? calcEtaMinutes(order) : null;

  // small star SVG component used inline
  const Star = ({ filled }) => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="0.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={filled ? "text-amber-600" : "text-amber-200"}
      aria-hidden
    >
      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.403 8.178L12 18.897l-7.337 3.948 1.403-8.178L.132 9.21l8.2-1.192z" />
    </svg>
  );

  // compact stars row
  const StarsInline = ({ n }) => {
    const num = Math.max(0, Math.min(5, Number(n) || 0));
    return (
      <span className="inline-flex items-center gap-1" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < num ? "text-amber-600" : "text-amber-200"}>
            <Star filled={i < num} />
          </span>
        ))}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-amber-100 bg-white shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">
            Order
          </div>
          <div className="text-sm font-bold text-gray-900">
            {formatOrderCode(order.id)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {order.customerName || "Customer"}
          </div>
        </div>

        <span
          className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-semibold ${badgeClasses(
            s
          )}`}
        >
          ● {prettyStatus(s)}
        </span>
      </div>

      {/* ITEM LIST — left: qty × name (+price) ; right: stars + numeric + comment (same line) */}
      <div className="mt-1 text-xs text-gray-600 space-y-2">
        {(order.items || []).map((it, idx) => {
          const qty = it.qty ?? it.quantity ?? 1;
          const name = it.name ?? it.item ?? `Item ${it.menuItemId ?? it.id ?? idx}`;
          const price = it.price ?? it.amount ?? null;
         const rating = it.rating ?? it.item_rating ?? null;
const comment = (it.comment ?? it.reviewComment ?? "").toString().trim();

const hasRating = rating != null && rating !== "" && !Number.isNaN(Number(rating));

// <-- show review content only for completed/served orders
// inside OrderCard, near the top of the function:
const orderIsDone = isDoneStatus(order.status);

// inside items.map(...) where you build each item row — replace the right-side block with:
return (
  <div key={idx} className="flex items-start justify-between gap-3">
    {/* left: qty + name + small price */}
    <div className="flex items-start gap-3 min-w-0">
      <div className="text-xs font-semibold text-gray-500 mt-0.5">{qty} ×</div>
      <div className="min-w-0">
  {/*
    Show full item name for active / new orders so chefs can read the name.
    For completed/history orders (isDoneStatus === true) keep the truncated layout.
  */}
  {(() => {
    const showFullNameForActive = !isDoneStatus(order.status);
    return (
      <div
        className={`text-sm font-medium text-gray-900 ${showFullNameForActive ? "" : "truncate"}`}
        style={showFullNameForActive ? {} : { maxWidth: 360 }}
      >
        {name}
      </div>
    );
  })()}

  {price != null && (
    <div className="text-xs text-gray-500 mt-0.5">₹{price}</div>
  )}
</div>

    </div>

    {/* right: only show review info when order is completed/served */}
    <div className="flex-shrink-0 flex flex-col items-end text-right ml-4" style={{ minWidth: 120 }}>
      {orderIsDone ? (
        <>
          <div className="flex items-center gap-2 whitespace-nowrap">
            {hasRating ? (
              <>
                <StarsInline n={rating} />
                <div className="text-xs text-gray-700 font-medium">{rating}</div>
              </>
            ) : (
              <div className="text-xs text-gray-400 italic">—</div>
            )}
          </div>

          <div
            className="mt-1 text-sm text-gray-600 truncate"
            title={comment || ""}
            style={{ maxWidth: 200 }}
          >
            {comment || (hasRating ? "—" : "Not reviewed yet")}
          </div>
        </>
      ) : (
        // not done yet — do not show "Not reviewed yet" — keep compact placeholder or nothing
        <div className="text-xs text-gray-500"> </div>
      )}
    </div>
  </div>
);

        })}
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
        {s === "PENDING" && onStart && (
          <button
            className="text-[11px] px-3 py-1.5 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700"
            onClick={() => onStart(order.id)}
          >
            Start Preparing
          </button>
        )}
        {s === "IN_PROGRESS" && onComplete && (
          <button
            className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            onClick={() => onComplete(order.id)}
          >
            Mark Completed
          </button>
        )}
      </div>
    </div>
  );
}


// ========== MAIN PAGE ==========
export default function ChefDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const [allOrders, setAllOrders] = useState([]);
  const [staffList, setStaffList] = useState([]); // staff info
  // ⭐ For showing customer item reviews to chef
const [itemReviews, setItemReviews] = useState([]);

// ⭐ Load reviews
// ⭐ Load reviews (attach them to already-loaded orders)
  async function loadReviews() {
  try {
    const res = await fetch("http://localhost:8080/item-reviews");
    if (!res.ok) {
      console.warn("loadReviews: response not ok", res.status);
      return [];
    }
    const data = await res.json().catch(() => null);
    const revs = Array.isArray(data) ? data : [];

    console.groupCollapsed("ChefDashboard: loadReviews()");
    console.log("reviews fetched:", revs.length);
    console.log("sample reviews:", (revs || []).slice(0, 5));
    console.groupEnd();

    setItemReviews(revs);

    // attach to current orders if any (keeps existing behavior)
    setAllOrders((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;
      return attachReviewsToOrders(prev, revs);
    });

    // RETURN reviews so callers can use them immediately
    return revs;
  } catch (err) {
    console.error("Failed to load reviews", err);
    return [];
  }
}


  // When reviews arrive, attach to existing orders if items don't already have ratings
  useEffect(() => {
    if (!Array.isArray(itemReviews) || itemReviews.length === 0) return;

    setAllOrders((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return prev;

      // check if at least one item already has rating -> then assume attached
      const anyHasRating = prev.some((o) =>
        Array.isArray(o.items) && o.items.some((it) => it && it.rating != null)
      );
      if (anyHasRating) return prev;

      return attachReviewsToOrders(prev, itemReviews);
    });
  }, [itemReviews]);

  // debug: log samples
  useEffect(() => {
    console.groupCollapsed("ChefDashboard DEBUG: samples");
    console.log("itemReviews (first 3):", (itemReviews || []).slice(0, 3));
    console.log("allOrders length:", (allOrders || []).length);
    if (allOrders && allOrders.length > 0) {
      console.log("sample order[0]:", {
        id: allOrders[0].id,
        itemsSample: (allOrders[0].items || []).slice(0, 3),
      });
    }
    console.groupEnd();
  }, [itemReviews, allOrders]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // store alert IDs that chef already saw (persist)
  const [seenAlertIds, setSeenAlertIds] = useState(() => {
    try {
      const raw = localStorage.getItem("chef_seen_alert_ids");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [seenNewOrderIds, setSeenNewOrderIds] = useState(() => {
  try {
    const raw = localStorage.getItem("chef_seen_new_orders");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
});

  // whether to show red dot now (notifications)
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false);

  // basic guard – only CHEF allowed here
  useEffect(() => {
    if (!userId || (user.role || "").toUpperCase() !== "CHEF") {
      navigate("/login");
    }
  }, [userId, user, navigate]);

  async function loadOrders(reviewsForAttach = null) {
  try {
    setLoading(true);
    setError(null);

    const res = await fetch("http://localhost:8080/orders/all");
    if (!res.ok) throw new Error("Failed to load orders");

    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];

    // If caller provided reviews (from loadReviews), use those;
    // otherwise fall back to the current itemReviews state
    const revsToUse =
      Array.isArray(reviewsForAttach) && reviewsForAttach.length > 0
        ? reviewsForAttach
        : Array.isArray(itemReviews) && itemReviews.length > 0
        ? itemReviews
        : null;

    if (revsToUse) {
      setAllOrders(attachReviewsToOrders(arr, revsToUse));
    } else {
      setAllOrders(arr);
    }
  } catch (err) {
    console.error("ChefDashboard: failed to load orders", err);
    setError("Failed to load orders");
    setAllOrders([]);
  } finally {
    setLoading(false);
  }
}




  // load staff list
  async function loadStaff() {
    try {
      const res = await fetch("http://localhost:8080/staff");
      if (!res.ok) {
        console.error("ChefDashboard: failed to load staff", res.status);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setStaffList(data);
      }
    } catch (err) {
      console.error("ChefDashboard: error loading staff", err);
    }
  }

 useEffect(() => {
  if (!userId) return;

  (async () => {
    try {
      // load reviews first (so we can attach to orders)
      const revs = await loadReviews();

      // then load orders & staff in parallel; pass revs so orders attach immediately
      await Promise.all([loadOrders(revs), loadStaff()]);
    } catch (err) {
      console.error("ChefDashboard initial load error:", err);
    }
  })();
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

  // Accept order: assign this chef + mark IN_PROGRESS
  async function acceptOrder(orderId) {
    try {
      const myEmail = (user?.email || "").toLowerCase();
      const myStaff = staffList.find((s) => {
        const sEmail = (s.email || "").toLowerCase();
        const sRole = (s.role || "").toUpperCase();
        const sStatus = (s.status || "").toUpperCase();
        return (
          sEmail === myEmail &&
          sRole === "CHEF" &&
          (sStatus === "ACTIVE" || sStatus === "INVITED")
        );
      });

      if (!myStaff) {
        alert("Staff record not found for this chef. Please contact admin.");
        return;
      }

      // assign to this chef
      await fetch(`http://localhost:8080/orders/${orderId}/assign-staff`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: myStaff.id,
          staffRole: "CHEF",
        }),
      });

      // immediately move to IN_PROGRESS
      await updateStatus(orderId, "IN_PROGRESS");
    } catch (err) {
      console.error("Failed to accept order", err);
      alert("Failed to accept order");
    }
  }

  // ---------- derived lists ----------
    const {
    myAssigned,
    myActive,
    myPending,
    myDoneToday,
    newOrders,
    history,
    activity,
    myStaff,
  } = useMemo(() => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);

    // find this chef in staff list
    const myEmail = (user?.email || "").toLowerCase();
    const foundStaff = staffList.find((s) => {
      const sEmail = (s.email || "").toLowerCase();
      const sRole = (s.role || "").toUpperCase();
      const sStatus = (s.status || "").toUpperCase();
      return (
        sEmail === myEmail &&
        sRole === "CHEF" &&
        (sStatus === "ACTIVE" || sStatus === "INVITED")
      );
    });

    const myStaffId =
      foundStaff && foundStaff.id != null ? Number(foundStaff.id) : null;

    const assigned = [];
    const newList = [];
    const historyList = [];
    const activityList = [];

    for (const o of allOrders) {
      const status = (o.status || "").toUpperCase();

      // ✅ backend uses chefStaffId (like waiterStaffId), not assignedStaffId
      const hasChefAssigned = o.chefStaffId != null;

      const assignedToMe =
        myStaffId != null &&
        o.chefStaffId != null &&
        Number(o.chefStaffId) === myStaffId;

      const orderDate = new Date(
        o.updatedAt || o.createdAt || o.placedAt || Date.now()
      ).getTime();

      // group for this chef
      if (assignedToMe) {
        assigned.push(o);

        if (isDoneStatus(status)) historyList.push(o);

        if (status === "IN_PROGRESS") {
          activityList.push({
            id: `act-${o.id}-progress`,
            type: "ORDER",
            label: `Started preparing ${formatOrderCode(o.id)}`,
            meta: (o.items?.[0]?.name || "") && `(${o.items[0].name})`,
            time: "Just now",
            timestamp: orderDate,
          });
        } else if (status === "COMPLETED") {
          activityList.push({
            id: `act-${o.id}-done`,
            type: "ORDER",
            label: `Completed ${formatOrderCode(o.id)}`,
            meta: (o.items?.[0]?.name || "") && `(${o.items[0].name})`,
            time: "Recently",
            timestamp: orderDate,
          });
        }

        // admin-assigned alert (pending, high priority)
        if (status === "PENDING") {
          activityList.push({
            id: `act-${o.id}-admin`,
            type: "ALERT",
            label: `High priority order ${formatOrderCode(
              o.id
            )} assigned by Admin`,
            meta: "",
            time: "Few minutes ago",
            timestamp: orderDate,
          });
        }
      }

      // New Orders = no CHEF assigned & not completed/cancelled
      // New Orders = orders with NO chef assigned AND not finished
if (
  !hasChefAssigned &&
  !["COMPLETED", "SERVED", "CANCELLED"].includes(status)
) {
  newList.push(o);
}

    }

    // stats
    const active = assigned.filter(
      (o) =>
        (o.status || "").toUpperCase() === "PENDING" ||
        (o.status || "").toUpperCase() === "IN_PROGRESS"
    );

    const pending = assigned.filter(
      (o) => (o.status || "").toUpperCase() === "PENDING"
    );

    const doneToday = assigned.filter((o) => {
      const created = o.createdAt || o.placedAt;
      if (!created) return false;
      const d = new Date(created);
      if (Number.isNaN(d.getTime())) return false;
      return (
        d.toISOString().slice(0, 10) === todayKey && isDoneStatus(o.status)
      );
    });

    return {
      myAssigned: assigned,
      myActive: active,
      myPending: pending,
      myDoneToday: doneToday,
      newOrders: newList,
      history: historyList,
      activity: activityList,
      myStaff: foundStaff || null,
    };
  }, [allOrders, staffList, user]);


  // persist seen alert IDs
  useEffect(() => {
    localStorage.setItem("chef_seen_alert_ids", JSON.stringify(seenAlertIds));
  }, [seenAlertIds]);
  useEffect(() => {
  localStorage.setItem(
    "chef_seen_new_orders",
    JSON.stringify(seenNewOrderIds)
  );
}, [seenNewOrderIds]);


  // unread alerts = ALERTs whose IDs are not in seenAlertIds
  const unreadAlerts = useMemo(
    () =>
      activity.filter(
        (a) => a.type === "ALERT" && !seenAlertIds.includes(a.id)
      ),
    [activity, seenAlertIds]
  );

  useEffect(() => {
    setHasUnreadAlerts(
      unreadAlerts.length > 0 && activeTab !== "NOTIFICATIONS"
    );
  }, [unreadAlerts, activeTab]);

  // quick stats for summary (still used in sidebar + profile)
  const summaryText = useMemo(() => {
    const activeCount = myActive.length;
    const pendingCount = myPending.length;
    const inProgressCount =
      myActive.length - myPending.length >= 0
        ? myActive.length - myPending.length
        : 0;
    const doneToday = myDoneToday.length;

    // total orders handled by this chef (all time, done)
    const totalOrders = myAssigned.filter((o) =>
      isDoneStatus(o.status)
    ).length;

    return {
      activeCount,
      pendingCount,
      inProgressCount,
      doneToday,
      avgPrepMinutes: 15, // placeholder
      totalOrders,
    };
  }, [myActive, myPending, myDoneToday, myAssigned]);

  // red dot on New Orders when there are any
  // red dot on New Orders only for *unseen* new orders
const unseenNewOrders = newOrders.filter(
  (o) => !seenNewOrderIds.includes(o.id)
);
const hasNewOrders = unseenNewOrders.length > 0;


  // ---------- render ----------
  const isLoading = loading;
  const hasError = !!error;

  return (
    <div className="min-h-screen pt-8 bg-gradient-to-b from-[#FFF5E1] via-[#FFF9F2] to-[#FFF]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col lg:flex-row gap-10">
        {/* LEFT SIDEBAR */}
        <aside className="w-full lg:w-72 bg-white rounded-3xl shadow-xl border border-amber-100 p-6 space-y-8">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-semibold rounded-full bg-amber-700 text-white">
              👨‍🍳 CHEF
            </span>
            <h2 className="text-xl font-black text-gray-900 mt-3 tracking-tight">
              Kitchen Panel
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Handle assigned orders and track your work.
            </p>
          </div>

          {/* small stats */}
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
              {summaryText.doneToday}
              <span>Done Today</span>
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
              label="Active Orders"
              icon="📦"
              active={activeTab === "ASSIGNED"}
              onClick={() => setActiveTab("ASSIGNED")}
            />
            <SidebarButton
              label="New Orders"
              icon="🆕"
              active={activeTab === "NEW"}
              pulse={hasNewOrders && activeTab !== "NEW"}
              onClick={() => {
  // mark all currently visible New Orders as seen
  const ids = newOrders
    .map((o) => o.id)
    .filter((id) => id != null);

  setSeenNewOrderIds((prev) => [...new Set([...prev, ...ids])]);
  setActiveTab("NEW");
}}

            />
            <SidebarButton
  label="Menu Availability"
  icon="🍽️"
  active={activeTab === "MENU"}
  onClick={() => setActiveTab("MENU")}
/>

            <SidebarButton
              label="Order History"
              icon="📜"
              active={activeTab === "HISTORY"}
              onClick={() => setActiveTab("HISTORY")}
            />
            <SidebarButton
              label="Notifications"
              icon="🔔"
              active={activeTab === "NOTIFICATIONS"}
              pulse={hasUnreadAlerts}
              onClick={() => {
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
                <ChefOverviewTab
                  myAssigned={myAssigned}
                  summary={summaryText}
                  activity={activity}
                />
              )}

              {activeTab === "ASSIGNED" && (
                <AssignedOrdersTab
                  orders={myActive} // only active (PENDING + IN_PROGRESS)
                  onStart={(id) => updateStatus(id, "IN_PROGRESS")}
                  onComplete={(id) => updateStatus(id, "COMPLETED")}
                />
              )}

              {activeTab === "NEW" && (
                <NewOrdersTab orders={newOrders} onAccept={acceptOrder} />
              )}
              {activeTab === "MENU" && <ChefMenuTab />}


              {activeTab === "HISTORY" && (
  <HistoryTab orders={history} itemReviews={itemReviews} />
)}


              {activeTab === "NOTIFICATIONS" && (
                <NotificationsTab activity={activity} />
              )}

              {activeTab === "PROFILE" && (
                <ProfileTab
                  user={user}
                  staff={myStaff}
                  summary={summaryText}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* local styles – same pattern as AdminDashboard */}
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

// ---------- small sub-components ----------
function SidebarButton({ label, icon, active, onClick, pulse }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition ${
        active
          ? "bg-amber-600 text-white font-semibold shadow-md"
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

// Overview
// Overview
function ChefOverviewTab({ myAssigned, summary, activity }) {
  // dropdown: ALL | 7D | 30D
  const [period, setPeriod] = useState("ALL");

  const queue = myAssigned.filter(
    (o) =>
      (o.status || "").toUpperCase() === "PENDING" ||
      (o.status || "").toUpperCase() === "IN_PROGRESS"
  );
  const topTwo = queue.slice(0, 2);

  // ✅ all done orders (COMPLETED + SERVED)
  const completedOrders = myAssigned.filter((o) => isDoneStatus(o.status));
  const totalCompletedAll = completedOrders.length;

  function getOrderDate(o) {
    const raw = o.createdAt || o.placedAt;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // ----- Completed Orders card (ALL / 7D / 30D) -----
  let filteredTotal = totalCompletedAll;
  if (period !== "ALL") {
    const days = period === "7D" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    filteredTotal = completedOrders.filter((o) => {
      const d = getOrderDate(o);
      return d && d >= cutoff;
    }).length;
  }

  const periodLabel =
    period === "ALL"
      ? "All time"
      : period === "7D"
      ? "Last 7 days"
      : "Last 30 days";

  // ----- Earnings + avg orders (always last 7 days) -----
  const cutoff7d = new Date();
  cutoff7d.setDate(cutoff7d.getDate() - 6);

  const doneLast7Days = completedOrders.filter((o) => {
    const d = getOrderDate(o);
    return d && d >= cutoff7d;
  });

  const revenueLast7Days = doneLast7Days.reduce(
    (sum, o) => sum + (Number(o.total) || 0),
    0
  );

  const avgOrdersPerDay =
    doneLast7Days.length > 0 ? (doneLast7Days.length / 7).toFixed(1) : 0;

  const estimatedPrepMinutes =
    completedOrders.length > 0
      ? Math.round(
          completedOrders.reduce((sum, o) => sum + calcEtaMinutes(o), 0) /
            completedOrders.length
        )
      : summary.avgPrepMinutes;

    // --------- CHART DATA: depends on dropdown (ALL / 7D / 30D) ----------
  const chartData = useMemo(() => {
    // use only done orders for chart
    const completed = myAssigned.filter((o) => isDoneStatus(o.status));

    const safeDate = (o) => {
      const raw = o.createdAt || o.placedAt;
      if (!raw) return null;
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? null : d;
    };

    // ---------- ALL TIME: same as now (DD/MM) ----------
    if (period === "ALL") {
      const map = new Map();

      completed.forEach((o) => {
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
          label: `${dd}/${mm}`, // all time → DD/MM
          orders: map.get(key) || 0,
        };
      });
    }

    // ---------- 7D / 30D rolling window (like waiter) ----------
    let daysRange = period === "30D" ? 30 : 7;

    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (daysRange - 1));

    const map = new Map();
    completed.forEach((o) => {
      const d = safeDate(o);
      if (!d || d < cutoff) return;
      const key = d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });

    // label formatter: 
    // - 7D  → DD/MM
    // - 30D → DD
    const formatLabel = (d) => {
      const dd = d.getDate().toString().padStart(2, "0");
      const mm = (d.getMonth() + 1).toString().padStart(2, "0");
      if (period === "30D") return dd;       // 11,12,13,...
      return `${dd}/${mm}`;                  // 11/11,12/11,...
    };

    const result = [];
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);

    for (let i = daysRange - 1; i >= 0; i--) {
      const d = new Date(todayLocal);
      d.setDate(todayLocal.getDate() - i);

      const key = d.toISOString().slice(0, 10);

      result.push({
        date: key,
        label: formatLabel(d),
        orders: map.get(key) || 0,
      });
    }

    return result;
  }, [myAssigned, period]);

  return (
    <>
      {/* Title + Completed Orders strip in one line */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1">
            Chef Dashboard
          </h1>
          <p className="text-sm text-gray-600">
            Quick snapshot of your queue and latest updates.
          </p>
        </div>

        {/* Completed Orders small card */}
        <div className="min-w-[230px] px-5 py-3 rounded-2xl bg-lime-100 shadow-md border border-emerald-100 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold tracking-wide  uppercase text-emerald-700">
              Completed Orders
            </div>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="ALL">All time</option>
              <option value="7D">Last 7 days</option>
              <option value="30D">Last 30 days</option>
            </select>
          </div>

          <div className="mt-1 text-3xl font-black leading-none text-emerald-800 text-center">
            {filteredTotal}
          </div>
          <div className="text-[11px] text-center text-gray-500">
            {periodLabel}
          </div>
        </div>

        {/* Metrics row – performance cards */}
        <div className="w-full mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-yellow-100 border border-emerald-200 px-3 py-3 text-center">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase">
              Completed order earnings (7d)
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-900">
              ₹{revenueLast7Days}
            </div>
          </div>
          <div className="rounded-2xl bg-blue-50 border border-amber-200 text-center px-3 py-3">
            <div className="text-[11px] font-semibold text-amber-700 uppercase">
              Avg orders / day (7d)
            </div>
            <div className="mt-1 text-lg font-bold text-amber-900">
              {avgOrdersPerDay}
            </div>
          </div>
          <div className="rounded-2xl bg-gray-200 border border-blue-200 text-center px-3 py-3">
            <div className="text-[11px] font-semibold text-blue-700 uppercase">
              Est. prep time / order
            </div>
            <div className="mt-1 text-lg font-bold text-blue-900">
              {estimatedPrepMinutes} min
            </div>
          </div>
        </div>
      </div>

      {/* Current queue */}
      <section className="card-section mt-1">
        <header className="section-header">
          <h3>Current Queue</h3>
          <span>Orders assigned to you & accepted by you</span>
        </header>

        {topTwo.length === 0 ? (
          <div className="text-sm text-gray-500">
            No active orders. Check <b>New Orders</b> to pick the next one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topTwo.map((o) => (
              <OrderCard key={o.id} order={o} showEta />
            ))}
          </div>
        )}
      </section>

      {/* Prep Performance chart */}
      <section className="card-section mt-4">
        <header className="section-header">
          <h3>Prep Performance</h3>
          <span>
            {period === "ALL"
              ? "Completed orders – all time"
              : period === "7D"
              ? "Completed orders – last 7 days"
              : "Completed orders – last 30 days"}
          </span>
        </header>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tickMargin={8} />
              <YAxis allowDecimals={false} axisLine={false} tickMargin={10} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#16a34a"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Recent Activity FULL WIDTH */}
      <section className="card-section">
        <header className="section-header">
          <h3>Recent Activity</h3>
          <span>Last updates from your side</span>
        </header>

        {activity.length === 0 ? (
          <div className="text-sm text-gray-500">No recent updates yet.</div>
        ) : (
          <div className="space-y-3">
            {[...activity]
              .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
              .slice(0, 5)
              .map((a) => {
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

// Assigned tab → Active Orders
function AssignedOrdersTab({ orders, onStart, onComplete }) {
  // latest created first
  const sorted = [...orders].sort((a, b) => {
    const da = new Date(a.createdAt || a.placedAt || 0);
    const db = new Date(b.createdAt || b.placedAt || 0);
    return db - da; // newest first
  });

  return (
    <section className="card-section">
      <header className="section-header">
        <h3>Active Orders</h3>
        <span>Orders currently in your queue</span>
      </header>

      {sorted.length === 0 ? (
        <div className="text-sm text-gray-500">
          No active orders yet. You can accept a new order from{" "}
          <b>New Orders</b> when available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              showEta
              onStart={onStart}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// New orders tab
function NewOrdersTab({ orders, onAccept }) {
  return (
    <section className="card-section">
      <header className="section-header">
        <h3>New Orders</h3>
        <span>Pick orders that are not yet assigned</span>
      </header>

      {orders.length === 0 ? (
        <div className="text-sm text-gray-500">
          No new orders waiting. You&apos;ll see them here as soon as they
          arrive.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {orders.map((o) => (
            <div
  key={o.id}
  className="relative flex flex-col h-full justify-between"
>

              <OrderCard order={o} showEta={false} />
              <div className="mt-auto pt-3 flex justify-end">

                <button
                  className="text-[11px] px-3 py-1.5 rounded-full bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
                  onClick={() => onAccept(o.id)}
                >
                  Accept Order
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// HistoryTab.jsx
// ---------- Small SVG star row ----------
function SmallStars({ n = 0 }) {
  const num = Math.max(0, Math.min(5, Number(n) || 0));
  const StarSVG = ({ filled }) => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="0.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={filled ? "text-amber-600" : "text-amber-200"}
    >
      <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.403 8.178L12 18.897l-7.337 3.948 1.403-8.178L.132 9.21l8.2-1.192z" />
    </svg>
  );

  return (
    <span className="inline-flex items-center gap-1" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < num ? "text-amber-600" : "text-amber-200"}>
          <StarSVG filled={i < num} />
        </span>
      ))}
    </span>
  );
}

// ---------- Compact inline review row (renders item + inline rating/comment) ----------
function ReviewRow({ it }) {
  const name = it.name ?? it.item ?? `Item #${it.menuItemId ?? "?"}`;
  const comment = (it.comment ?? it.reviewComment ?? "").toString().trim();
  const ratingRaw = it.rating ?? it.item_rating ?? null;
  const rating = ratingRaw != null && ratingRaw !== "" ? Number(ratingRaw) : null;
  const qty = it.qty ?? it.quantity ?? 1;
  const price = it.price ?? it.amount ?? null;
  const hasRating = rating != null && !Number.isNaN(rating);

  return (
    <div className="py-1">
      <div className="flex items-start justify-between gap-4">
        {/* left: qty + name + small price */}
        <div className="min-w-0 flex items-start gap-3">
          <div className="text-xs font-semibold text-gray-500 mt-0.5">{qty} ×</div>

          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate" style={{ maxWidth: 300 }}>
              {name}
            </div>
            {price != null && (
              <div className="text-xs text-gray-500 mt-0.5">₹{price}</div>
            )}
          </div>
        </div>

        {/* right: stars + numeric + comment on same block (comment truncated, full on hover) */}
        <div className="flex-shrink-0 flex flex-col items-end text-right ml-4" style={{ minWidth: 160 }}>
          <div className="flex items-center gap-3 whitespace-nowrap">
            {hasRating ? (
              <>
                <SmallStars n={rating} />
                <div className="text-xs text-gray-700 font-medium">{rating}</div>
              </>
            ) : (
              <div className="text-xs text-gray-400 italic">—</div>
            )}
          </div>

          <div
            className="mt-1 text-sm text-gray-600 truncate"
            title={comment || ""}
            style={{ maxWidth: 260 }}
          >
            {comment || (hasRating ? "—" : "Not reviewed yet")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- HistoryTab: render order card and inline items (replace your HistoryTab) ----------
function HistoryTab({ orders = [], itemReviews = [] }) {
  const normalize = (s) => (s ?? "").toString().trim().toLowerCase().replace(/[^\w\s]/g, "");

  const byIdMap = new Map();
  const byNameMap = new Map();
  (Array.isArray(itemReviews) ? itemReviews : []).forEach((r) => {
    if (Array.isArray(r.items) && (r.orderId != null || r.order_id != null)) {
      const orderId = String(r.orderId ?? r.order_id);
      r.items.forEach((it) => {
        const nameKey = (it.item ?? it.name ?? "").toString().trim().toLowerCase();
        if (nameKey) {
          byNameMap.set(`${orderId}::name::${normalize(nameKey)}`, {
            rating: it.rating ?? it.item_rating ?? null,
            comment: it.comment ?? it.item_review ?? it.reviewComment ?? "",
          });
        }
      });
      return;
    }

    const orderIdRaw = r.order_id ?? r.orderId ?? r.order ?? r.orderIdStr;
    const menuIdRaw = r.menu_item_id ?? r.menuItemId ?? r.menu_item ?? r.menuId ?? r.menu_id;
    if (orderIdRaw != null && menuIdRaw != null) {
      byIdMap.set(`${String(orderIdRaw)}::id::${String(menuIdRaw)}`, {
        rating: r.rating ?? r.item_rating ?? r.score ?? null,
        comment: r.comment ?? r.item_review ?? r.reviewComment ?? "",
      });
    }
  });

  const list = Array.isArray(orders) ? orders : [];

  return (
    <section>
      <div className="card-section">
        <header className="section-header mb-4">
          <h3>Order History</h3>
          <span>Completed orders (for this chef)</span>
        </header>

        {list.length === 0 ? (
          <div className="text-sm text-gray-500">You haven't completed any orders yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {list.map((o) => {
              // resolve per-item rating/comment (fallback to itemReviews maps)
              const items = Array.isArray(o.items) ? o.items : [];
              const resolved = items.map((it) => {
                const menuId = it.menuItemId ?? it.id ?? it.menuId ?? null;
                const nameKey = normalize(it.name ?? it.item ?? "");
                const byId = menuId ? byIdMap.get(`${String(o.id)}::id::${String(menuId)}`) : null;
                const byName = nameKey ? byNameMap.get(`${String(o.id)}::name::${nameKey}`) : null;

                const rating = it.rating ?? it.item_rating ?? (byId ? byId.rating : (byName ? byName.rating : null));
                const comment = it.comment ?? it.reviewComment ?? (byId ? byId.comment : (byName ? byName.comment : ""));

                return { ...it, rating, comment };
              });

              return (
                <div
                  key={o.id}
                  className="rounded-2xl border border-amber-400 bg-white shadow-sm overflow-hidden"
                >
                  <div className="p-4">
                   <div className="rounded-xl p-3 bg-amber-50/40">
    <OrderCard order={o} showEta={false} />
</div>


                    {/* NOTE: removed the separate items/reviews block — OrderCard now shows inline item review info */}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .card-section { background: transparent; border-radius: 12px; padding: 0; }
      `}</style>
    </section>
  );
}











// ============ CHEF MENU AVAILABILITY TAB ============
function ChefMenuTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  async function loadMenu() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://localhost:8080/menu");
      if (!res.ok) throw new Error("Failed to load menu");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("ChefMenuTab: failed to load menu", err);
      setError("Failed to load menu items");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMenu();
  }, []);

  async function toggleAvailability(item) {
    const next = item.available === false; // if currently out-of-stock -> make available, else out-of-stock
    setSavingId(item.id);
    try {
      const res = await fetch(
        `http://localhost:8080/menu/${item.id}/availability`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ available: !item.available }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.error)) {
        alert(data?.error || "Failed to update availability");
        return;
      }

      const saved = data || { ...item, available: !item.available };

      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? saved : it))
      );
    } catch (err) {
      console.error("ChefMenuTab: toggle availability error", err);
      alert("Failed to update availability");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="card-section">
      <header className="section-header">
        <h3>Menu Availability</h3>
        <span>Mark items as available or out of stock</span>
      </header>

      {loading ? (
        <div className="text-sm text-gray-500">Loading menu...</div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">
          No menu items found. Ask admin to add items.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="hidden md:grid grid-cols-6 gap-4 px-4 py-2 text-[11px] font-semibold text-gray-500 border-b bg-gray-50">
            <div>Name</div>
            <div>Category</div>
            <div>Price</div>
            <div>Status</div>
            <div>Image</div>
            <div className="text-right">Action</div>
          </div>

          <div className="divide-y">
            {items.map((it) => {
              const isOut = it.available === false;
              return (
                <div
                  key={it.id}
                  className="grid grid-cols-1 md:grid-cols-6 gap-2 md:gap-4 px-4 py-3 items-center hover:bg-gray-50 transition"
                >
                  <div className="text-sm font-semibold text-gray-900">
                    {it.name}
                  </div>
                  <div className="text-xs font-medium text-gray-700">
                    {it.category === "HOT"
                      ? "Hot Coffee"
                      : it.category === "COLD"
                      ? "Cold Coffee"
                      : it.category === "SNACKS"
                      ? "Snacks"
                      : it.category || "—"}
                  </div>
                  <div className="text-sm font-semibold text-gray-900">
                    ₹{it.price}
                  </div>
                  <div className="text-xs font-semibold">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border ${
                        isOut
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      ● {isOut ? "Out of stock" : "Available"}
                    </span>
                  </div>
                  <div className="flex justify-start md:justify-center">
                    {it.img ? (
                      <img
                        src={it.img}
                        onError={(e) =>
                          (e.target.src = "/menu-placeholder.jpg")
                        }
                        alt={it.name}
                        className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">No image</span>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={savingId === it.id}
                      onClick={() => toggleAvailability(it)}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold border ${
                        isOut
                          ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                          : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {savingId === it.id
                        ? "Updating..."
                        : isOut
                        ? "Mark Available"
                        : "Mark Out of stock"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}


// Notifications
function NotificationsTab({ activity }) {
  const alerts = activity.filter((a) => a.type === "ALERT");
  const others = activity.filter((a) => a.type !== "ALERT");

  return (
    <section className="card-section">
      <header className="section-header">
        <h3>Notifications</h3>
        <span>High priority items & recent updates</span>
      </header>

      {alerts.length === 0 && others.length === 0 ? (
        <div className="text-sm text-gray-500">
          No notifications at the moment.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-red-600 mb-1">
                Alerts
              </div>
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
                      <div className="text-sm font-medium text-red-800">
                        {a.label}
                      </div>
                      {a.meta && (
                        <div className="text-xs text-red-600 mt-0.5">
                          {a.meta}
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-red-500 whitespace-nowrap">
                      {a.time}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1">
                Other updates
              </div>
              <div className="space-y-2">
                {others.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 px-3 py-2 rounded-xl bg-gray-50 border border-gray-100"
                  >
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-600 text-white">
                      ORDER
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// Profile (modern, input-like)
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
      : "Chef";
  const staffStatus =
    staff && staff.status
      ? staff.status.charAt(0) + staff.status.slice(1).toLowerCase()
      : "Active";
  const joinedAt =
    staff && staff.joinedAt ? formatDateTime(staff.joinedAt) : "—";

  const initial = user.name ? user.name.charAt(0).toUpperCase() : "C";

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
      console.error("Chef change password error:", err);
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
        <span>Chef account</span>
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
                Done Today
              </div>
              <div className="text-sm font-bold text-blue-900">
                {summary.doneToday}
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
              label="Average Prep Target"
              value={`${summary.avgPrepMinutes} min`}
            />
          </div>

          {/* change password */}
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

      {/* Password Modal */}
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

// small reusable "input-like" field
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

