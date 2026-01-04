// src/hooks/useDashboardData.js
import { useEffect, useState } from "react";
import api from "../services/api"; // make sure this file exists (see below)

export default function useDashboardData() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);

        // You might have different endpoints; adapt if needed.
        const profileReq = api.get("/user/profile");
        const ordersReq = api.get("/orders");

        const [pRes, oRes] = await Promise.all([profileReq, ordersReq]);

        if (!mounted) return;
        setProfile(pRes.data || null);
        setOrders(oRes.data || []);
      } catch (err) {
        // optionally handle error or set fallback
        console.error("dashboard load error", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { profile, orders, loading, setOrders, setProfile };
}
