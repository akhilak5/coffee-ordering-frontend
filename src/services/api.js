// src/services/api.js
import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "http://localhost:8080"
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;
