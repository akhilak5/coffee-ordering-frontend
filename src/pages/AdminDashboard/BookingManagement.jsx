// src/pages/Admin/BookingManagement.jsx
import React, { useEffect, useState } from "react";

export default function BookingManagement() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    try {
      const res = await fetch("http://localhost:8080/reservations/all", {
        method: "GET",
      });

      if (!res.ok) {
        console.error("Failed to load reservations:", res.status);
        setBookings([]);
        return;
      }

      const data = await res.json();
      console.log("Admin bookings:", data); // debug
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed loading reservations:", err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  // 👇 updateStatus removed – bookings are read-only now

  if (loading) {
    return <div className="p-6 text-gray-500">Loading bookings...</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md border border-amber-100">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Booking Management
      </h2>

      {bookings.length === 0 ? (
        <div className="text-gray-500">No bookings available.</div>
      ) : (
        <div className="overflow-auto max-h-[500px] border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">User ID</th>
                <th className="p-3 text-left">Name</th>
                {/* Email removed from columns */}
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Slot</th>
                <th className="p-3 text-center">Guests</th>
                <th className="p-3 text-center">Status</th>
                {/* Actions column removed */}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const slot =
                  (b.slot || "").toLowerCase() === "morning"
                    ? "Morning (9–12)"
                    : (b.slot || "").toLowerCase() === "afternoon"
                    ? "Afternoon (12–4)"
                    : (b.slot || "").toLowerCase() === "evening"
                    ? "Evening (4–9)"
                    : b.slot || "—";

                return (
                  <tr key={b.id} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-800">#{b.id}</td>
                    <td className="p-3 text-gray-700">
                      {b.userId != null ? b.userId : "—"}
                    </td>
                    <td className="p-3 text-gray-700">
                      {b.userName || "—"}
                    </td>
                    {/* Email cell removed */}
                    <td className="p-3 text-gray-700">{b.date}</td>
                    <td className="p-3 text-gray-700">{slot}</td>
                    <td className="p-3 text-gray-700 text-center">
                      {b.guests}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${
                            b.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-700"
                              : b.status === "CANCELLED"
                              ? "bg-red-100 text-red-700"
                              : b.status === "CONFIRMED"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }
                        `}
                      >
                        {b.status}
                      </span>
                    </td>
                    {/* Action <select> column removed */}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}







