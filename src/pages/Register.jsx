// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Register({ onRegistered, showToast }) {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null); // { error, field }
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!name || !email || !password) {
      setMsg({ error: "Please fill all fields", field: null });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (data?.error) {
        setMsg({ error: data.error, field: data.error.toLowerCase().includes("email") ? "email" : null });
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setMsg({ error: data?.error || "Register failed", field: null });
        setLoading(false);
        return;
      }

      showToast && showToast("Registered successfully", "success");
      nav("/login");
    } catch (err) {
      setMsg({ error: "Network error", field: null });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] w-full relative overflow-hidden">
      {/* background */}
      <img
        src="/bg.jpg"
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "50% 92%" }}
      />
      <div className="absolute inset-0 bg-black/40"></div>

      {/* centered card */}
      <div className="relative z-10 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-gradient-to-br from-white/95 to-amber-50/60 backdrop-blur-sm shadow-2xl p-8 transform transition-all hover:-translate-y-1">
            {/* logo */}
            <div className="flex justify-center mb-4">
              <img
                src="/coffee-icon.png"
                alt="logo"
                className="w-16 h-16 rounded-full shadow-md object-cover"
              />
            </div>

            {/* heading */}
            <h2 className="text-center text-3xl md:text-4xl font-extrabold tracking-wide mb-2 text-amber-800">
              Create account
            </h2>
            <p className="text-center text-sm text-gray-600 mb-6">
              Join JavaBite and enjoy the best coffee in town.
            </p>

            {/* centered error */}
            {msg?.error && (
              <div className="mb-4 flex justify-center">
                <div className="w-full text-center px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 shadow-sm">
                  {msg.error}
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-6">
              <input
                className={`w-full border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-300 transition ${
                  msg?.field === "name" ? "border-red-500 ring-red-200" : "border-gray-200"
                }`}
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                autoComplete="name"
              />

              {/* extra space between name and email implemented by space-y-6 */}
              <input
                className={`w-full border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-300 transition ${
                  msg?.field === "email" ? "border-red-500 ring-red-200" : "border-gray-200"
                }`}
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
              />

              <input
                className="w-full border border-gray-200 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />

              <button
                disabled={loading}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3 rounded-lg font-medium shadow-sm"
              >
                {loading ? "Please wait..." : "Register"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-amber-700 font-medium">
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}








