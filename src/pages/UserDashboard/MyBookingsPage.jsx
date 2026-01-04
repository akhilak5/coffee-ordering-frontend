// src/pages/UserDashboard/MyBookingsPage.jsx
import React, { useEffect, useState } from "react";

/**
 * Convert slot id to human-friendly label/time
 */
function slotLabel(slot) {
  switch (slot) {
    case "morning": return "Morning (9:00 — 12:00)";
    case "afternoon": return "Afternoon (12:00 — 16:00)";
    case "evening": return "Evening (16:00 — 21:00)";
    default: return slot || "—";
  }
}

export default function MyBookingsPage({ showToast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadBookings() {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user?.id) {
        setBookings([]);
        return;
      }

      const res = await fetch(`http://localhost:8080/reservations/my?userId=${user.id}`, { method: "GET" });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) {
        const html = await res.text();
        console.error("Unexpected HTML from bookings endpoint:", html.slice(0, 200));
        showToast?.("Server returned HTML for bookings — check backend.", "error");
        setBookings([]);
        return;
      }

      const data = await res.json().catch(() => ([]));
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load bookings", err);
      showToast?.("Could not load bookings", "error");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBookings(); }, []);

  return (
    <div className="p-6">
      {/* Breadcrumb / location */}
      <div className="mb-6">
        <div className="text-sm text-gray-500">Dashboard <span className="mx-2">›</span> <span className="font-semibold text-gray-800">My Bookings</span></div>
      </div>

      <h2 className="text-2xl font-semibold mb-4">My Bookings</h2>

      {loading && <div className="text-gray-500 mb-4">Loading bookings…</div>}

      {bookings.length === 0 ? (
        <div className="text-gray-500">You have no bookings yet.</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reservation ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slot / Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guests</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
  Table
</th>

              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-800 font-medium">#{b.id}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{b.date}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{slotLabel(b.slot)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{b.guests}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${b.status === "CANCELLED" ? "bg-amber-100 text-amber-800" :
                        (b.status === "CONFIRMED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800")}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
  {b.tableNumber ? (
    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full
      bg-indigo-100 text-indigo-700 text-xs font-semibold">
      Table {b.tableNumber}
    </span>
  ) : (
    <span className="text-xs text-gray-400">—</span>
  )}
</td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


