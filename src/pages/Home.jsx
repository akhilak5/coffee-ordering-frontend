// src/pages/Home.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  // change this path if your MenuPage route is different
  const navigateToMenu = () => {
    navigate("/dashboard/menu"); // e.g. "/menu" or "/user/menu"
  };

  const ITEMS = [
    {
      id: 1,
      name: "Espresso",
      descShort: "Bold single shot — clean, intense flavour.",
      descFull:
        "A concentrated, robust shot made by forcing hot water through finely-ground beans. Fast, intense and perfect for a quick pick-me-up.",
      price: 80,
      img: "/menu-espresso.jpg",
    },
    {
      id: 2,
      name: "Cappuccino",
      descShort: "Balanced espresso with smooth frothy milk.",
      descFull:
        "Equal parts espresso, steamed milk and microfoam. Smooth texture with a creamy mouthfeel and light foam on top.",
      price: 140,
      img: "/menu-cappuccino.jpg",
    },
    {
      id: 3,
      name: "Latte",
      descShort: "Creamy steamed milk + espresso shot.",
      descFull:
        "More milk-forward than a cappuccino — steamed milk blended with espresso for a silky, mellow drink.",
      price: 150,
      img: "/menu-latte.jpg",
    },
    {
      id: 4,
      name: "Cold Brew",
      descShort: "Slow-steeped, chilled, refreshing.",
      descFull:
        "Coarsely-ground beans steeped in cold water for many hours, then filtered. Smooth, low-acidity coffee served chilled.",
      price: 160,
      img: "/menu-coldbrew.jpg",
    },
  ];

  const [viewItem, setViewItem] = useState(null);
  const [qty, setQty] = useState(1);

  function openView(item) {
    setViewItem(item);
    setQty(1);
    document.body.style.overflow = "hidden";
  }

  function closeView() {
    setViewItem(null);
    setQty(1);
    document.body.style.overflow = "";
  }

  return (
    <div className="w-full ">
      {/* HERO */}
      <section
        className="relative w-full flex items-center justify-center bg-cover bg-no-repeat"
        style={{
          height: "calc(100vh - 72px)",
          backgroundImage: "url('/bg.jpg')",
          backgroundPosition: "center 85%",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-black/16"></div>

        <div className="relative z-10 text-center px-4 -mt-12 sm:-mt-16 md:-mt-44">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white drop-shadow-lg leading-tight">
            Welcome to JavaBite
          </h1>
          <p className="mt-3 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Relax, sip, and enjoy the best coffee in town.
          </p>

          {/* Optional: direct “Order Now” from hero */}
          <button
            onClick={navigateToMenu}
            className="mt-6 px-6 py-3 rounded-lg bg-amber-700 text-white font-semibold hover:bg-amber-800 transition"
          >Login to Order
          </button>
        </div>
      </section>

      {/* ABOUT */}
      <section className="py-16 px-6 md:px-20 bg-white">
        <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">About Us</h2>
            <p className="text-gray-700 text-lg mb-6 max-w-2xl">
              JavaBite is a warm and cozy café designed for people who enjoy simple, good coffee and a peaceful space to relax.
            </p>

            <div className="space-y-4">
              <Bullet title="Carefully sourced" text="Premium beans selected from trusted small farms." />
              <Bullet title="Warm & cozy" text="Soft lighting, comfortable seating, calm music." />
              <Bullet title="Expert Brewing Team" text="Drinks prepared with consistent care and attention." />
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <div className="w-full max-w-md rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              <img src="/about-photo.jpg" alt="Inside JavaBite" className="w-full h-80 object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* MENU — Most popular (light section background) */}
      <section className="py-12 px-6 md:px-20 bg-gray-50">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-extrabold text-gray-900">Menu — Popular Picks</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ITEMS.map((item) => (
              <article
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden border border-gray-100 p-4 flex flex-col transition-shadow hover:shadow-lg"
              >
                <div className="w-full h-40 rounded-lg overflow-hidden mb-3">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = "/menu-placeholder.jpg"; }}
                  />
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.name}</h4>
                      <div className="text-sm text-gray-600 mt-1">{item.descShort}</div>
                    </div>
                    <div className="text-gray-800 font-semibold">₹{item.price}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => openView(item)}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-white border border-amber-700 text-amber-700 hover:bg-amber-50 transition"
                  >
                    View
                  </button>
                  <button
                    onClick={navigateToMenu}
                    className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-amber-700 text-white hover:bg-amber-800 transition"
                  >
                    Order Now
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="py-20 px-6 md:px-20 bg-[#faf7f2]">
        <div className="max-w-screen-xl mx-auto text-center mb-14">
          <h3 className="text-3xl font-extrabold text-gray-900">What Makes JavaBite Special</h3>
          <p className="text-gray-600 max-w-2xl mx-auto mt-3 text-lg">
            A café built on comfort, consistency, and warm hospitality.
          </p>
        </div>

        <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { icon: "☕", title: "Crafted With Care", text: "Every cup is brewed with precision and passion." },
            { icon: "🌿", title: "Cozy Atmosphere", text: "A calm escape with soft ambience and comfortable seating." },
            { icon: "🤝", title: "Friendly Experience", text: "Service with a smile — we make you feel at home." },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-10 border border-amber-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-center"
            >
              <div className="text-5xl mb-5">{item.icon}</div>
              <h4 className="text-xl font-semibold text-gray-900">{item.title}</h4>
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="py-20 px-6 md:px-20 bg-[#f7f2ec]">
        <div className="max-w-screen-xl mx-auto text-center mb-14">
          <h3 className="text-3xl font-extrabold text-gray-900">Our Services</h3>
          <p className="text-gray-600 max-w-2xl mx-auto mt-3 text-lg">
            Designed to make your JavaBite experience faster and smoother.
          </p>
        </div>

        <div className="max-w-screen-xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { icon: "🛍️", title: "Online Ordering", desc: "Order ahead and skip waiting in line." },
            { icon: "📅", title: "Table Reservations", desc: "Reserve your favorite seat anytime." },
            { icon: "🔒", title: "Staff Portal", desc: "Smart access for admin, chefs & waiters." },
          ].map((srv, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-10 border border-gray-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-center"
            >
              <div className="text-5xl mb-5">{srv.icon}</div>
              <h4 className="text-xl font-semibold text-gray-900">{srv.title}</h4>
              <p className="text-gray-600 text-sm mt-3 leading-relaxed">{srv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VIEW MODAL */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeView}></div>

          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10">
            <div className="md:flex md:items-center">
              {/* LEFT: centered small image */}
              <div className="md:w-1/2 p-6 flex items-center justify-center">
                <div className="w-full max-w-xs rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center p-4">
                  <img
                    src={viewItem.img}
                    alt={viewItem.name}
                    className="max-h-56 w-auto object-contain"
                    onError={(e) => { e.currentTarget.src = "/menu-placeholder.jpg"; }}
                  />
                </div>
              </div>

              {/* RIGHT: details */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-2xl font-bold">{viewItem.name}</h4>

                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                    {viewItem.descFull}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-xl font-bold text-amber-700">₹{viewItem.price}</div>

                    <div className="flex items-center gap-3">
                      <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 py-1 border rounded">-</button>
                      <input
                        className="w-16 text-center border rounded px-2 py-1"
                        value={qty}
                        onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || 1)))}
                      />
                      <button onClick={() => setQty((q) => q + 1)} className="px-3 py-1 border rounded">+</button>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => {
                        closeView();
                        navigateToMenu(); // go to dashboard menu for actual ordering
                      }}
                      className="bg-amber-700 text-white px-5 py-2 rounded hover:bg-amber-800 transition"
                    >
                      Login to Order
                    </button>
                    <button className="border px-5 py-2 rounded" onClick={closeView}>Close</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* small helper components */
function Bullet({ title, text }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center font-semibold">✓</div>
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
}
