// src/pages/Login.jsx
import React, { useState, useEffect } from "react";

import { Link,useNavigate } from "react-router-dom";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLogin, setCartFromBackend, showToast }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate(); 
    // ⬇️ Pre-fill email from saved user (if previously logged in)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;

      const savedUser = JSON.parse(raw);
      if (savedUser?.email) {
        setEmail(savedUser.email);
      }
    } catch (e) {
      console.error("Failed to read saved user from localStorage", e);
    }
  }, []);


  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setMsg(null);

    if (!email || !password) {
      setMsg({ error: "Please fill all fields" });
      return;
    }

    if (!EMAIL_RE.test(email)) {
      setMsg({ error: "Invalid email format", field: "email" });
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

      // ❌ Backend error (4xx/5xx)
      if (!res.ok) {
        setMsg({ error: data?.error || "Login failed" });
        setLoading(false);
        return;
      }

      // ❌ Backend returned { error: "..." } with 200
      if (data?.error) {
        setMsg({ error: data.error });
        setLoading(false);
        return;
      }

      // ✅ Success
      // ✅ Success
const normalizedUser = {
  id: data.id ?? data.user?.id,
  name: data.name ?? data.user?.name ?? email.split("@")[0],
  email: data.email ?? data.user?.email ?? email,
  role: (data.role ?? data.user?.role ?? "USER").toUpperCase(),
};

const token = data.token || data.accessToken || null;
if (token) localStorage.setItem("token", token);

// 🔹 Save user in localStorage so dashboards can read it
localStorage.setItem("user", JSON.stringify(normalizedUser));

// 🔹 Let parent know (if App.jsx is listening)
if (onLogin) {
  onLogin(normalizedUser);
}

// 🔹 Redirect based on role
const role = normalizedUser.role;

if (role === "ADMIN") {
  navigate("/admin");
} else if (role === "CHEF") {
  navigate("/chef");
} else if (role === "WAITER") {
  navigate("/waiter");
} else {
  navigate("/dashboard"); // normal user
}

// Optional toast
showToast && showToast("Logged in successfully", "success");

    } catch (err) {
      console.error("Login error:", err);
      setMsg({ error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  async function submitForgot(e) {
    e.preventDefault();
    setForgotMsg(null);

    if (!forgotEmail) {
      setForgotMsg({ error: "Enter your email" });
      return;
    }

    if (!EMAIL_RE.test(forgotEmail)) {
      setForgotMsg({ error: "Invalid email address" });
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetch("http://localhost:8080/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      console.log("forgot-password status:", res.status);

      let data = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.error("Error parsing forgot-password JSON:", jsonErr);
      }

      if (!res.ok) {
        console.error("forgot-password error response:", data);
        setForgotMsg({
          error: data?.error || `Failed to request reset (status ${res.status})`,
        });
        return;
      }

      setForgotMsg({ success: "Reset link sent to your email" });
      showToast && showToast("Check your email inbox", "info");

    } catch (err) {
      console.error("Forgot password network error:", err);
      setForgotMsg({ error: "Network error – is backend running on :8080?" });
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h[calc(100vh-64px)] w-full relative overflow-hidden">
      <img
        src="/bg.jpg"
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "50% 92%" }}
      />
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-gradient-to-br from-white/95 to-amber-50/60 backdrop-blur-sm shadow-2xl p-8">
            <div className="flex justify-center mb-4">
              <img
                src="/coffee-icon.png"
                alt="logo"
                className="w-16 h-16 rounded-full shadow-md object-cover"
              />
            </div>

            <h2 className="text-center text-3xl md:text-4xl font-extrabold tracking-tight mb-4 text-amber-800">
              Welcome back
            </h2>
            <p className="text-center text-sm text-gray-600 mb-6">
              Sign in to continue to JavaBite
            </p>

            {msg?.error && (
              <div className="mb-4 text-center px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 shadow-sm">
                {msg.error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4" autoComplete="on">
<input
  name="email"
  autoComplete="email"
  className={`w-full border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-300 transition ${
    msg?.field === "email"
      ? "border-red-500 ring-red-200"
      : "border-gray-200"
  }`}
  placeholder="Email"
  value={email}
  type="email"
  onChange={(e) => setEmail(e.target.value)}
/>


              <input
  name="password"
  autoComplete="current-password"
  className="w-full border p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-300 transition border-gray-200"
  placeholder="Password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>


              <button
                disabled={loading}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white py-3 rounded-lg"
              >
                {loading ? "Please wait..." : "Login"}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
              <div>
                Don't have an account?{" "}
                <Link to="/register" className="text-amber-700 font-medium">
                  Register
                </Link>
              </div>

              <button
                className="text-amber-700 font-medium underline"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotMsg(null);
                  setForgotEmail("");
                }}
              >
                Forgot password?
              </button>
            </div>
          </div>
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setForgotOpen(false)}
          ></div>

          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-semibold mb-2">Reset your password</h3>

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
                className="w-full border p-3 rounded focus:ring-2 focus:ring-amber-300"
              />

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 bg-amber-700 hover:bg-amber-800 text-white py-2 rounded"
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

      <footer className="bg-[#0E1525] text-white pt-10 pb-8 text-center text-sm">
        © {new Date().getFullYear()} JavaBite. All rights reserved.
      </footer>
    </div>
  );
}
