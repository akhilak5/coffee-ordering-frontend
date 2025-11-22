// src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-xl font-extrabold text-gray-800">JavaBite</Link>
          <Link to="/" className="text-gray-600 hover:text-gray-900">Home</Link>
          <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
        </div>

        <div className="flex items-center gap-7">
          <Link to="/login" className="text-gray-700 hover:text-gray-900">Login</Link>
          <Link to="/register" className="px-3 py-1 bg-yellow-600 text-white rounded">Register</Link>
        </div>
      </div>
    </nav>
  );
}
