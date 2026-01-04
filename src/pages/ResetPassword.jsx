import React, { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";

export default function ResetPassword({ showToast }) {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!token) {
      setMsg({ error: "Invalid or missing reset link." });
      return;
    }

    if (!password || !confirm) {
      setMsg({ error: "Please fill all fields." });
      return;
    }

    if (password.length < 6) {
      setMsg({ error: "Password must be at least 6 characters." });
      return;
    }

    if (password !== confirm) {
      setMsg({ error: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8080/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMsg({ error: data.error || "Failed to reset password." });
        return;
      }

      setMsg({ success: "Password reset successful. You can login now." });
      showToast && showToast("Password reset successful", "success");

      setTimeout(() => {
        nav("/login");
      }, 1200);
    } catch (err) {
      console.error("Reset password error:", err);
      setMsg({ error: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full relative overflow-hidden">
      <img
        src="/bg.jpg"
        alt="background"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "50% 92%" }}
      />
      <div className="absolute inset-0 bg-black/45"></div>

      <div className="relative z-10 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-gradient-to-br from-white/95 to-amber-50/70 backdrop-blur-sm shadow-2xl p-8">
            <h2 className="text-center text-2xl md:text-3xl font-extrabold tracking-tight mb-4 text-amber-800">
              Reset Password
            </h2>
            <p className="text-center text-sm text-gray-600 mb-4">
              Enter a new password for your JavaBite account.
            </p>

            {!token && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 p-2 rounded">
                Invalid or missing reset link. Please request a new one from{" "}
                <Link to="/login" className="underline text-red-800">
                  Forgot password
                </Link>
                .
              </div>
            )}

            {msg?.error && (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 p-2 rounded">
                {msg.error}
              </div>
            )}

            {msg?.success && (
              <div className="mb-3 text-sm text-green-700 bg-green-50 border border-green-100 p-2 rounded">
                {msg.success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-600">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full border p-3 rounded-lg focus:ring-2 focus:ring-amber-300"
                  placeholder="Enter new password"
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1 w-full border p-3 rounded-lg focus:ring-2 focus:ring-amber-300"
                  placeholder="Re-enter new password"
                />
              </div>

              <button
                type="submit"
                disabled={!token || loading}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white py-2.5 rounded-lg mt-2 disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-gray-500">
              Remembered your password?{" "}
              <Link to="/login" className="text-amber-700 font-medium">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-[#0E1525] text-white pt-10 pb-8 text-center text-sm">
        © {new Date().getFullYear()} JavaBite. All rights reserved.
      </footer>
    </div>
  );
}
