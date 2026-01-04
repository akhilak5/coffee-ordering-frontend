// src/pages/StaffPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const ROLE_OPTIONS = [
  { value: "CHEF", label: "Chef" },
  { value: "WAITER", label: "Waiter" },
];

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "WAITER",
  });
  const [saving, setSaving] = useState(false);

  // 🔁 Load staff from backend on mount
  useEffect(() => {
    async function loadStaff() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("http://localhost:8080/staff/all");
        if (!res.ok) throw new Error("Failed to load staff");
        const data = await res.json();
        setStaff(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load staff:", err);
        setError("Failed to load staff list");
      } finally {
        setLoading(false);
      }
    }
    loadStaff();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ➕ Invite staff (calls /staff/invite → sends email + saves in DB)
  async function handleAddStaff(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      };

      const res = await fetch("http://localhost:8080/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        console.error("Invite error:", data);
        alert(data.error || "Failed to invite staff member");
        return;
      }

      // add/replace in list
      setStaff((prev) => {
        const others = prev.filter((s) => s.id !== data.id);
        return [data, ...others];
      });

      setForm({ name: "", email: "", role: "WAITER" });
      alert("Invitation email sent to " + data.email);
    } catch (err) {
      console.error("Failed to invite staff:", err);
      alert("Failed to invite staff member");
    } finally {
      setSaving(false);
    }
  }

  // 🔁 Toggle ACTIVE / INACTIVE
  async function toggleStatus(id, currentStatus) {
    const next =
      currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      const res = await fetch(
        `http://localhost:8080/staff/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || "Failed to update status");
        return;
      }

      setStaff((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, status: data.status } : s
        )
      );
    } catch (err) {
      console.error("Failed to update staff status:", err);
      alert("Failed to update staff status");
    }
  }
    // ❌ Remove staff completely (admin can invite again later)
  async function handleRemoveStaff(id) {
    const ok = window.confirm(
      "Remove this staff member?\nThey won't be able to login unless invited again."
    );
    if (!ok) return;

    try {
      const res = await fetch(`http://localhost:8080/staff/${id}`, {
        method: "DELETE",
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok || data.error) {
        alert(data.error || "Failed to remove staff member");
        return;
      }

      // remove from list in UI
      setStaff((prev) => prev.filter((s) => s.id !== id));
      alert("Staff removed successfully");
    } catch (err) {
      console.error("Failed to remove staff:", err);
      alert("Failed to remove staff member");
    }
  }


  // derived stats
  const totalStaff = staff.length;
  const activeStaff = staff.filter(
    (s) => s.status === "ACTIVE"
  ).length;
  const chefsCount = staff.filter((s) => s.role === "CHEF").length;
  const waitersCount = staff.filter((s) => s.role === "WAITER").length;

  function prettyDate(d) {
    if (!d) return "—";
    try {
      const date = new Date(d);
      if (Number.isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString();
    } catch {
      return String(d);
    }
  }

  return (
    <div className="min-h-screen pt-8 bg-gradient-to-b from-[#FFF5E1] via-[#FFF9F2] to-[#FFF]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Top bar: back link */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100 transition"
            >
              ⬅ Back to Admin Dashboard
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Staff Management
            </h1>
          </div>
          <span className="hidden sm:inline-block text-xs px-3 py-1 rounded-full bg-amber-700 text-white font-semibold">
            👨‍🍳 Manage chefs & waiters
          </span>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="stat-card bg-emerald-600">
            <span>Total Staff</span>
            <strong>{totalStaff}</strong>
          </div>
          <div className="stat-card bg-blue-500">
            <span>Active Staff</span>
            <strong>{activeStaff}</strong>
          </div>
          <div className="stat-card bg-amber-500">
            <span>Chefs</span>
            <strong>{chefsCount}</strong>
          </div>
          <div className="stat-card bg-purple-500">
            <span>Waiters</span>
            <strong>{waitersCount}</strong>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* STAFF TABLE */}
          <section className="card-section lg:col-span-2">
            <header className="section-header">
              <h3>Current Staff</h3>
              <span>View & update roles</span>
            </header>

            {loading ? (
              <div className="text-sm text-gray-500 py-4">
                Loading staff...
              </div>
            ) : error ? (
              <div className="text-sm text-red-600 py-4">
                {error}
              </div>
            ) : staff.length === 0 ? (
              <div className="text-sm text-gray-500 py-4">
                No staff members yet. Use the form on the right to add one.
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* header */}
                <div className="hidden md:grid grid-cols-5 gap-4 px-4 py-2 text-[11px] font-semibold text-gray-500 border-b bg-gray-50">
                  <div>Name</div>
                  <div>Email</div>
                  <div>Role</div>
                  <div>Status</div>
                  <div className="text-right">Joined</div>
                </div>

                {/* rows */}
                <div className="divide-y">
                  {staff.map((s) => (
                    <div
                      key={s.id}
                      className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-4 px-4 py-3 items-center hover:bg-gray-50 transition"
                    >
                      <div className="text-sm font-semibold text-gray-900">
                        {s.name}
                      </div>
                      <div className="text-xs md:text-sm text-gray-700 truncate">
                        {s.email}
                      </div>
                      <div className="text-xs font-medium text-gray-700">
                        {s.role === "CHEF" ? "Chef" : "Waiter"}
                      </div>
                      <div className="flex items-center gap-2">
  {/* status chip */}
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold border ${
      s.status === "ACTIVE"
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : s.status === "INVITED"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-slate-50 text-slate-700 border-slate-200"
    }`}
  >
    ●{" "}
    {s.status === "ACTIVE"
      ? "Active"
      : s.status === "INVITED"
      ? "Invited"
      : "Inactive"}
  </span>

  {/* Activate / Deactivate */}
  {s.status !== "INVITED" && (
    <button
      type="button"
      onClick={() => toggleStatus(s.id, s.status)}
      className="text-[10px] px-2 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
    >
      {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
    </button>
  )}

  {/* Remove button – pushed to the right with ml-auto */}
  <button
    type="button"
    onClick={() => handleRemoveStaff(s.id)}
    className="ml-auto text-[10px] px-3 py-1 rounded-full border border-red-200 text-red-600 hover:bg-red-50"
  >
    Remove
  </button>
</div>

                      <div className="text-xs text-gray-500 text-right">
                        {prettyDate(s.joinedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ADD STAFF FORM */}
          <section className="card-section">
            <header className="section-header">
              <h3>Add Staff Member</h3>
              <span>Send invite to Chef / Waiter</span>
            </header>

            <form className="space-y-4" onSubmit={handleAddStaff}>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. ramesh@cafe.com"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Role
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={
                  saving ||
                  !form.name.trim() ||
                  !form.email.trim()
                }
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-amber-700 text-white text-sm font-semibold shadow hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Sending invite..." : "Add Staff Member"}
              </button>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                When you add a staff member, an invitation email with a
                code and activation link will be sent to them. After they
                activate, their status changes from <b>Invited</b> to{" "}
                <b>Active</b>.
              </p>
            </form>
          </section>
        </div>
      </div>

      {/* local styles */}
      <style>{`
        .stat-card {
          color: white;
          padding: 16px 18px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.12);
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
          margin-bottom: 16px;
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
