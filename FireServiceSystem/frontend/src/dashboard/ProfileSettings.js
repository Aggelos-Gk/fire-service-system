import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJson } from "../utils/api";
import { getStoredSession } from "../utils/session";
import "./profile.css";
import "./theme-overrides.css";

function ProfileSettings() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const userId = session.userId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timestamps, setTimestamps] = useState({ createdAt: null, updatedAt: null });
  const [userType, setUserType] = useState("USER");
  const [form, setForm] = useState({
    username: "",
    firstName: "",
    lastName: "",
    telephone: "",
    password: "",
    volunteerRole: "",
    birthdate: "",
    gender: "",
    country: "",
    municipality: "",
    address: "",
    job: "",
    lat: "",
    lon: ""
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const user = await fetchJson(`/api/users/${userId}`);
        setUserType((user.userType || "USER").toUpperCase());
        setForm({
          username: user.username || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          telephone: user.telephone || "",
          password: user.password || "",
          volunteerRole: user.volunteerRole || "",
          birthdate: user.birthdate || "",
          gender: user.gender || "",
          country: user.country || "",
          municipality: user.municipality || "",
          address: user.address || "",
          job: user.job || "",
          lat: typeof user.lat === "number" ? String(user.lat) : "",
          lon: typeof user.lon === "number" ? String(user.lon) : ""
        });
        setTimestamps({
          createdAt: user.createdAt || null,
          updatedAt: user.updatedAt || null
        });
      } catch (loadError) {
        console.error(loadError);
        setError("Could not load profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString();
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!userId) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const updated = await fetchJson(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username.trim(),
          firstName: form.firstName.trim() || null,
          lastName: form.lastName.trim() || null,
          telephone: form.telephone.trim() || null,
          password: form.password.trim() ? form.password : null,
          volunteerRole: userType === "VOLUNTEER" ? (form.volunteerRole || null) : null,
          birthdate: form.birthdate || null,
          gender: form.gender || null,
          country: form.country || null,
          municipality: form.municipality || null,
          address: form.address || null,
          job: form.job || null,
          lat: form.lat.trim() ? Number(form.lat) : null,
          lon: form.lon.trim() ? Number(form.lon) : null
        })
      });

      localStorage.setItem("username", updated.username || "");
      localStorage.setItem("displayName", updated.username || "");

      setForm((prev) => ({ ...prev, password: updated.password || prev.password }));
      setUserType((updated.userType || userType).toUpperCase());
      setTimestamps({
        createdAt: updated.createdAt || timestamps.createdAt,
        updatedAt: updated.updatedAt || timestamps.updatedAt
      });
      setSuccess("Profile updated.");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <div className="profile-container">
        <div className="main-card">
          <div className="card-title"><h3>Profile Settings</h3></div>
          <div className="card-content left">
            <p className="profile-note">Login is required to edit profile settings.</p>
            <button className="profile-login-btn" onClick={() => navigate("/login")}>Go To Login</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="content-header">
        <h2>Profile Settings</h2>
      </div>

      {loading && <div className="inline-loading">Loading profile...</div>}
      {error && <div className="inline-error">{error}</div>}
      {success && <div className="inline-success">{success}</div>}

      <div className="main-card">
        <div className="card-title">
          <h3>Account</h3>
        </div>
        <div className="card-content left">
          <form className="profile-form" onSubmit={saveProfile}>
            <div className="profile-grid">
              <input className="profile-input" placeholder="Username" value={form.username} onChange={handleChange("username")} />
              <input className="profile-input" placeholder="First Name" value={form.firstName} onChange={handleChange("firstName")} />
              <input className="profile-input" placeholder="Last Name" value={form.lastName} onChange={handleChange("lastName")} />
              <input className="profile-input" placeholder="Telephone" value={form.telephone} onChange={handleChange("telephone")} />
              <input className="profile-input" placeholder="Password" type="text" value={form.password} onChange={handleChange("password")} />
              {userType === "VOLUNTEER" ? (
                <select className="profile-input" value={form.volunteerRole} onChange={handleChange("volunteerRole")}>
                  <option value="">Select Volunteer Role</option>
                  <option value="FIREFIGHTER">Firefighter</option>
                  <option value="DRIVER">Driver</option>
                </select>
              ) : (
                <input className="profile-input" placeholder="Volunteer Role" value="N/A for this account type" readOnly />
              )}
              <input className="profile-input" placeholder="Birthdate" type="date" value={form.birthdate} onChange={handleChange("birthdate")} />
              <input className="profile-input" placeholder="Gender" value={form.gender} onChange={handleChange("gender")} />
              <input className="profile-input" placeholder="Country" value={form.country} onChange={handleChange("country")} />
              <input className="profile-input" placeholder="Municipality" value={form.municipality} onChange={handleChange("municipality")} />
              <input className="profile-input" placeholder="Job" value={form.job} onChange={handleChange("job")} />
              <input className="profile-input" placeholder="Address" value={form.address} onChange={handleChange("address")} />
              <input className="profile-input" placeholder="Latitude" value={form.lat} onChange={handleChange("lat")} />
              <input className="profile-input" placeholder="Longitude" value={form.lon} onChange={handleChange("lon")} />
            </div>

            <div className="profile-meta">
              <span><strong>Created At:</strong> {formatDateTime(timestamps.createdAt)}</span>
              <span><strong>Updated At:</strong> {formatDateTime(timestamps.updatedAt)}</span>
            </div>

            <div className="profile-actions">
              <button className="profile-save-btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
