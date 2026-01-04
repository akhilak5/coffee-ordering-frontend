// src/pages/StaffActivatePage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function StaffActivatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const email = params.get("email");
  const code = params.get("code");

  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  const hasValidLink = Boolean(email && code);

  useEffect(() => {
    if (!hasValidLink) {
      setError("Invalid or incomplete activation link.");
    }
  }, [hasValidLink]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!hasValidLink || !password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8080/staff/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          inviteCode: code,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Activation failed.");
        return;
      }

      setSuccess("Activation successful! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1800);
    } catch (err) {
      console.error("Activation error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF9F2] px-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl max-w-sm w-full border border-amber-200">
        <h2 className="text-xl font-bold text-center text-gray-900">
          Activate Staff Account
        </h2>

        <p className="text-xs text-gray-500 text-center mt-1 mb-5">
          {email ? (
            <>
              Email: <b>{email}</b>
            </>
          ) : (
            "Activation link must contain your email."
          )}
        </p>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded mb-3">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-emerald-600 bg-emerald-50 p-2 rounded mb-3">
            {success}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Create Password
            </label>
            <input
              type="password"
              value={password}
              minLength={4}
              placeholder="Enter new password"
              onChange={(e) => setPassword(e.target.value)}
              disabled={!hasValidLink || loading}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-gray-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim() || !hasValidLink}
            className="w-full bg-amber-700 text-white py-2 rounded-full text-sm font-semibold hover:bg-amber-800 disabled:opacity-50"
          >
            {loading ? "Activating..." : "Activate Account"}
          </button>

          {!hasValidLink && (
            <p className="text-[11px] text-gray-500 text-center mt-2">
              Please open the link directly from the invitation email.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

