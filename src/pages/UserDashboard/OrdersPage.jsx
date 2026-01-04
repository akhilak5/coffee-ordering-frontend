// src/pages/UserDashboard/OrdersPage.jsx
import React, { useEffect, useState, useCallback } from "react";

/*
OrdersPage
- Shows user's orders
- Allows rating after order is SERVED
- Submits each item to POST /item-reviews
- Immediately marks order as rated in UI (and stores small cache in localStorage)
- Double-checks backend after submit to sync
*/

function formatOrderCode(id) {
  if (id == null) return "—";
  return `ORD-${String(id).padStart(3, "0")}`;
}
function safeDate(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
}
function badgeCls(s) {
  const st = (s || "").toUpperCase();
  if (st === "SERVED") return "bg-emerald-100 text-emerald-700";
  if (st === "COMPLETED") return "bg-blue-100 text-blue-700";
  if (st === "IN_PROGRESS") return "bg-amber-100 text-amber-700";
  if (st === "PENDING") return "bg-slate-100 text-slate-700";
  if (st === "CANCELLED") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]); // flat reviews for this user
  const [loading, setLoading] = useState(true);

  // rating modal state
  const [modalOrder, setModalOrder] = useState(null);
  const [reviewItems, setReviewItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // utility: read user from localStorage
  const getUserId = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return u?.id ?? null;
    } catch {
      return null;
    }
  };

  // fetch orders and user's reviews
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getUserId();
      if (!userId) {
        setOrders([]);
        setReviews([]);
        setLoading(false);
        return;
      }

      const [ordRes, revRes] = await Promise.all([
        fetch(`http://localhost:8080/orders/my?userId=${userId}`),
        fetch(`http://localhost:8080/item-reviews?userId=${userId}`),
      ]);

      const ordJson = ordRes.ok ? await ordRes.json() : [];
      let revJson = [];
      try {
        revJson = revRes.ok ? await revRes.json() : [];
      } catch {
        revJson = [];
      }

      setOrders(Array.isArray(ordJson) ? ordJson : []);
      // Normalize reviews -> always an array of flat objects with orderId and menuItemId
      if (Array.isArray(revJson)) {
        setReviews(revJson);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error("loadData error", err);
      setOrders([]);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // clear short cache older than 30s
    try {
      const ts = Number(localStorage.getItem("ratedOrdersCacheTS") || "0");
      if (ts && Date.now() - ts > 30 * 1000) {
        localStorage.removeItem("ratedOrdersCache");
        localStorage.removeItem("ratedOrdersCacheTS");
      }
    } catch {}
    loadData();
  }, [loadData]);

  // determine if order is rated (uses server reviews + local cache)
  const orderRated = (orderId) => {
    if (orderId == null) return false;
    // local cache
    try {
      const cached = JSON.parse(localStorage.getItem("ratedOrdersCache") || "[]");
      if (Array.isArray(cached) && cached.includes(Number(orderId))) return true;
    } catch {}
    // server reviews
    if (!Array.isArray(reviews)) return false;
    return reviews.some((r) => Number(r.orderId) === Number(orderId));
  };

  // open modal to rate items
  const openRateModal = (order) => {
    const list = (order.items || []).map((it) => ({
      menuItemId: it.menuItemId ?? it.id ?? null,
      name: it.name ?? it.title ?? `Item #${it.menuItemId ?? it.id ?? "?"}`,
      rating: 0,
      comment: "",
    }));
    setReviewItems(list);
    setModalOrder(order);
    setError("");
  };

  const updateItem = (index, field, value) => {
    setReviewItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  };

  // submit all item reviews for the modalOrder
  const submitAll = async (e) => {
    e?.preventDefault();
    setError("");
    const userId = getUserId();
    if (!userId) {
      setError("Please login");
      return;
    }
    if (!modalOrder) {
      setError("No order selected");
      return;
    }
    // require at least one rated item (not all)
// require at least one rated item (not all)
const ratedItems = reviewItems.filter((it) => it.rating && Number(it.rating) >= 1);
if (ratedItems.length === 0) {
  setError("Please rate at least one item");
  return;
}

setSaving(true);
try {
  const results = [];
  // only POST the items that have ratings
  for (const it of ratedItems) {
    const payload = {
      orderId: modalOrder.id,
      menuItemId: Number(it.menuItemId),
      userId: Number(userId),
      rating: Number(it.rating),
      comment: it.comment ? String(it.comment).trim() : null,
    };

    const res = await fetch("http://localhost:8080/item-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const bodyText = await res.text();
    let parsed;
    try { parsed = JSON.parse(bodyText); } catch { parsed = bodyText; }
    results.push({ ok: res.ok, status: res.status, body: parsed });
    if (!res.ok) {
      console.error("Save failure", payload, parsed);
      throw new Error("Server returned error while saving reviews");
    }
  }

  // optimistic: mark order rated locally & in cache (same as before)
  try {
    const cached = JSON.parse(localStorage.getItem("ratedOrdersCache") || "[]");
    const set = new Set(Array.isArray(cached) ? cached : []);
    set.add(Number(modalOrder.id));
    localStorage.setItem("ratedOrdersCache", JSON.stringify(Array.from(set)));
    localStorage.setItem("ratedOrdersCacheTS", String(Date.now()));
  } catch {}

  // re-sync from server to make sure backend has all rows
  await loadData();

  setModalOrder(null);
  alert("Thanks for rating!");
} catch (err) {
  console.error("submitAll error", err);
  setError("Failed to save reviews");
} finally {
  setSaving(false);
}

  };

  if (loading) return <div className="p-6">Loading orders…</div>;
  if (!orders || orders.length === 0) return <div className="p-6 text-gray-500">No orders yet.</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Orders</h2>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="grid grid-cols-6 text-xs font-semibold bg-gray-50 px-6 py-2 border-b">
          <div>Order</div>
          <div>Date</div>
          <div className="text-center">Items</div>
          <div className="text-center">Status</div>
          <div className="text-right">Total</div>
          <div className="text-right">Action</div>
        </div>

        {orders.map((o) => {
          const isServed = (o.status || "").toUpperCase() === "SERVED";
          const rated = orderRated(o.id);

          return (
            <div key={o.id} className="grid grid-cols-6 gap-4 px-6 py-3 border-b items-center">
              <div className="font-mono">{formatOrderCode(o.id)}</div>
              <div className="text-sm text-gray-600">{safeDate(o.createdAt)}</div>
              <div className="text-center">{(o.items || []).length}</div>
              <div className="flex flex-col items-center gap-1">
  <span
    className={`px-3 py-1 rounded-full text-xs font-semibold ${badgeCls(o.status)}`}
  >
    ● {(o.status || "").toUpperCase()}
  </span>

  {o.paymentStatus === "PAID" && (
    <span className="text-[10px] text-emerald-700 font-semibold">
      Paid via {o.paymentMethod}
    </span>
  )}

  {o.paymentStatus === "PENDING" && (
    <span className="text-[10px] text-gray-500 font-semibold">
      Pay on delivery
    </span>
  )}
</div>

              <div className="text-right font-semibold">₹{o.total}</div>

              <div className="text-right">
                {!isServed && <span className="text-gray-400 text-xs">Not completed</span>}
                {isServed && rated && <span className="text-[10px] text-emerald-700 font-semibold">✓ Rated</span>}
                {isServed && !rated && (
                  <button
                    className="px-3 py-1 rounded-full bg-amber-700 text-white text-xs"
                    onClick={() => openRateModal(o)}
                  >
                    Rate Items ⭐
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rating modal */}
      {modalOrder && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4">Rate items in {formatOrderCode(modalOrder.id)}</h3>

            <form className="space-y-4" onSubmit={submitAll}>
              {reviewItems.map((it, i) => (
                <div key={i} className="border rounded-xl p-3 bg-amber-50">
                  <div className="font-semibold text-sm mb-1">{it.name}</div>

                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        className="text-xl"
                        onClick={() => updateItem(i, "rating", n)}
                      >
                        {n <= it.rating ? "★" : "☆"}
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="w-full border p-2 text-xs rounded-lg"
                    rows="2"
                    placeholder="Write comment…"
                    value={it.comment}
                    onChange={(e) => updateItem(i, "comment", e.target.value)}
                  />
                </div>
              ))}

              {error && <div className="text-red-600 text-xs">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="px-4 py-1 border rounded-lg" onClick={() => setModalOrder(null)}>Cancel</button>
                <button disabled={saving} className="px-5 py-1 rounded-lg bg-amber-700 text-white">
                  {saving ? "Saving…" : "Submit All"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



















