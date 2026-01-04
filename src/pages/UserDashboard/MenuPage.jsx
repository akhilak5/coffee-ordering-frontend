// src/pages/MenuPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMenu } from "../../services/menuService";

export default function MenuPage({ addToCart, showToast }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
    const navigate = useNavigate();

  const [filter, setFilter] = useState("all");
  const [qtyMap, setQtyMap] = useState({});

  // ⭐ NEW – search text
  const [searchText, setSearchText] = useState("");

  // ⭐ NEW – rating summary { [menuItemId]: { avg, count } }
  const [ratingSummary, setRatingSummary] = useState({});

  function changeQty(id, delta) {
    setQtyMap((m) => {
      const cur = Math.max(1, (m[id] || 1) + delta);
      return { ...m, [id]: cur };
    });
  }

  function getQty(id) {
    return qtyMap[id] || 1;
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        // menu
        const data = await getMenu();
        const arr = Array.isArray(data) ? data : [];
        setMenu(arr);

        const init = {};
        arr.forEach((it) => (init[it.id] = 1));
        setQtyMap(init);

        // ⭐ rating summary
        try {
          const res = await fetch("http://localhost:8080/item-reviews/summary");
          if (res.ok) {
            const summary = await res.json();
            const map = {};
            if (Array.isArray(summary)) {
              summary.forEach((row) => {
                const id = row.menuItemId;
                if (id != null) {
                  map[id] = {
                    avg: row.avgRating ?? 0,
                    count: row.count ?? 0,
                  };
                }
              });
            }
            setRatingSummary(map);
          }
        } catch (err) {
          console.warn("Failed to load rating summary", err);
        }
      } catch (err) {
        setError(err.message || "Failed to load menu");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = menu.filter((item) => {
    const matchesCategory = filter === "all" || item.category === filter;

    const q = searchText.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (item.name || "").toLowerCase().includes(q) ||
      (item.description || "").toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  function handleAdd(item) {
    const qty = getQty(item.id);
    addToCart(item, qty);
    showToast("Added to cart", "success");
  }

  return (
    <div className="p-6 space-y-8">
      <section className="text-center bg-amber-50 py-8 rounded-2xl border border-amber-100 shadow">
        <h2 className="text-3xl font-extrabold text-amber-800">
          ☕ Fresh Brewed Happiness, Just for You
        </h2>
        <p className="text-gray-700 mt-2">
          Explore our best coffee & snack menu — pick your favourites and start
          your order!
        </p>
      </section>

      {/* Filter + Search row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Filter Buttons */}
        <div className="flex gap-3 justify-center flex-wrap">
          {[
            { key: "all", label: "All" },
            { key: "HOT", label: "Hot Coffee" },
            { key: "COLD", label: "Cold Coffee" },
            { key: "SNACKS", label: "Snacks" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`px-4 py-2 rounded-full border text-sm transition ${
                filter === cat.key
                  ? "bg-amber-700 text-white border-amber-700"
                  : "bg-white border-gray-300 hover:bg-amber-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ⭐ Search box */}
        <div className="w-full md:w-72">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by name or description..."
            className="w-full border rounded-full px-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500">Loading menu…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-500 text-center p-6">No items found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((item) => {
            // Only treat as OUT OF STOCK when explicitly false
            const isOut = item.available === false;
            const rating = ratingSummary[item.id];

            return (
              <article
                key={item.id}
                className={`bg-white rounded-2xl p-4 border hover:shadow-xl transition flex flex-col ${
                  isOut ? "opacity-90" : ""
                }`}
              >
                <div className="w-full h-40 bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
                  <img
                    src={item.img || "/menu-placeholder.jpg"}
                    onError={(e) => (e.target.src = "/menu-placeholder.jpg")}
                    className="w-full h-full object-cover"
                    alt={item.name}
                  />
                  {isOut && (
                    <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-[11px] font-semibold bg-red-600 text-white shadow">
                      Out of stock
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-gray-900">{item.name}</h4>
                  <div className="text-amber-700 font-bold">
                    ₹{item.price}
                  </div>
                </div>

                {/* ⭐ Item rating (read-only) */}
                {rating && rating.count > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <span className="text-amber-600 font-semibold">
                      ★ {rating.avg.toFixed(1)}
                    </span>
                    <span className="text-gray-500">
                      ({rating.count} review{rating.count !== 1 ? "s" : ""})
                    </span>
                  </div>
                )}

                <div className="flex-1" />

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
                    <button
                      onClick={() => !isOut && changeQty(item.id, -1)}
                      disabled={isOut}
                      className={`px-2 ${
                        isOut
                          ? "cursor-not-allowed text-gray-300"
                          : "hover:text-amber-700"
                      }`}
                    >
                      −
                    </button>
                    <div>{getQty(item.id)}</div>
                    <button
                      onClick={() => !isOut && changeQty(item.id, +1)}
                      disabled={isOut}
                      className={`px-2 ${
                        isOut
                          ? "cursor-not-allowed text-gray-300"
                          : "hover:text-amber-700"
                      }`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => !isOut && handleAdd(item)}
                    disabled={isOut}
                    className={`ml-auto px-4 py-2 rounded-lg text-sm ${
                      isOut
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-amber-700 text-white hover:bg-amber-800"
                    }`}
                  >
                    {isOut ? "Out of stock" : "Add"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {/* View Cart button */}
<button
  onClick={() => navigate("/dashboard/cart")}
  className="fixed bottom-6 right-6 bg-amber-700 text-white px-6 py-3 rounded-full shadow-lg hover:bg-amber-800"
>
  View Cart
</button>

    </div>
  );
}



