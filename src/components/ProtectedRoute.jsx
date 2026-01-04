// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

/**
 * ProtectedRoute
 * - Reads user from localStorage on every render
 * - Ignores timing of parent state so refresh works
 */
export default function ProtectedRoute({
  user: _ignoredUserProp,       // we ignore this to avoid timing issues
  allowedRoles,
  children,
  redirectTo = "/login",
}) {
  let effectiveUser = null;

  // ✅ Always read from localStorage on refresh
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : null;

    if (parsed && typeof parsed === "object" && !parsed.error) {
      effectiveUser = parsed;
    }
  } catch {
    effectiveUser = null;
  }

  // ❌ If still no user -> go to login
  if (!effectiveUser) {
    return <Navigate to={redirectTo} replace />;
  }

  // ✅ Role check (case-insensitive)
  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = (effectiveUser.role || "").toString().toUpperCase();
    const allowed = allowedRoles.map((r) => r.toString().toUpperCase());

    if (!allowed.includes(userRole)) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  // ✅ All good -> show children
  return children;
}




