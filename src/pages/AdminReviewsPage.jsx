// src/pages/AdminReviewsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function safeDate(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); }
  catch { return String(v); }
}

export default function AdminReviewsPage() {
  const [data, setData] = useState([]); // grouped rows from backend
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [revRes, menuRes] = await Promise.all([
          fetch("http://localhost:8080/item-reviews"),
          fetch("http://localhost:8080/menu"),
        ]);

        // parse json responses defensively
        const revJson = revRes.ok ? await revRes.json() : [];
        const menuJson = menuRes.ok ? await menuRes.json() : [];

        // --- robust normalization of backend grouped rows ---
        // revJson can be:
        // - an array of normalized objects { orderId, createdAt, userName, items: [...] , commentsConcat }
        // - an array of Object[] / flattened rows (from native query)
        const normalized = Array.isArray(revJson)
          ? revJson.map((r) => {
              // if the backend already returned an object that contains 'items' array, prefer it
              let rawItems = Array.isArray(r.items) ? r.items.slice() : [];

              // fallback: parse itemsConcat (position 3 in flattened row)
              if ((!rawItems || rawItems.length === 0) && (r.itemsConcat || (Array.isArray(r) && r.length > 3 && r[3]))) {
                const itemsConcat = (r.itemsConcat ?? (Array.isArray(r) ? r[3] : null) ?? "") + "";
                if (itemsConcat) {
                  rawItems = itemsConcat.split(",").map(p => {
                    const parts = p.split(":", 3); // name : rating : comment
                    return {
                      item: parts[0]?.trim(),
                      rating: parts[1] ? Number(parts[1]) : null,
                      comment: parts[2] ? parts[2].trim() : null,
                      menuItemId: null
                    };
                  }).filter(Boolean);
                }
              }

              // commentsConcat may be in r.commentsConcat or at position r[4] (if native query returned it)
              const commentsConcat = (r.commentsConcat ?? ((Array.isArray(r) && r.length > 4) ? r[4] : null) ?? "") + "";

              // 1) Prefer last non-empty per-item comment (if rawItems includes comments)
              let chosenComment = null;
              if (Array.isArray(rawItems) && rawItems.length) {
                const itemComments = rawItems
                  .map(it => (it && (it.comment ?? it.commentText ?? "") || "").toString().trim())
                  .filter(Boolean);
                if (itemComments.length) {
                  chosenComment = itemComments[itemComments.length - 1];
                }
              }

              // 2) If no item-level comment, pick last non-empty part from commentsConcat
              if (!chosenComment && commentsConcat) {
                const parts = commentsConcat.split("||").map(p => (p || "").trim()).filter(Boolean);
                if (parts.length) chosenComment = parts[parts.length - 1];
              }

              if (!chosenComment) chosenComment = "—";

              // normalize items to a consistent shape
              const items = (rawItems || []).map(it => ({
                item: it.item ?? it.name ?? null,
                rating: it.rating ?? null,
                comment: it.comment ?? null,
                menuItemId: it.menuItemId ?? null
              }));

              // get order id / createdAt / userName with multiple fallbacks (flat vs shaped)
              const orderId = r.orderId ?? r.order_id ?? null;
              const createdAt = r.createdAt ?? (Array.isArray(r) ? r[1] : null) ?? null;
              const userName = r.userName ?? (Array.isArray(r) ? r[2] : null) ?? "Customer";

              return {
                orderId,
                orderCode: orderId == null ? null : `ORD-${String(orderId).padStart(3, "0")}`,
                createdAt,
                userName,
                items,
                commentsConcat,
                chosenComment
              };
            })
          : [];

        setData(normalized);
        setMenu(Array.isArray(menuJson) ? menuJson : []);
      } catch (err) {
        console.error("Load admin reviews error", err);
        setData([]);
        setMenu([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const menuMap = useMemo(() => {
    const m = {};
    (menu || []).forEach((it) => { if (it && it.id != null) m[it.id] = it; });
    return m;
  }, [menu]);

  const categories = useMemo(() => {
    const s = new Set();
    (menu || []).forEach(it => { if (it && it.category) s.add(it.category); });
    return ["all", ...Array.from(s)];
  }, [menu]);

  // Flatten rows: each item in an order becomes one table row.
  const flatRows = useMemo(() => {
    const rows = [];
    (data || []).forEach(order => {
      const orderId = order.orderId;
      const orderCode = order.orderCode || (orderId != null ? `ORD-${String(orderId).padStart(3,"0")}` : "—");
      const createdAt = order.createdAt;
      const userName = order.userName || "Customer";

      if (Array.isArray(order.items) && order.items.length > 0) {
        order.items.forEach(it => {
          // prefer item-specific comment; else use order chosenComment
         // fixed: only use the item-level comment; no order-level fallback
const itemComment = (it.comment && String(it.comment).trim() !== "") ? String(it.comment).trim() : "—";


          // item name resolution: prefer item.item, fallback to menu map if name contains "null"
          let itemName = it.item || it.name || `Item #${it.menuItemId ?? "?"}`;
          if ((!itemName || itemName.toLowerCase().includes("null")) && it.menuItemId && menuMap[it.menuItemId]) {
            itemName = menuMap[it.menuItemId].name;
          }

          rows.push({
            orderId, orderCode, createdAt, userName,
            itemName,
            rating: it.rating ?? "—",
            comment: itemComment,
            menuItemId: it.menuItemId ?? null
          });
        });
      } else {
        // no items — single row for order
        rows.push({
          orderId, orderCode, createdAt, userName,
          itemName: "—",
          rating: "—",
          comment: order.chosenComment || "—",
          menuItemId: null
        });
      }
    });
    return rows;
  }, [data, menuMap]);

  // compute stats (avg + count) per itemName
  const itemStats = useMemo(() => {
    const map = {};
    flatRows.forEach(r => {
      if (!r.itemName || r.itemName === "—") return;
      const key = r.itemName;
      const rating = Number(r.rating);
      if (!rating || Number.isNaN(rating)) return;
      if (!map[key]) map[key] = { itemName: key, total: 0, count: 0, menuItemId: r.menuItemId || null };
      map[key].total += rating;
      map[key].count++;
    });
    return Object.values(map).map(x => ({ ...x, avg: x.total / x.count })).sort((a,b)=>b.avg - a.avg);
  }, [flatRows]);

  const maxAvg = Math.max(5, ...(itemStats.map(s => s.avg) || [5]));

  const filteredItemStats = useMemo(() => {
    let arr = [...itemStats];
    if (ratingFilter !== "all") {
      const rf = Number(ratingFilter);
      arr = arr.filter(s => Math.round(s.avg) === rf || Math.floor(s.avg) === rf || Math.ceil(s.avg) === rf);
    }
    if (categoryFilter !== "all") {
      arr = arr.filter(s => {
        const menuItem = menu.find(m => (m.name || "").toLowerCase() === (s.itemName || "").toLowerCase());
        return menuItem ? (menuItem.category === categoryFilter) : false;
      });
    }
    return arr;
  }, [itemStats, ratingFilter, categoryFilter, menu]);

  const topFive = filteredItemStats.slice(0, 10);
  const least = filteredItemStats.filter(s => s.avg <= 2.5).slice(0, 10);

  const filteredRows = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    return flatRows.filter(r => {
      if (ratingFilter !== "all") {
        const rf = Number(ratingFilter);
        if (!r.rating || r.rating === "—") return false;
        if (Math.round(Number(r.rating)) !== rf) return false;
      }
      if (categoryFilter !== "all") {
        const menuItem = menu.find(m => (m.name || "").toLowerCase() === (r.itemName || "").toLowerCase());
        if (!menuItem || menuItem.category !== categoryFilter) return false;
      }
      if (!q) return true;
      return (
        String(r.itemName || "").toLowerCase().includes(q) ||
        String(r.comment || "").toLowerCase().includes(q) ||
        String(r.orderCode || "").toLowerCase().includes(q) ||
        String(r.userName || "").toLowerCase().includes(q)
      );
    });
  }, [flatRows, search, ratingFilter, categoryFilter, menu]);

  if (loading) return <div className="p-6">Loading reviews…</div>;

  // card width reduced for tighter layout
  const cardW = "w-52";
  const cardH = "min-h-[76px]";

  return (
    <div className="min-h-screen py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/admin" className="bg-amber-50 px-3 py-1 rounded-full text-sm">⬅ Back</Link>
          <h2 className="text-2xl font-bold">Item Review Analytics</h2>
        </div>

        {/* Filters */}
        <div className="card-section mb-6 flex flex-col md:flex-row gap-3 items-center">
          <div className="flex gap-3 items-center">
            <select className="border rounded px-3 py-2" value={ratingFilter} onChange={(e)=>setRatingFilter(e.target.value)}>
              <option value="all">Rating: All</option>
              <option value="5">5 ★</option>
              <option value="4">4 ★</option>
              <option value="3">3 ★</option>
              <option value="2">2 ★</option>
              <option value="1">1 ★</option>
            </select>

            <select className="border rounded px-3 py-2" value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)}>
              {categories.map(c => <option key={c} value={c}>{c === "all" ? "Category: All" : c}</option>)}
            </select>
          </div>

          <div className="flex-1">
            <input placeholder="Search item, order, comment..." value={search} onChange={(e)=>setSearch(e.target.value)}
                   className="w-full border rounded px-3 py-2" />
          </div>
        </div>

        {/* Top Rated */}
        <div className="card-section mb-6 relative">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold">Top Rated Items</h3>
            <div className="text-xs bg-[#FFF3D6] px-3 py-1 rounded-full">Avg ≥ 4.5</div>
          </div>

          {topFive.length === 0 ? (
            <div className="text-sm text-blue-600">Not enough reviews yet</div>
          ) : (
            <div className="overflow-x-auto -mx-2 py-2">
              <div className="flex gap-3 px-2">
                {topFive.map(s => (
                  <div key={s.itemName} className={`${cardW} ${cardH} p-3 rounded-xl border bg-emerald-50 border-emerald-100 flex-shrink-0`}>
                    <div className="font-semibold truncate">{s.itemName}</div>
                    <div className="text-amber-700 font-semibold mt-2">★ {s.avg.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.count} review{s.count>1?'s':''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lowest Rated */}
        <div className="card-section mb-6 relative">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold">Lowest Rated Items</h3>
            <div className="text-xs bg-[#FFF3D6] px-3 py-1 rounded-full">Avg ≤ 2.5</div>
          </div>

          {least.length === 0 ? (
            <div className="text-sm text-emerald-700">🎉 All items are doing well!</div>
          ) : (
            <div className="overflow-x-auto -mx-2 py-2">
              <div className="flex gap-3 px-2">
                {least.map(s => (
                  <div key={s.itemName} className={`${cardW} ${cardH} p-3 rounded-xl border bg-red-50 border-red-100 flex-shrink-0`}>
                    <div className="font-semibold truncate">{s.itemName}</div>
                    <div className="text-red-700 font-semibold mt-2">★ {s.avg.toFixed(1)}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.count} review{s.count>1?'s':''}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Overview bars */}
        <div className="card-section mb-6">
          <h3 className="text-lg font-semibold mb-3">Item Rating Overview</h3>
          <div className="space-y-3">
            {itemStats.length === 0 && <div className="text-sm text-gray-500">No ratings yet — customers will show up here once they rate items.</div>}
            {itemStats.map(s => (
              <div key={s.itemName} className="flex items-center gap-3 text-sm">
                <div className="w-40 truncate">{s.itemName}</div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${(s.avg / maxAvg) * 100}%` }} />
                </div>
                <div className="w-14 text-right font-semibold text-amber-700">{s.avg.toFixed(1)} ★</div>
                <div className="w-12 text-right text-gray-400">{s.count} rev</div>
              </div>
            ))}
          </div>
        </div>

        {/* All reviews table */}
        <div className="card-section mb-8">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">All Item Reviews</h3>
            <span className="text-xs bg-[#FFF3D6] px-3 py-1 rounded-full">{filteredRows.length} reviews</span>
          </div>

          <div className="overflow-x-auto">
            <div className="hidden md:grid grid-cols-6 px-4 py-2 text-[12px] font-semibold text-gray-500 border-b bg-gray-50">
              <div>Date</div><div>Item</div><div className="text-center">Rating</div><div className="text-center">Order</div><div>Comment</div><div className="text-center">User</div>
            </div>

            <div className="divide-y">
              {filteredRows.map((r, idx) => (
                <div key={`${r.orderId}-${r.itemName}-${idx}`} className="grid grid-cols-1 md:grid-cols-6 px-4 py-3 text-sm gap-2">
                  <div>{safeDate(r.createdAt)}</div>
                  <div className="font-semibold">{r.itemName}</div>
                  <div className="text-center text-amber-700 font-semibold">⭐ {r.rating}</div>
                  <div className="text-center font-mono">{r.orderCode}</div>
                  <div>{r.comment || "—"}</div>
                  <div className="text-center">{r.userName}</div>
                </div>
              ))}
              {filteredRows.length === 0 && (
                <div className="p-4 text-sm text-gray-500">No reviews found.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .card-section {
          background: white;
          border-radius: 12px;
          border: 1px solid #f4e9dd;
          padding: 14px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.03);
        }
        body { background: linear-gradient(180deg, #fff7ee 0%, #fff9f2 100%); }
      `}</style>
    </div>
  );
}

