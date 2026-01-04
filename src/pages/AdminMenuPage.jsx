// src/pages/AdminMenuPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function AdminMenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    img: "",
    category: "HOT",
    available: true, // NEW
  });
  const [saving, setSaving] = useState(false);

  // 🔍 NEW: search text for menu list
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://localhost:8080/menu");
      if (!res.ok) throw new Error("Failed to load menu");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load menu:", err);
      setError("Failed to load menu items");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (name === "available") {
      // handle checkbox / select boolean
      const boolVal =
        type === "checkbox"
          ? checked
          : value === "true" || value === true || value === "AVAILABLE";
      setForm((prev) => ({ ...prev, available: boolVal }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  // 📁 NEW: handle file upload → base64 string into form.img
  function handleImageFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result; // data:image/..;base64,xxxx
      setForm((prev) => ({ ...prev, img: base64 || "" }));
    };
    reader.readAsDataURL(file);
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name || "",
      description: item.description || "",
      price: item.price != null ? String(item.price) : "",
      img: item.img || "",
      category: item.category || "HOT",
      // if backend doesn’t have this yet, treat undefined as true
      available: item.available !== false,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      name: "",
      description: "",
      price: "",
      img: "",
      category: "HOT",
      available: true,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !String(form.price).trim()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      img: form.img.trim() || null,
      price: Number(form.price),
      category: form.category,
      available: form.available, // NEW
    };

    setSaving(true);
    try {
      const url = editingId
        ? `http://localhost:8080/menu/${editingId}`
        : "http://localhost:8080/menu";

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.error)) {
        alert(
          data?.error || `Failed to ${editingId ? "update" : "create"} menu item`
        );
        return;
      }

      const saved = data || payload;

      if (editingId) {
        setItems((prev) =>
          prev.map((it) => (it.id === saved.id ? saved : it))
        );
      } else {
        setItems((prev) => [saved, ...prev]);
      }

      resetForm();
    } catch (err) {
      console.error("Failed to save menu item:", err);
      alert(`Failed to ${editingId ? "update" : "create"} menu item`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this menu item?")) return;

    try {
      const res = await fetch(`http://localhost:8080/menu/${id}`, {
        method: "DELETE",
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        // ignore if no JSON
      }

      if (!res.ok || (data && data.error)) {
        alert(data?.error || "Failed to delete menu item");
        return;
      }

      setItems((prev) => prev.filter((it) => it.id !== id));

      // If we were editing this item, reset form
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("Failed to delete menu item:", err);
      alert("Failed to delete menu item");
    }
  }

  const statsByCategory = ["HOT", "COLD", "SNACKS"].map((cat) => ({
    key: cat,
    label:
      cat === "HOT" ? "Hot Coffee" : cat === "COLD" ? "Cold Coffee" : "Snacks",
    count: items.filter((i) => i.category === cat).length,
  }));

  // 🔍 NEW: filtered list for table based on search text
  const searchText = search.trim().toLowerCase();
  const tableItems =
    !searchText
      ? items
      : items.filter((it) => {
          const name = (it.name || "").toLowerCase();
          const desc = (it.description || "").toLowerCase();
          return (
            name.includes(searchText) ||
            desc.includes(searchText)
          );
        });

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
              Menu Management
            </h1>
          </div>
          <span className="hidden sm:inline-block text-xs px-3 py-1 rounded-full bg-amber-700 text-white font-semibold">
            🍽️ Manage coffees & snacks
          </span>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statsByCategory.map((s) => (
            <div key={s.key} className="stat-card bg-white text-amber-900">
              <span>{s.label}</span>
              <strong>{s.count}</strong>
            </div>
          ))}
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* MENU TABLE */}
          <section className="card-section lg:col-span-2">
            <header className="section-header">
              <h3>Current Menu</h3>
              <span>Items visible to customers</span>
            </header>

            {/* 🔍 NEW: search box */}
            <div className="mb-3 flex justify-between items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by item name or description..."
                className="w-full max-w-sm border rounded-full px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {loading ? (
              <div className="text-sm text-gray-500 py-4">
                Loading menu items...
              </div>
            ) : error ? (
              <div className="text-sm text-red-600 py-4">{error}</div>
            ) : tableItems.length === 0 ? (
              <div className="text-sm text-gray-500 py-4">
                No menu items found. Try changing the search or add a new item on the right.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="hidden md:grid grid-cols-7 gap-4 px-4 py-2 text-[11px] font-semibold text-gray-500 border-b bg-gray-50">
                  <div>Name</div>
                  <div>Category</div>
                  <div>Price</div>
                  <div>Status</div> {/* NEW */}
                  <div>Description</div>
                  <div>Image</div>
                  <div className="text-right">Actions</div>
                </div>

                <div className="divide-y">
                  {tableItems.map((it) => {
                    const isOut = it.available === false;
                    return (
                      <div
                        key={it.id}
                        className="grid grid-cols-1 md:grid-cols-7 gap-2 md:gap-4 px-4 py-3 items-center hover:bg-gray-50 transition"
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

                        {/* Status pill */}
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

                        <div className="text-xs text-gray-600 line-clamp-2">
                          {it.description || "—"}
                        </div>
                        <div className="flex justify-start md:justify-center">
                          {it.img ? (
                            <img
                              src={it.img}
                              onError={(e) =>
                                (e.target.src = "/menu-placeholder.jpg")
                              }
                              alt={it.name}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                            />
                          ) : (
                            <span className="text-xs text-gray-400">
                              No image
                            </span>
                          )}
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(it)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(it.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* ADD / EDIT MENU ITEM FORM */}
          <section className="card-section">
            <header className="section-header">
              <h3>{editingId ? "Edit Menu Item" : "Add Menu Item"}</h3>
              <span>
                {editingId
                  ? "Update existing coffee or snack"
                  : "Create new coffee or snack"}
              </span>
            </header>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Hazelnut Latte"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Short description of the drink or snack"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Price (₹)
                </label>
                <input
                  type="number"
                  name="price"
                  value={form.price}
                  onChange={handleChange}
                  min="0"
                  step="1"
                  placeholder="e.g. 150"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Category
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="HOT">Hot Coffee</option>
                  <option value="COLD">Cold Coffee</option>
                  <option value="SNACKS">Snacks</option>
                </select>
              </div>

              {/* Availability */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Availability
                </label>
                <select
                  name="available"
                  value={form.available ? "true" : "false"}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="true">Available</option>
                  <option value="false">Out of stock</option>
                </select>
              </div>

              {/* Image URL */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Image URL (optional)
                </label>
                <input
                  type="text"
                  name="img"
                  value={form.img}
                  onChange={handleChange}
                  placeholder="/menu-hazelnut.jpg or base64"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              {/* 📁 NEW: Image upload from device */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Or upload image from your device
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFile}
                  className="w-full text-xs"
                />
                <p className="text-[10px] text-gray-500">
                  Selected image will be stored as base64 in the <b>Image</b> field above and shown in menu.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    saving || !form.name.trim() || !String(form.price).trim()
                  }
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-amber-700 text-white text-sm font-semibold shadow hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving
                    ? editingId
                      ? "Saving changes..."
                      : "Adding..."
                    : editingId
                    ? "Save changes"
                    : "Add Menu Item"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-full border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                )}
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                These items are also visible in the customer dashboard under{" "}
                <b>Menu</b>. Any changes you make here are reflected for users
                immediately.
              </p>
            </form>
          </section>
        </div>
      </div>

      {/* local styles */}
      <style>{`
        .stat-card {
          padding: 16px 18px;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.08);
        }
        .stat-card span {
          font-size: 12px;
          opacity: 0.8;
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

