// src/pages/UserDashboard/HistoryPage.jsx
import React from "react";

// 🔹 Helper to format order id like ORD-004
function formatOrderCode(id) {
  if (!id && id !== 0) return "—";
  const n = Number(id);
  if (!Number.isFinite(n)) return String(id);
  return `ORD-${String(n).padStart(3, "0")}`;
}
function displayOrderStatus(status) {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "Pending";
  if (s === "IN_PROGRESS") return "Preparing";
  if (s === "COMPLETED") return "Ready to serve";
  if (s === "SERVED") return "Completed ✓";
  return s;
}

export default function HistoryPage({ orders = [], bookings = [] }) {
  // ---- helpers ----
  function isPastDate(value) {
    if (!value) return false;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    // we don't use this for filtering now, only for styling if you want
    return d < today;
  }

  function formatDateTime(value) {
    if (!value) return "—";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString();
    } catch {
      return String(value);
    }
  }

  function formatDateOnly(value) {
    if (!value) return "—";
    try {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleDateString();
    } catch {
      return String(value);
    }
  }

  // ---- derived data ----

  // Orders: newest → oldest
  const sortedOrders = [...orders].sort((a, b) => {
    const da =
      a.createdAt || a.orderTime || a.createdDate || a.createdOn || null;
    const db =
      b.createdAt || b.orderTime || b.createdDate || b.createdOn || null;

    const ta = da ? new Date(da).getTime() : 0;
    const tb = db ? new Date(db).getTime() : 0;
    return tb - ta;
  });

  // Bookings: show ALL bookings (newest → oldest)
  const sortedBookings = [...(bookings || [])].sort((a, b) => {
    const da = a.date || a.reservationDate || null;
    const db = b.date || b.reservationDate || null;
    const ta = da ? new Date(da).getTime() : 0;
    const tb = db ? new Date(db).getTime() : 0;
    return tb - ta;
  });

  const totalOrders = sortedOrders.length;
  const totalBookings = sortedBookings.length;

  return (
    <div className="space-y-6">
      {/* Page heading + summary cards */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
            History
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            View your past orders and all your bookings in one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:w-auto">
          <div className="px-4 py-3 rounded-xl border bg-white shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Orders
            </div>
            <div className="mt-1 text-xl font-bold text-amber-700">
              {totalOrders}
            </div>
          </div>
          <div className="px-4 py-3 rounded-xl border bg-white shadow-sm">
            <div className="text-[11px] uppercase tracking-wide text-gray-500">
              Bookings
            </div>
            <div className="mt-1 text-xl font-bold text-amber-700">
              {totalBookings}
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout: Orders (left) | Bookings (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ==== ORDERS CARD ==== */}
        <section className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Past Orders
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                All orders you have placed so far.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">
              {totalOrders} total
            </span>
          </div>

          {sortedOrders.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-gray-500 text-sm">
              You haven’t placed any orders yet.
            </div>
          ) : (
            <>
              {/* header row (desktop) */}
              <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 text-[11px] font-semibold text-gray-500 border-b bg-gray-50">
                <div>Order ID</div>
                <div>Date &amp; Time</div>
                <div>Items</div>
                <div className="text-center">Status</div>
                <div className="text-right">Total</div>
              </div>

              {/* rows */}
              <div className="flex-1 max-h-[360px] overflow-auto divide-y">
                {sortedOrders.map((order) => {
                  const items = order.items || order.orderItems || [];
                  const status = (order.status || "PENDING").toUpperCase();
                  const total = order.total ?? order.totalAmount ?? 0;
                  const createdAt =
                    order.createdAt ||
                    order.orderTime ||
                    order.createdDate ||
                    order.createdOn ||
                    null;

                  return (
                    <div
                      key={order.id}
                      className="px-6 py-3 grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 items-start hover:bg-gray-50 transition"
                    >
                      {/* Order id */}
                      <div className="text-sm font-medium text-gray-900">
                        {formatOrderCode(order.id)}
                      </div>

                      {/* Date & time */}
                      <div className="text-xs text-gray-600">
                        {formatDateTime(createdAt)}
                      </div>

                      {/* Items – each on its own line */}
                      <div className="text-xs text-gray-700">
                        {items.length === 0 ? (
                          <span className="text-gray-400">
                            No item details.
                          </span>
                        ) : (
                          <ul className="space-y-0.5">
                            {items.map((it, idx) => {
                              const qty = it.qty ?? it.quantity ?? 1;
                              const name = it.name || "";
                              return (
                                <li key={it.id || idx} className="truncate">
                                  {qty} × {name}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      {/* Status */}
                      <div className="text-xs flex md:justify-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full font-semibold text-[11px]
                            ${
                              status === "SERVED" || status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "CANCELLED"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                        >
                         ● {displayOrderStatus(status)}
                        </span>
                      </div>

                      {/* Total */}
                      <div className="text-sm font-semibold text-gray-900 text-right">
                        ₹{total}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* ==== BOOKINGS CARD ==== */}
        <section className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Booking History
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                All your bookings (past and upcoming).
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">
              {totalBookings} records
            </span>
          </div>

          {sortedBookings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8 text-gray-500 text-sm">
              No bookings yet.
            </div>
          ) : (
            <>
              {/* header row (desktop) */}
              <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 text-[11px] font-semibold text-gray-500 border-b bg-gray-50">
                <div>Booking ID</div>
                <div>Date</div>
                <div>Slot</div>
                <div className="text-center">Guests</div>
                <div className="text-center">Status</div>
              </div>

              {/* rows */}
              <div className="flex-1 max-h-[360px] overflow-auto divide-y">
                {sortedBookings.map((b) => {
                  const status =
                    (
                      b.status ||
                      b.reservationStatus ||
                      "PENDING"
                    ).toUpperCase();

                  const dateValue = b.date || b.reservationDate;

                  const guests =
                    b.guests ||
                    b.partySize ||
                    b.guestCount ||
                    "—";

                  const rawSlot = b.slot || b.timeSlot || "";
                  const slotLower = rawSlot.toLowerCase();
                  const slotLabel =
                    slotLower.includes("morn")
                      ? "Morning (9–12)"
                      : slotLower.includes("after")
                      ? "Afternoon (12–4)"
                      : slotLower.includes("even")
                      ? "Evening (4–9)"
                      : rawSlot || "—";

                  const isPast = isPastDate(dateValue);

                  return (
                    <div
                      key={b.id}
                      className="px-6 py-3 grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 items-center hover:bg-gray-50 transition"
                    >
                      {/* booking id */}
                      <div className="text-sm font-medium text-gray-900">
                        #{b.id}
                      </div>

                      {/* date */}
                      <div className="text-xs text-gray-700">
                        {formatDateOnly(dateValue)}
                      </div>

                      {/* slot */}
                      <div className="text-xs text-gray-700">
                        {slotLabel}
                      </div>

                      {/* guests */}
                      <div className="text-xs text-gray-700 text-center">
                        {guests}
                      </div>

                      {/* status badge */}
                      <div className="text-xs flex md:justify-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full font-semibold text-[11px]
                            ${
                              status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-700"
                                : status === "CANCELLED"
                                ? "bg-red-100 text-red-700"
                                : isPast
                                ? "bg-gray-100 text-gray-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                        >
                          ● {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}







