// src/pages/UserDashboard/OverviewPanel.jsx
import React from "react";
import { Link } from "react-router-dom";

// 🔹 same format as History & Orders pages
function formatOrderCode(id) {
  if (!id && id !== 0) return "—";
  const n = Number(id);
  if (!Number.isFinite(n)) return String(id);
  return `ORD-${String(n).padStart(3, "0")}`;
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
function displayOrderStatus(status) {
  const s = (status || "").toUpperCase();
  if (s === "PENDING") return "Pending";
  if (s === "IN_PROGRESS") return "Preparing";
  if (s === "COMPLETED") return "Ready to serve";  // 👈 chef done
  if (s === "SERVED") return "Completed ✓";        // 👈 waiter final
  return s;
}

export default function OverviewPanel({
  profile,
  orders = [],
  bookingsCount = 0,
  
}) {
  const name = (profile && (profile.name || profile.email)) || "Guest";

  return (
    <div className="space-y-6">
      {/* Soft page panel background */}
      <div
        className="rounded-2xl p-6 shadow-xl border 
    bg-gradient-to-r from-[#FFECD2] via-[#FCFFF7] to-[#FFF4E6]"
      >
        <div className="md:flex md:items-start md:justify-between gap-6">
          <div className="md:flex-1">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
              Welcome back, <span className="text-amber-700">{name}</span>
            </h1>
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">
              Discover today's specials, reserve your favourite seat, or quickly
              place an order — all from your dashboard.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
              <div className="p-3 rounded-md border bg-white shadow-sm h-20 flex flex-col justify-center">
                <div className="text-xs text-gray-500">Bookings</div>
                <div className="text-xl font-bold text-amber-700 mt-1">
  {bookingsCount || 0}
  
</div>

              </div>

              <div className="p-3 rounded-md border bg-white shadow-sm h-20 flex flex-col justify-center">
                <div className="text-xs text-gray-500">Orders</div>
                <div className="text-xl font-bold text-amber-700 mt-1">
                  {orders.length || 0}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-0 md:w-72">
            <div className="rounded-xl bg-white p-6 shadow-md border">
              <div className="text-xs text-gray-400">Need a table?</div>
              <div className="text-lg font-semibold text-amber-700 mt-2">
                Reserve now
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Easy booking — confirm in seconds.
              </div>
              <Link
                to="/dashboard/book"
                className="mt-4 inline-block w-full bg-amber-700 text-white px-4 py-2 rounded-md text-center"
              >
                Book a table
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders panel – table style */}
      <div className="bg-white rounded-xl border shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
          <div className="text-sm text-gray-500">
            {orders.length > 0
              ? `Showing latest ${orders.length}`
              : "No orders yet"}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            You haven’t placed any orders yet.
          </div>
        ) : (
          <>
            {/* Header row */}
            <div className="hidden md:grid grid-cols-5 gap-4 px-6 py-3 text-xs font-semibold text-gray-500 border-b bg-gray-50">
              <div>Order ID</div>
              <div>Date &amp; Time</div>
              <div>Items × Qty</div>
              <div className="text-center">Status</div>
              <div className="text-right">Total</div>
            </div>

            {/* Rows */}
            <div className="divide-y max-h-72 overflow-auto">
              {orders.map((o) => {
                const items = o.items ?? [];
                const itemsText = items
                  .map((i) => `${i.qty ?? i.quantity ?? 1}× ${i.name}`)
                  .join(", ");

                const createdAt =
                  o.createdAt ||
                  o.orderTime ||
                  o.createdDate ||
                  o.createdOn ||
                  null;

                const status = (o.status || "PENDING").toUpperCase();
                const total = o.total ?? o.totalAmount ?? 0;

                return (
                  <div
                    key={o.id}
                    className="px-6 py-3 grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 items-center hover:bg-gray-50 transition"
                  >
                    {/* Order ID (pretty code) */}
                    <div className="text-sm font-medium text-gray-900">
                      {formatOrderCode(o.id)}
                    </div>

                    {/* Date & Time */}
                    <div className="text-xs text-gray-600">
                      {formatDateTime(createdAt)}
                    </div>

                    {/* Items */}
                    <div className="text-xs text-gray-700 truncate">
                      {itemsText || "—"}
                    </div>

                    {/* Status */}
                    <div className="text-xs flex md:justify-center">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full font-semibold
                          ${
                            status === "SERVED" || status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          } text-[11px]`}
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
      </div>
    </div>
  );
}


















