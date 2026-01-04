// src/pages/UserDashboard/BookTablePage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SLOTS = [
  { id: "morning", label: "Morning (9 AM – 12 PM)" },
  { id: "afternoon", label: "Afternoon (12 PM – 4 PM)" },
  { id: "evening", label: "Evening (4 PM – 9 PM)" },
];

export default function BookTablePage({ showToast, onBooked, checkAvailability: parentCheck }) {
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("morning");
  const [guests, setGuests] = useState(2);
  const [loading, setLoading] = useState(false);

  const [bookedTables, setBookedTables] = useState([]);
const [selectedTable, setSelectedTable] = useState(null);

  const [availability, setAvailability] = useState({
    capacity: null,
    booked: null,
    remaining: null,
    loading: false,
    lastCheckedAt: null,
  });

  const nav = useNavigate();

  function isPastDate(d) {
    const pick = new Date(d); pick.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    return pick < today;
  }
    function isSlotInPastForSelectedDate(dateStr, slotId) {
    if (!dateStr) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const selected = new Date(dateStr);
    if (Number.isNaN(selected.getTime())) return false;
    selected.setHours(0, 0, 0, 0);

    // If selected day is before today → definitely past
    if (selected < today) return true;

    // If it's a future day → always OK
    if (selected > today) return false;

    // 👇 Same day – check slot end time vs current time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let endMinutes;
    if (slotId === "morning") endMinutes = 12 * 60;   // 12:00
    else if (slotId === "afternoon") endMinutes = 16 * 60; // 16:00
    else if (slotId === "evening") endMinutes = 21 * 60;   // 21:00
    else return false;

    // If current time is past the slot end → slot is over
    return currentMinutes >= endMinutes;
  }


  // local check (keeps content-type guard)
  async function localCheckAvailability() {
    if (!date) { showToast?.("Choose a date first", "error"); return null; }
    setAvailability(s => ({ ...s, loading: true }));
    try {
      const url = `http://localhost:8080/reservations/availability?date=${encodeURIComponent(date)}&slot=${encodeURIComponent(slot)}`;
      const res = await fetch(url, { method: "GET" });
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("text/html")) {
        const body = await res.text();
        console.error("HTML returned (expected JSON):", body.slice(0,300));
        showToast?.("Server returned HTML instead of JSON", "error");
        setAvailability({ capacity: null, booked: null, remaining: null, loading: false, lastCheckedAt: null });
        return null;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        showToast?.(data?.error || data?.message || `${res.status} ${res.statusText}`, "error");
        setAvailability({ capacity: null, booked: null, remaining: null, loading: false, lastCheckedAt: null });
        return null;
      }
      const normalized = {
        capacity: data.capacity ?? null,
        booked: data.booked ?? null,
        remaining: data.remaining ?? (typeof data.capacity === "number" && typeof data.booked === "number" ? data.capacity - data.booked : null),
        loading: false,
        lastCheckedAt: new Date().toISOString(),
      };
      setAvailability(normalized);
      showToast?.("Availability updated", "info");
      return normalized;
    } catch (err) {
      console.error("Availability check failed:", err);
      showToast?.("Network error while checking availability", "error");
      setAvailability({ capacity: null, booked: null, remaining: null, loading: false, lastCheckedAt: null });
      return null;
    }
  }
  async function loadBookedTables() {
  if (!date || !slot) return;

  const res = await fetch(
    `http://localhost:8080/reservations/booked-tables?date=${date}&slot=${slot}`
  );
  const data = await res.json();
  setBookedTables(data || []);
}


  // wrapper — prefer parentCheck if provided, but fall back to local
  async function handleCheckAvailability() {
    if (!date) { showToast?.("Choose a date first", "error"); return null; }
    if (isSlotInPastForSelectedDate(date, slot)) {
      showToast?.(
        "Selected date / time slot has already passed. Please choose another date or slot.",
        "error"
      );
      setAvailability({
        capacity: null,
        booked: null,
        remaining: null,
        loading: false,
        lastCheckedAt: null,
      });
      return null;
    }

    setAvailability((s) => ({ ...s, loading: true }));
    if (typeof parentCheck === "function") {
      try {
        const res = await parentCheck({ date, timeSlot: slot, partySize: guests });
        // Normalize the parent response if it's raw data
        if (!res) return await localCheckAvailability();
        if (res.ok === false) {
          showToast?.(res.error?.message || "Availability check failed", "error");
          setAvailability({ capacity: null, booked: null, remaining: null, loading: false, lastCheckedAt: null });
          return null;
        }
        const d = res.data ?? res;
        const normalized = {
          capacity: d.capacity ?? d.capacity,
          booked: d.booked ?? d.booked,
          remaining: d.remaining ?? (typeof d.capacity === "number" && typeof d.booked === "number" ? d.capacity - d.booked : null),
          loading: false,
          lastCheckedAt: new Date().toISOString(),
        };
        setAvailability(normalized);
        await loadBookedTables(); 
        showToast?.("Availability updated", "info");
        return normalized;
      } catch (err) {
        console.error("parentCheck failed — fallback to local", err);
        return await localCheckAvailability();
      }
    }
    return await localCheckAvailability();
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!date) { showToast?.("Please choose a date", "error"); return; }
    if (isPastDate(date)) { showToast?.("Please choose today or a future date", "error"); return; }
        if (isSlotInPastForSelectedDate(date, slot)) {
      showToast?.(
        "Selected time slot has already passed for today. Please choose another slot.",
        "error"
      );
      return;
    }

    if (guests < 1) { showToast?.("Guests must be at least 1", "error"); return; }

    // ✅ make sure user is logged in & has id
    const rawUser = localStorage.getItem("user");
    if (!rawUser) {
      showToast?.("Please login before booking a table", "error");
      nav("/login");
      return;
    }
    let user = null;
    try {
      user = JSON.parse(rawUser);
    } catch {
      showToast?.("Login data is corrupted. Please login again.", "error");
      nav("/login");
      return;
    }

    const userId = user?.id ?? user?.ID ?? null;
    if (!userId) {
      showToast?.("User information missing. Please login again.", "error");
      nav("/login");
      return;
    }

    if (availability.lastCheckedAt && availability.remaining !== null && availability.remaining <= 0) {
      showToast?.("Selected slot is full. Choose another slot or date.", "error"); return;
    }

    let freshAv = availability;
    if (!availability.lastCheckedAt) {
      freshAv = await handleCheckAvailability();
      if (freshAv === null) return;
      if (freshAv.remaining !== null && freshAv.remaining <= 0) {
        showToast?.("Selected slot is full. Choose another slot or date.", "error"); return;
      }
    }
   if (!selectedTable) {
  showToast?.("Please select a table", "error");
  return;
}

    setLoading(true);
    try {
      const body = {
        userId,
        userName: user?.name || user?.username || "",
        userEmail: user?.email || "",
        date,
        slot,
        guests,
         tableNumber: selectedTable,
        status: "CONFIRMED", // ✅ explicit status
      };

      const res = await fetch("http://localhost:8080/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("text/html")) {
        const text = await res.text();
        console.error("Booking endpoint returned HTML:", text.slice(0,300));
        showToast?.("Server returned HTML for booking — check backend.", "error");
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast?.(data?.error || data?.message || "Booking failed", "error");
        setLoading(false);
        return;
      }

      showToast?.("Reservation confirmed!", "success");
      if (typeof onBooked === "function") onBooked(data);
      nav("/dashboard/bookings", { replace: true });
    } catch (err) {
      console.error("Booking failed:", err);
      showToast?.("Network error while booking", "error");
    } finally {
      setLoading(false);
    }
  }

  function AvailabilityBadge() {
    if (availability.loading) return <span className="text-sm text-gray-500">Checking...</span>;
    if (!availability.lastCheckedAt) return <span className="text-sm text-gray-500">Not checked</span>;
    if (availability.remaining === null) return <span className="text-sm text-gray-500">—</span>;
    if (availability.remaining <= 0) return <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-red-50 text-red-700 border border-red-100">Sold out</span>;
    if (availability.remaining <= 5) return <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-amber-50 text-amber-800 border border-amber-100">{availability.remaining} left</span>;
    return <span className="inline-block px-2 py-1 text-xs font-semibold rounded bg-green-50 text-green-800 border border-green-100">Available</span>;
  }

  return (
    <div
      className="fixed inset-0 w-full h-full flex justify-center items-start overflow-auto pt-24"
      style={{ backgroundImage: "url('/bgboobg.jpg')", backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "center center" }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg mx-auto">
        {/* MAIN BOOKING CARD */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-amber-100 overflow-hidden">
          <div className="p-4 md:p-5">
            <form onSubmit={handleSubmit} aria-label="Book a table">
              <div className="mb-2">
                <h1 className="text-2xl text-center font-extrabold text-gray-900">Reserve your spot</h1>
                <p className="text-sm text-center text-gray-600 mt-1">Choose date, time and party size — quick & simple.</p>
              </div>

              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => { setDate(e.target.value); setAvailability({ capacity: null, booked: null, remaining: null, loading: false, lastCheckedAt: null }); }}
                className="w-full mt-2 mb-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-300 bg-white"
              />

              <label className="block text-sm font-medium text-gray-700">Time slot</label>
              <select
                value={slot}
                onChange={(e) => { setSlot(e.target.value); setAvailability({ capacity: null, booked: null, remaining: null, loading: false, lastCheckedAt: null }); }}
                className="w-full mt-2 mb-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-300 bg-white"
              >
                {SLOTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>

              <label className="block text-sm font-medium text-gray-700">Guests</label>
              <div className="flex items-center gap-2 mt-2 mb-3">
                <button type="button" onClick={() => setGuests(g => Math.max(1, g - 1))} className="w-9 h-9 rounded-lg border bg-white">−</button>
                <div className="px-4 py-2 border rounded-lg">{guests}</div>
                <button type="button" onClick={() => setGuests(g => Math.min(20, g + 1))} className="w-9 h-9 rounded-lg border bg-white">+</button>
                <div className="ml-auto text-sm text-gray-500">
                  {availability.lastCheckedAt && availability.remaining !== null ? `${availability.remaining} seats left` : ""}
                </div>
              </div>
              {availability.lastCheckedAt && (
  <>
    <label className="block text-sm font-medium text-gray-700 mt-3">
      Select Table
    </label>

    <div className="grid grid-cols-5 gap-3 mt-2 mb-4">
      {[1,2,3,4,5,6,7,8,9,10].map((t) => {
        const isBooked = bookedTables.includes(t);

        return (
          <button
            key={t}
            type="button"
            disabled={isBooked}
            onClick={() => setSelectedTable(t)}
            className={`py-3 rounded-xl text-sm font-semibold border transition-all
              ${
                isBooked
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : selectedTable === t
                  ? "bg-amber-700 text-white scale-105 shadow-lg"
                  : "bg-white hover:bg-amber-50 hover:scale-105"
              }`}
          >
            <div className="text-sm font-bold">T{t}</div>
{isBooked && <div className="text-[10px] opacity-70">Booked</div>}

          </button>
        );
      })}
    </div>
  </>
)}



              <div className="flex gap-3 mb-1">
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  disabled={availability.loading}
                  className="flex-1 py-3 rounded-lg border border-amber-300 text-amber-800 bg-white hover:bg-amber-50 font-semibold"
                >
                  {availability.loading ? "Checking..." : "Check"}
                </button>

                <button
                  type="submit"
                  disabled={loading || (availability.lastCheckedAt && availability.remaining !== null && availability.remaining <= 0)}
                  className={`flex-1 py-3 rounded-lg text-white font-semibold ${loading ? "opacity-60 bg-amber-700" : "bg-amber-700 hover:bg-amber-800"}`}
                >
                  {loading ? "Booking..." : "Confirm"}
                </button>
              </div>

              {availability.lastCheckedAt === null ? (
                <div className="mt-1 text-xs text-gray-500">Tip: click "Check" to confirm seats for your selected slot.</div>
              ) : null}
            </form>
          </div>

          <div className="px-4 py-2 border-t border-amber-50 text-xs text-gray-500 text-center">
            Need help? Reach out to support or call the cafe.
          </div>
        </div>

        {/* desktop availability card */}
        <div className={`hidden md:block absolute top-0 left-full ml-6 w-64 ${availability.lastCheckedAt ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-300`}>
          <div className="rounded-xl p-4 bg-white shadow-2xl border border-amber-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-amber-800">Availability</h3>
                <p className="text-xs text-gray-500">Selected slot details</p>
              </div>
              <div className="text-xs text-gray-400">
                {availability.lastCheckedAt ? new Date(availability.lastCheckedAt).toLocaleString() : ""}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="text-xs text-gray-500">Capacity</div>
                <div className="text-lg font-semibold text-amber-700">{availability.capacity ?? "—"}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Booked</div>
                <div className="text-lg font-semibold text-gray-700">{availability.booked ?? "—"}</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">Status</div>
                <AvailabilityBadge />
              </div>
            </div>
          </div>
        </div>

        {/* mobile availability card */}
        <div className={`block md:hidden mt-4 w-full max-w-md mx-auto ${availability.lastCheckedAt ? "opacity-100" : "opacity-0 pointer-events-none"} transition-opacity duration-300`}>
          <div className="rounded-lg p-3 bg-white shadow-lg border border-amber-100">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-amber-800">Availability</h3>
                <p className="text-xs text-gray-500">Selected slot details</p>
              </div>
              <div className="text-xs text-gray-400">
                {availability.lastCheckedAt ? new Date(availability.lastCheckedAt).toLocaleString() : ""}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-xs text-gray-500">Capacity</div>
              <div className="text-base font-semibold text-amber-700">{availability.capacity ?? "—"}</div>

              <div className="text-xs text-gray-500 mt-2">Booked</div>
              <div className="text-base font-semibold text-gray-700">{availability.booked ?? "—"}</div>

              <div className="flex items-center gap-2 mt-3">
                <div className="text-xs text-gray-500">Status</div>
                <AvailabilityBadge />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}



