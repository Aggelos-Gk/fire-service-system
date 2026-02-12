import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./dashboard.css";
import { fetchJson } from "../utils/api";
import { clearStoredSession, getStoredSession, isLoggedIn, normalizeRole } from "../utils/session";
import { formatRelativeTime } from "../utils/time";

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);

  const [session, setSession] = useState(getStoredSession());
  const [activeMenu, setActiveMenu] = useState("home");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const loggedIn = isLoggedIn(session);
  const normalizedRole = normalizeRole(session.role) || "GUEST";

  const menuItems = useMemo(() => {
    if (normalizedRole === "ADMIN") {
      return [
        { id: "home", label: "Home", icon: "🏠" },
        { id: "incidents", label: "Incidents", icon: "🔥" },
        { id: "participations", label: "Participants", icon: "👥" },
        { id: "messages", label: "Messages", icon: "💬" },
        { id: "users", label: "Users", icon: "🧾" }
      ];
    }

    if (!loggedIn) {
      return [
        { id: "home", label: "Home", icon: "🏠" },
        { id: "incidents", label: "Incidents", icon: "🔥" }
      ];
    }

    return [
      { id: "home", label: "Home", icon: "🏠" },
      { id: "incidents", label: "Incidents", icon: "🔥" },
      { id: "messages", label: "Messages", icon: "💬" }
    ];
  }, [loggedIn, normalizedRole]);

  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    if (!session.userId) {
      return;
    }
    fetchJson("/api/notifications/read", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        viewerId: session.userId,
        notificationIds: [notificationId]
      })
    })
      .then(() => window.dispatchEvent(new Event("notifications:refresh")))
      .catch((error) => console.error("Failed marking notification as read:", error));
  }, [session.userId]);

  const markAllNotificationsAsRead = useCallback(() => {
    if (!session.userId || notifications.length === 0) {
      return;
    }
    const ids = notifications.map((item) => item.id);
    setNotifications([]);
    fetchJson("/api/notifications/read", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        viewerId: session.userId,
        notificationIds: ids
      })
    })
      .then(() => window.dispatchEvent(new Event("notifications:refresh")))
      .catch((error) => console.error("Failed marking all notifications as read:", error));
  }, [notifications, session.userId]);

  const loadNotifications = useCallback(async () => {
    if (!loggedIn) {
      setNotifications([]);
      return;
    }

    try {
      const data = await fetchJson(
        `/api/notifications?viewerId=${session.userId}&viewerRole=${encodeURIComponent(normalizedRole)}&limit=50`
      );
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed loading notifications:", error);
    }
  }, [loggedIn, normalizedRole, session.userId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const refreshSession = () => setSession(getStoredSession());
    refreshSession();

    window.addEventListener("storage", refreshSession);
    window.addEventListener("notifications:refresh", loadNotifications);
    return () => {
      window.removeEventListener("storage", refreshSession);
      window.removeEventListener("notifications:refresh", loadNotifications);
    };
  }, [loadNotifications]);

  useEffect(() => {
    const path = location.pathname;
    if (path.includes("/incidents")) setActiveMenu("incidents");
    else if (path.includes("/participations")) setActiveMenu("participations");
    else if (path.includes("/history")) setActiveMenu("history");
    else if (path.includes("/messages")) setActiveMenu("messages");
    else if (path.includes("/users")) setActiveMenu("users");
    else if (path.includes("/profile")) setActiveMenu("profile");
    else setActiveMenu("home");
  }, [location.pathname]);

  useEffect(() => {
    if (!loggedIn) {
      setNotifications([]);
      return undefined;
    }

    loadNotifications();
    const timer = setInterval(loadNotifications, 45000);
    return () => clearInterval(timer);
  }, [loadNotifications, loggedIn]);

  const handleMenuClick = (menuId) => {
    setActiveMenu(menuId);
    navigate(`/dashboard/${menuId}`);
  };

  const handleLogout = () => {
    clearStoredSession();
    setSession(getStoredSession());
    navigate("/");
  };

  const roleLabel = (() => {
    if (normalizedRole === "ADMIN") return "Administrator";
    if (normalizedRole === "VOLUNTEER") return "Volunteer";
    if (normalizedRole === "USER") return "User";
    return "Guest";
  })();

  const initials = (session.displayName || session.username || "?").charAt(0).toUpperCase();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">
            <div className="fire-icon-small">🔥</div>
            <h1>FIRE SERVICE</h1>
          </div>
        </div>

        <div className="header-right">
          <div className="header-actions">
            {loggedIn && (
              <div className="notifications-container" ref={notificationsRef}>
                <button
                  className="notification-button"
                  onClick={() => setShowNotifications((prev) => !prev)}
                  aria-label="Notifications"
                >
                  <span className="notification-icon">🔔</span>
                  {notifications.length > 0 && (
                    <span className="notification-badge">{notifications.length}</span>
                  )}
                </button>

                {showNotifications && (
                  <div className="notifications-dropdown">
                    <div className="notifications-header">
                      <h3>Notifications</h3>
                      <span className="notifications-count">{notifications.length} unread</span>
                    </div>
                    <div className="notifications-list">
                      {notifications.length === 0 && (
                        <div className="notification-empty">No new notifications</div>
                      )}
                      {notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="notification-item unread"
                          onClick={() => {
                            markNotificationAsRead(item.id);
                            setShowNotifications(false);
                            navigate(item.route);
                          }}
                        >
                          <div className="notification-icon-small">
                            {item.entityType === "incident" ? "🔥" : item.entityType === "request" ? "🙋" : "💬"}
                          </div>
                          <div className="notification-content">
                            <p>{item.title}</p>
                            <span className="notification-time">{formatRelativeTime(item.time)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <button className="view-all-btn" onClick={markAllNotificationsAsRead}>
                      Mark All As Read
                    </button>
                  </div>
                )}
              </div>
            )}

            {loggedIn ? (
              <div className="user-section" ref={userMenuRef}>
                <button
                  className="user-circle logged-in"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  aria-label="User menu"
                >
                  <span className="user-initial">{initials}</span>
                </button>

                {showUserMenu && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      <div className="dropdown-avatar">
                        <span className="avatar-initial">{initials}</span>
                      </div>
                      <div className="dropdown-user-info">
                        <div className="dropdown-username">{session.displayName || session.username}</div>
                        <div className="dropdown-role">{roleLabel}</div>
                      </div>
                    </div>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate("/dashboard/profile");
                      }}
                    >
                      <span className="dropdown-icon">⚙️</span>
                      Profile Settings
                    </button>
                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <span className="dropdown-icon">🚪</span>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button className="login-button-header" onClick={() => navigate("/login")}>
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="main-layout">
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <ul>
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    className={`sidebar-item ${activeMenu === item.id ? "active" : ""}`}
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
