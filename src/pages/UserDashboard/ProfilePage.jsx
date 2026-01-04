import React, { useState } from "react";

export default function ProfilePage({ user: initialUser }) {
  const [profile, setProfile] = useState(initialUser || {});
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [showPwdModal, setShowPwdModal] = useState(false); // 🔹 NEW: modal toggle

  if (!profile || !profile.email) {
    return <div className="p-6 text-gray-500 text-sm">Loading profile...</div>;
  }

  const handleUpdate = async () => {
    setLoading(true);
    try {
      localStorage.setItem("user", JSON.stringify(profile));
      setEditMode(false);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg(null);

    if (!pwd.current || !pwd.next || !pwd.confirm) {
      setPwdMsg({ error: "Please fill all fields." });
      return;
    }
    if (pwd.next.length < 6) {
      setPwdMsg({ error: "Password must be at least 6 characters." });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdMsg({ error: "Passwords do not match." });
      return;
    }

    setPwdLoading(true);
    try {
      const res = await fetch("http://localhost:8080/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: profile.email,
          oldPassword: pwd.current,
          newPassword: pwd.next,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setPwdMsg({ error: data.error });
      } else {
        setPwdMsg({ success: "Password updated successfully!" });
        setPwd({ current: "", next: "", confirm: "" });
        // optional: close modal after success
        // setShowPwdModal(false);
      }
    } catch {
      setPwdMsg({ error: "Error changing password, try again!" });
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-8 pb-16 px-4 bg-[#F8F5EF]">
      {/* TITLE */}
      <h2 className="text-3xl font-extrabold text-center mb-10 text-amber-900 drop-shadow-sm">
        My Profile
      </h2>

      {/* 🔹 Reduced width from 3xl to 2xl */}
      <div className="max-w-xl mx-auto space-y-8">
        {/* PROFILE CARD */}
        <div className="bg-white/90 backdrop-blur rounded-3xl shadow-xl border border-amber-100 p-8 space-y-6 transition-all">
          <div className="flex gap-6 items-center">
            <div className="w-20 h-20 rounded-full bg-amber-600 text-white text-3xl font-bold flex items-center justify-center shadow-md">
              {profile.name?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div>
              <div className="text-xl font-bold text-gray-900">
                {profile.name}
              </div>
              <div className="text-sm text-gray-600">{profile.email}</div>
              <span className="inline-block mt-2 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase font-semibold">
                {profile.role || "USER"}
              </span>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="grid gap-4">
            <Field
              label="Name"
              value={profile.name}
              editable={editMode}
              onChange={(v) => setProfile({ ...profile, name: v })}
            />
            <Field label="Email" value={profile.email} editable={false} />
            <Field
              label="Phone"
              value={profile.phone}
              editable={editMode}
              onChange={(v) => setProfile({ ...profile, phone: v })}
              placeholder="Add phone"
            />
          </div>

          {/* Buttons row: left = Change Password, right = Edit/Save */}
          <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-amber-50">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500">
                For security, you can update your password anytime.
              </span>
            </div>

            <div className="flex gap-2">
              <BtnSecondary
                text="Change Password"
                onClick={() => {
                  setPwdMsg(null);
                  setShowPwdModal(true);
                }}
              />
              {editMode ? (
                <>
                  <BtnSecondary onClick={() => setEditMode(false)} text="Cancel" />
                  <BtnPrimary
                    text={loading ? "Saving..." : "Save Changes"}
                    disabled={loading}
                    onClick={handleUpdate}
                  />
                </>
              ) : (
                <BtnPrimary
                  text="Edit Profile"
                  onClick={() => setEditMode(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🔹 Change Password Modal (same page, like chef style) */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-amber-900">
                Change Password
              </h3>
              <button
                onClick={() => setShowPwdModal(false)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 mb-3">
              Enter your current password and choose a new one.
            </p>

            {pwdMsg?.error && <Alert type="error" text={pwdMsg.error} />}
            {pwdMsg?.success && <Alert type="success" text={pwdMsg.success} />}

            <form onSubmit={handleChangePassword} className="space-y-3 mt-2">
              <PwdInput
                label="Current Password"
                value={pwd.current}
                onChange={(v) => setPwd({ ...pwd, current: v })}
              />
              <PwdInput
                label="New Password"
                value={pwd.next}
                onChange={(v) => setPwd({ ...pwd, next: v })}
              />
              <PwdInput
                label="Confirm New Password"
                value={pwd.confirm}
                onChange={(v) => setPwd({ ...pwd, confirm: v })}
              />

              <div className="flex justify-end gap-2 pt-2">
                <BtnSecondary
                  text="Cancel"
                  onClick={() => setShowPwdModal(false)}
                />
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="px-5 py-2 rounded-lg text-sm bg-amber-700 text-white font-semibold hover:bg-amber-800 transition disabled:opacity-50"
                >
                  {pwdLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Reusable Components */
function Field({ label, value, editable, onChange, placeholder }) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        disabled={!editable}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`mt-1 px-3 py-2 rounded-xl w-full text-sm border
          ${
            editable
              ? "bg-white border-amber-300 focus:ring-2 focus:ring-amber-400"
              : "bg-gray-100 border-gray-300 cursor-not-allowed"
          }`}
      />
    </div>
  );
}

function PwdInput({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-gray-700">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 px-3 py-2 rounded-xl w-full text-sm bg-white border border-amber-300 focus:ring-2 focus:ring-amber-500"
      />
    </div>
  );
}

function BtnPrimary({ text, onClick, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="px-5 py-2 rounded-lg text-sm bg-amber-700 text-white font-semibold hover:bg-amber-800 transition disabled:opacity-50"
    >
      {text}
    </button>
  );
}

function BtnSecondary({ text, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="px-5 py-2 rounded-lg border text-sm font-medium text-amber-700 bg-white hover:bg-amber-50 transition"
    >
      {text}
    </button>
  );
}

function Alert({ type, text }) {
  return (
    <div
      className={`mb-3 px-3 py-2 rounded-md text-xs font-medium
      ${
        type === "error"
          ? "bg-red-100 text-red-600"
          : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {text}
    </div>
  );
}








