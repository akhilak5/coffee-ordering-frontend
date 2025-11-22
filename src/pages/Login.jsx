// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLogin, showToast }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null); // { error, field }
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);
    if (!email || !password) {
      setMsg({ error: "Please fill all fields", field: null });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setMsg({ error: "Please enter a valid email address", field: "email" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data?.error) {
        setMsg({ error: data.error, field: data.field || null });
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setMsg({ error: data?.error || "Login failed", field: null });
        setLoading(false);
        return;
      }

      onLogin(data);
      showToast && showToast("Login successful", "success");

      // redirect based on role
      if (data.role === "CHEF") nav("/chef");
      else if (data.role === "WAITER") nav("/waiter");
      else if (data.role === "ADMIN") nav("/admin");
      else nav("/");
    } catch (err) {
      setMsg({ error: "Network error", field: null });
    } finally {
      setLoading(false);
    }
  }

  // Forgot password submit
  async function submitForgot(e) {
    e.preventDefault();
    setForgotMsg(null);

    if (!forgotEmail) {
      setForgotMsg({ error: "Please enter your email" });
      return;
    }
    if (!EMAIL_RE.test(forgotEmail)) {
      setForgotMsg({ error: "Please enter a valid email address" });
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch("http://localhost:8080/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setForgotMsg({ error: data?.error || "Failed to request reset" });
        setForgotLoading(false);
        return;
      }

      setForgotMsg({ success: data?.success || "If the email exists, a reset link was sent." });
      showToast && showToast("Reset link sent (if email exists)", "info");
      // optionally close modal after short delay
      setTimeout(() => {
        setForgotOpen(false);
        setForgotEmail("");
        setForgotMsg(null);
      }, 1500);
    } catch (err) {
      setForgotMsg({ error: "Network error" });
    } finally {
      setForgotLoading(false);
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
            <h2 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-amber-800">
              Welcome back
            </h2>
            <p className="text-center text-sm text-gray-600 mb-6">
              Sign in to continue to JavaBite
            </p>

            {/* centered error */}
            {msg?.error && (
              <div className="mb-4 flex justify-center">
                <div className="w-full text-center px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 shadow-sm">
                  {msg.error}
                </div>
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
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
                autoComplete="current-password"
              />

              <button
                disabled={loading}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3 rounded-lg font-medium shadow-sm"
              >
                {loading ? "Please wait..." : "Login"}
              </button>
            </form>

            {/* bottom helpers */}
            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
              <div>
                Don't have an account?{" "}
                <Link to="/register" className="text-amber-700 font-medium">
                  Register
                </Link>
              </div>

              <button
                type="button"
                className="text-sm text-amber-700 font-medium underline"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotEmail("");
                  setForgotMsg(null);
                }}
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setForgotOpen(false)}></div>

          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Reset your password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the email address for your account. We'll send a link to reset your password.
            </p>

            {forgotMsg?.error && (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 p-2 rounded">
                {forgotMsg.error}
              </div>
            )}
            {forgotMsg?.success && (
              <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-100 p-2 rounded">
                {forgotMsg.success}
              </div>
            )}

            <form onSubmit={submitForgot} className="space-y-3">
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Your email"
                className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-amber-300"
                autoComplete="email"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className={`flex-1 ${forgotLoading ? "bg-amber-300" : "bg-amber-700 hover:bg-amber-800"} text-white py-2 rounded`}
                >
                  {forgotLoading ? "Sending..." : "Send reset link"}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="flex-1 border border-gray-300 py-2 rounded"
                >
                  Close
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* small static footer */}
      <footer className="bg-[#0E1525] text-white pt-10 pb-8 mt-auto">
        <div className="max-w-screen-xl mx-auto px-6 md:px-20 text-center text-gray-300 text-sm">
          © {new Date().getFullYear()} JavaBite. All rights reserved.
        </div>
      </footer>
    </div>
  );
}













