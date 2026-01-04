// src/pages/AdminReportsPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// small helper for UI date-time
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

// helper for PDF currency (avoid ₹ font issue in jsPDF)
function formatPdfCurrency(num) {
  return `Rs ${Number(num || 0).toLocaleString()}`;
}

export default function AdminReportsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [range, setRange] = useState("7d"); // today | 7d | 30d | all | custom
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://localhost:8080/orders/all");
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];

      // normalize each order
      const normalized = arr
        .map((o) => {
          // try to build a customer name
          const nameFromOrder =
            (o.customerName && o.customerName.trim()) ||
            (o.userName && o.userName.trim()) ||
            null;

          const customer =
            nameFromOrder ||
            (o.userId != null ? `User ID: ${o.userId}` : "");

          // parse date
          if (!o.createdAt) {
            return {
              ...o,
              customer,
              _dt: null,
              _dayKey: null,
            };
          }

         const d = new Date(o.createdAt);

          
          if (Number.isNaN(d.getTime())) {
            return {
              ...o,
              customer,
              _dt: null,
              _dayKey: null,
            };
          }

          const dayKey =
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");


          return {
            ...o,
            customer,
            _dt: d,
            _dayKey: dayKey,
          };
        })
        .filter(Boolean);

      setOrders(normalized);
    } catch (err) {
      console.error("Failed to load orders:", err);
      setError("Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  // ====== FILTER BY DATE RANGE ======
const now = new Date();

const todayStart = new Date(
  now.getFullYear(),
  now.getMonth(),
  now.getDate(),
  0, 0, 0, 0
);

const todayKey =
  now.getFullYear() +
  "-" +
  String(now.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(now.getDate()).padStart(2, "0");


  let from = null;
  let to = null;
if (range === "today") {
  from = new Date(todayStart);
  to = new Date(todayStart);
  to.setHours(23, 59, 59, 999);


  }  else if (range === "7d") {
  from = new Date(todayStart);
  from.setDate(from.getDate() - 6);
  to = new Date(todayStart);
  to.setHours(23, 59, 59, 999);


  } else if (range === "30d") {
  from = new Date(todayStart);
  from.setDate(from.getDate() - 29);
  to = new Date(todayStart);
  to.setHours(23, 59, 59, 999);
}
 else if (range === "custom" && startDate && endDate) {
    from = new Date(startDate);
    from.setHours(0, 0, 0, 0);
    to = new Date(endDate);
    to.setHours(23, 59, 59, 999);
  } else {
    // "all time"
    from = null;
    to = null;
  }

  const filtered = orders.filter((o) => {
    if (!from || !to) return true; // ALL TIME
    if (!o._dt) return false;
    return o._dt >= from && o._dt <= to;
  });

  // ====== KPIs ======
  const totalRevenue = filtered.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = filtered.length;

  // Average revenue PER DAY (not per order)
  const uniqueDayKeys = new Set(
    filtered.filter((o) => o._dayKey).map((o) => o._dayKey)
  );
  const daysCount = uniqueDayKeys.size || 1;
  const avgRevenuePerDay =
    daysCount > 0
      ? Math.round((totalRevenue / daysCount) * 100) / 100
      : 0;

  const statusCounts = { COMPLETED: 0, IN_PROGRESS: 0, PENDING: 0 };
 filtered.forEach((o) => {
  let s = (o.status || "").toUpperCase();

  if (s === "SERVED") s = "COMPLETED";

  if (statusCounts[s] !== undefined) {
    statusCounts[s] += 1;
  }
});


  // ====== REVENUE BY DAY (bar chart data) ======
  const revenueByDay = {};
  filtered.forEach((o) => {
    if (!o._dayKey) return;
    const amt = Number(o.total || 0);
    revenueByDay[o._dayKey] = (revenueByDay[o._dayKey] || 0) + amt;
  });

  
 
  const dayKeys = Object.keys(revenueByDay).sort();
  // show up to last 14 days in chart (inside the selected range)
  let chartDays = dayKeys;

// 🔹 For "Today", show only today's bar
if (range === "today") {
  chartDays = dayKeys.filter((d) => d === todayKey);
}


// 🔹 For other ranges, limit bars nicely
else {
  chartDays = dayKeys.slice(-14);
}





  const maxRevenue =
    chartDays.length > 0
      ? chartDays.reduce(
          (max, k) =>
            revenueByDay[k] > max ? revenueByDay[k] : max,
          0
        )
      : 0;
  const maxBarHeight = 160; // px

  // ====== TOP ITEMS + ITEM STATS ======
  const itemMap = {};
  filtered.forEach((o) => {
    (o.items || []).forEach((it) => {
      const key = it.name || `#${it.menuItemId || "?"}`;
      if (!itemMap[key]) {
        itemMap[key] = {
          name: key,
          qty: 0,
          revenue: 0,
        };
      }
      const qty = it.qty ?? it.quantity ?? 1;
      const price = it.price ?? 0;
      itemMap[key].qty += qty;
      itemMap[key].revenue += qty * price;
    });
  });

  const topItems = Object.values(itemMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const totalItemsSold = Object.values(itemMap).reduce(
    (sum, it) => sum + it.qty,
    0
  );
  const totalDistinctItems = Object.keys(itemMap).length;

  // ====== UNIQUE CUSTOMERS (based on orders in this range) ======
  const uniqueCustomersSet = new Set(
    filtered
      .map(
        (o) =>
          o.customer ||
          o.customerName ||
          o.userName ||
          (o.userId != null ? `User ID: ${o.userId}` : null)
      )
      .filter(Boolean)
  );
  const uniqueCustomersCount = uniqueCustomersSet.size;

  // ====== RANGE LABEL (for UI and PDF) ======
  const rangeLabel =
    range === "today"
      ? "Today"
      : range === "7d"
      ? "Last 7 days"
      : range === "30d"
      ? "Last 30 days"
      : range === "custom"
      ? "Custom range"
      : "All time";

  // ====== BEAUTIFUL PDF DOWNLOAD (full report) ======
  function handleDownloadPdf() {
    if (!filtered.length) {
      alert("No orders in this range to export.");
      return;
    }

    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text("Admin Reports & Analytics", 14, 16);

    // Date range text
    let dateRangeText = rangeLabel;
    if (range === "custom" && startDate && endDate) {
      dateRangeText = `${startDate} to ${endDate}`;
    }

    doc.setFontSize(10);
    doc.text(`Date Range: ${dateRangeText}`, 14, 24);
    doc.text(`Generated At: ${new Date().toLocaleString()}`, 14, 30);

    // ===== OVERVIEW (KPIs) =====
    const overviewBody = [
      ["Total Revenue", formatPdfCurrency(totalRevenue)],
      ["Total Orders", totalOrders],
      ["Avg Revenue / Day", formatPdfCurrency(avgRevenuePerDay)],
      ["Unique Customers (based on orders)", uniqueCustomersCount],
      ["Total Items Sold", totalItemsSold],
      ["Total Distinct Items", totalDistinctItems],
    ];

    autoTable(doc, {
      startY: 38,
      head: [["Metric", "Value"]],
      body: overviewBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [255, 204, 128] }, // soft orange header
    });

    let finalY = doc.lastAutoTable.finalY || 38;

    // ===== STATUS SUMMARY =====
    const statusBody = [
      ["Completed", statusCounts.COMPLETED],
      ["In Progress", statusCounts.IN_PROGRESS],
      ["Pending", statusCounts.PENDING],
    ];

    autoTable(doc, {
      startY: finalY + 8,
      head: [["Status", "Count"]],
      body: statusBody,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [179, 229, 252] }, // soft blue header
    });

    finalY = doc.lastAutoTable.finalY || finalY + 20;

    // ===== REVENUE BY DAY (matches your chart) =====
    const revenueDayBody = chartDays.map((day) => {
      const value = revenueByDay[day] || 0;
      const d = new Date(day);
      const label = d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      });
      return [label, formatPdfCurrency(value)];
    });

    if (revenueDayBody.length) {
      autoTable(doc, {
        startY: finalY + 8,
        head: [["Day", "Revenue"]],
        body: revenueDayBody,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [200, 230, 201] }, // soft green header
      });

      finalY = doc.lastAutoTable.finalY || finalY + 20;
    }

    // ===== TOP ITEMS TABLE =====
    const topItemsBody = topItems.map((it, idx) => [
      idx + 1,
      it.name,
      it.qty,
      formatPdfCurrency(Math.round(it.revenue)),
    ]);

    if (topItemsBody.length) {
      autoTable(doc, {
        startY: finalY + 8,
        head: [["#", "Item", "Quantity", "Revenue"]],
        body: topItemsBody,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [255, 224, 178] }, // soft amber header
      });

      finalY = doc.lastAutoTable.finalY || finalY + 20;
    }

    // ===== DETAILED ORDERS TABLE =====
    const ordersBody = filtered.map((o) => {
      const itemsText = (o.items || [])
        .map((it) => `${it.qty ?? it.quantity ?? 1}x ${it.name}`)
        .join(" | ");

      return [
        o.id ?? "",
        o.customer || "",
        (o.status || "").toUpperCase(),
        formatPdfCurrency(o.total ?? 0),
        o.createdAt ? formatDateTime(o.createdAt) : "",
        itemsText,
      ];
    });

    autoTable(doc, {
      startY: finalY + 8,
      head: [
        [
          "Order ID",
          "Customer",
          "Status",
          "Total",
          "Placed At",
          "Items",
        ],
      ],
      body: ordersBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [224, 224, 224] },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 28 },
        2: { cellWidth: 18 },
        3: { cellWidth: 22 },
        4: { cellWidth: 30 },
        5: { cellWidth: 70 },
      },
    });

    // File name includes date range
    const fileName =
      range === "custom" && startDate && endDate
        ? `admin_report_${startDate}_to_${endDate}.pdf`
        : `admin_report_${range}.pdf`;

    doc.save(fileName);
  }

  return (
    <div className="min-h-screen pt-4 bg-gradient-to-b from-[#FFF5E1] via-[#FFF9F2] to-[#FFF]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* TOP BAR */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100 transition"
            >
              ⬅ Back to Admin Dashboard
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                Reports & Analytics
              </h1>
              <p className="text-xs text-gray-600 mt-1">
                Analyze orders, revenue, and top items. Current view:{" "}
                <span className="font-semibold">{rangeLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-700 text-white text-sm font-semibold shadow hover:bg-slate-800"
            >
              ⬇ Download PDF
            </button>
          </div>
        </div>

        {/* RANGE FILTERS */}
        <section className="card-section">
          <header className="section-header">
            <h3>Date Range</h3>
            <span>Filter numbers & charts</span>
          </header>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "today", label: "Today" },
                { key: "7d", label: "Last 7 days" },
                { key: "30d", label: "Last 30 days" },
                { key: "all", label: "All time" },
                { key: "custom", label: "Custom" },
              ].map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setRange(btn.key)}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    range === btn.key
                      ? "bg-amber-600 border-amber-600 text-white"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-amber-50"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {range === "custom" && (
              <div className="flex flex-wrap gap-3 items-center text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">From</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded-lg px-2 py-1 text-xs"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">To</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded-lg px-2 py-1 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* LOADING / ERROR */}
        {loading && (
          <div className="card-section text-sm text-gray-500">
            Loading orders...
          </div>
        )}
        {error && !loading && (
          <div className="card-section text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* KPI CARDS */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="stat-card bg-emerald-600">
                <span>Total Revenue</span>
                <strong>₹{totalRevenue.toLocaleString()}</strong>
              </div>
              <div className="stat-card bg-amber-500">
                <span>Total Orders</span>
                <strong>{totalOrders}</strong>
              </div>
              <div className="stat-card bg-blue-500">
                <span>Avg. Revenue / Day</span>
                <strong>₹{avgRevenuePerDay.toLocaleString()}</strong>
              </div>
            </section>

            {/* REVENUE CHART + STATUS SUMMARY */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* BAR CHART */}
              <div className="card-section lg:col-span-2">
                <header className="section-header">
                  <h3>Revenue by Day</h3>
                  <span>
                    {chartDays.length > 0
                      ? `Showing ${chartDays.length} day(s) in this range`
                      : "No orders in this range"}
                  </span>
                </header>

                {chartDays.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4">
                    No revenue data to display for this range.
                  </div>
                ) : (
                  <div className="h-48 flex items-end gap-3 border border-gray-200 rounded-2xl px-4 py-4 bg-white overflow-x-auto">
                    {chartDays.map((day) => {
                      const value = revenueByDay[day] || 0;
                      const height =
                        maxRevenue > 0
                          ? Math.max(
                              10,
                              (value / maxRevenue) * maxBarHeight
                            )
                          : 0;
                      const d = new Date(day);
                      const label = d.toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      });

                      return (
                        <div
                          key={day}
                          className="flex flex-col items-center gap-1 min-w-[28px]"
                        >
                          {/* bar */}
                          <div
                            className="w-3 md:w-4 rounded-t-full bg-emerald-300 border border-emerald-400"
                            style={{ height: `${height}px` }}
                          />
                          {/* value */}
                          <div className="text-[10px] text-gray-700">
                            ₹{value.toLocaleString()}
                          </div>
                          {/* date */}
                          <div className="text-[10px] text-gray-500 whitespace-nowrap">
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* STATUS SUMMARY */}
              <div className="card-section">
                <header className="section-header">
                  <h3>Status Summary</h3>
                  <span>Orders in this range</span>
                </header>

                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <span>Completed</span>
                    <span className="font-semibold">
                      {statusCounts.COMPLETED}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>In Progress</span>
                    <span className="font-semibold">
                      {statusCounts.IN_PROGRESS}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending</span>
                    <span className="font-semibold">
                      {statusCounts.PENDING}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t text-xs text-gray-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>Unique Customers</span>
                      <span className="font-semibold">
                        {uniqueCustomersCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Total Items Sold</span>
                      <span className="font-semibold">
                        {totalItemsSold}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Distinct Items</span>
                      <span className="font-semibold">
                        {totalDistinctItems}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* TOP ITEMS TABLE */}
            <section className="card-section">
              <header className="section-header">
                <h3>Top Selling Items</h3>
                <span>Based on quantity ordered</span>
              </header>

              {topItems.length === 0 ? (
                <div className="text-sm text-gray-500 py-4">
                  No item data for this range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] text-gray-500 border-b">
                        <th className="py-2 pr-4">Item</th>
                        <th className="py-2 pr-4">Quantity</th>
                        <th className="py-2 pr-4">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topItems.map((it, idx) => (
                        <tr
                          key={it.name}
                          className="border-b last:border-0"
                        >
                          <td className="py-2 pr-4 flex items-center gap-2">
                            <span className="text-[11px] text-gray-400">
                              #{idx + 1}
                            </span>
                            <span className="font-medium text-gray-800">
                              {it.name}
                            </span>
                          </td>
                          <td className="py-2 pr-4">{it.qty}</td>
                          <td className="py-2 pr-4">
                            ₹{Math.round(it.revenue).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* local styles, same style system as other admin pages */}
      <style>{`
        .stat-card {
          padding: 16px 18px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08);
          color: white;
        }
        .stat-card span {
          font-size: 12px;
          opacity: 0.9;
        }
        .stat-card strong {
          font-size: 22px;
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




