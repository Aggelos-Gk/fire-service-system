import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJson } from "../utils/api";
import { getStoredSession, normalizeRole } from "../utils/session";
import "./users.css";
import "./theme-overrides.css";

function Users() {
  const session = getStoredSession();
  const userId = session.userId;
  const role = normalizeRole(session.role);
  const isAdmin = role === "ADMIN";

  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  const loadUsers = useCallback(async (initial = false) => {
    if (!isAdmin || !userId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    try {
      if (initial) {
        setLoading(true);
      }
      setError("");
      const rows = await fetchJson(`/api/users/admin?actorId=${userId}`);
      setUsers(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      console.error(loadError);
      setError("Could not load users.");
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }, [isAdmin, userId]);

  useEffect(() => {
    loadUsers(true);
  }, [loadUsers]);

  const handleDelete = async (targetUserId) => {
    if (!isAdmin || !userId || targetUserId === userId) {
      return;
    }
    const confirmed = window.confirm("Delete this user account?");
    if (!confirmed) return;

    try {
      setDeletingId(targetUserId);
      setError("");
      await fetchJson(`/api/users/${targetUserId}?actorId=${userId}`, { method: "DELETE" });
      await loadUsers(false);
    } catch (deleteError) {
      console.error(deleteError);
      setError("Could not delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      return (
        (user.username || "").toLowerCase().includes(query)
        || (user.firstName || "").toLowerCase().includes(query)
        || (user.lastName || "").toLowerCase().includes(query)
        || (user.telephone || "").toLowerCase().includes(query)
        || (user.userType || "").toLowerCase().includes(query)
      );
    });
  }, [searchTerm, users]);

  if (!isAdmin) {
    return <div className="inline-error">Website cannot find it.</div>;
  }

  return (
    <div className="users-container">
      <div className="content-header">
        <h2>Users</h2>
      </div>

      {error && <div className="inline-error">{error}</div>}
      {loading && <div className="inline-loading">Loading users...</div>}

      <div className="users-controls">
        <input
          type="text"
          className="users-search-input"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search username/name/telephone/role..."
        />
      </div>

      <div className="users-list">
        {filteredUsers.length === 0 && <div className="users-empty">No users found.</div>}
        {filteredUsers.map((user) => {
          const isOwnAccount = Number(user.id) === Number(userId);
          return (
            <div className="user-card" key={user.id}>
              <div className="user-main">
                <div className="user-name-row">
                  <strong>
                    {[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || `User #${user.id}`}
                  </strong>
                  <span className="user-role">{user.userType || "USER"}</span>
                </div>
                <div className="user-meta">
                  <span>Username: {user.username || "N/A"}</span>
                  <span>Telephone: {user.telephone || "N/A"}</span>
                  <span>Birthdate: {user.birthdate || "N/A"}</span>
                  <span>Lat/Lon: {typeof user.lat === "number" && typeof user.lon === "number" ? `${user.lat}, ${user.lon}` : "N/A"}</span>
                </div>
              </div>
              <div className="user-actions">
                <button
                  type="button"
                  className="delete-user-btn"
                  onClick={() => handleDelete(user.id)}
                  disabled={isOwnAccount || deletingId === user.id}
                  title={isOwnAccount ? "Cannot delete your own account" : "Delete user"}
                >
                  {deletingId === user.id ? "Deleting..." : isOwnAccount ? "Own Account" : "Delete"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Users;
