import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import "./dashboard.css";
import "./theme-overrides.css";
import { fetchJson } from "../utils/api";
import { clearStoredSession, getStoredSession, isLoggedIn, normalizeRole } from "../utils/session";
import { formatRelativeTime } from "../utils/time";

const ICONS = {
  home: [
    "M3 10.5L12 3l9 7.5",
    "M5.5 9.5V20h13V9.5"
  ],
  incidents: [
    "M12 3c2.3 3.1 4 5.1 4 8a4 4 0 1 1-8 0c0-2.9 1.7-4.9 4-8Z",
    "M12 12.6c1.2 1.2 2 2.2 2 3.3a2 2 0 1 1-4 0c0-1.1.8-2.1 2-3.3Z"
  ],
  participations: [
    "M7.5 10.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M16.5 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    "M3.5 20c0-2.8 2-4.5 5.2-4.5S14 17.2 14 20",
    "M14.5 20c.2-1.8 1.6-3.2 4-3.2 1.2 0 2.2.3 3 .9"
  ],
  history: [
    "M12 6v6l4 2",
    "M4 12a8 8 0 1 0 2.4-5.7",
    "M4 4v4h4"
  ],
  messages: [
    "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
    "m4 7 8 6 8-6"
  ],
  users: [
    "M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M4 20c0-3.4 2.8-5.5 8-5.5s8 2.1 8 5.5"
  ],
  profile: [
    "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    "M4 20c0-3.1 2.7-5 8-5s8 1.9 8 5"
  ],
  quick: [
    "M12 5v14",
    "M5 12h14"
  ],
  panel: [
    "M4 5h16",
    "M4 19h16",
    "M8 5v14"
  ],
  panelToggle: [
    "M4.5 6a1.5 1.5 0 0 1 1.5-1.5h12A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4.5 18Z",
    "M9.5 4.5v15"
  ],
  bell: [
    "M9.5 18h5",
    "M18 15H6l1.2-1.8c.5-.8.8-1.7.8-2.7V9a4 4 0 1 1 8 0v1.5c0 1 .3 1.9.8 2.7Z"
  ],
  settings: [
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    "M19.4 15a1.4 1.4 0 0 0 .3 1.5l.1.1a1.6 1.6 0 0 1-1.1 2.8h-.2a1.4 1.4 0 0 0-1.3.8l-.1.2a1.6 1.6 0 0 1-3.1-.5 1.4 1.4 0 0 0-1.4-1h-1.2a1.4 1.4 0 0 0-1.4 1 1.6 1.6 0 0 1-3.1.5l-.1-.2a1.4 1.4 0 0 0-1.3-.8h-.2a1.6 1.6 0 0 1-1.1-2.8l.1-.1A1.4 1.4 0 0 0 4.6 15a1.4 1.4 0 0 0-.3-1.5l-.1-.1a1.6 1.6 0 0 1 1.1-2.8h.2a1.4 1.4 0 0 0 1.3-.8l.1-.2a1.6 1.6 0 0 1 3.1.5 1.4 1.4 0 0 0 1.4 1h1.2a1.4 1.4 0 0 0 1.4-1 1.6 1.6 0 0 1 3.1-.5l.1.2a1.4 1.4 0 0 0 1.3.8h.2a1.6 1.6 0 0 1 1.1 2.8l-.1.1a1.4 1.4 0 0 0-.3 1.5Z"
  ],
  logout: [
    "M15 17l5-5-5-5",
    "M20 12H9",
    "M9 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"
  ],
  more: [
    "M12 6.5h.01",
    "M12 12h.01",
    "M12 17.5h.01"
  ],
  login: [
    "M15 17l5-5-5-5",
    "M20 12H9",
    "M9 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"
  ]
};

function Icon({ name, className = "" }) {
  const paths = ICONS[name] || ICONS.home;
  return (
    <svg className={`ui-icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      {paths.map((pathValue, index) => (
        <path key={`${name}-${index}`} d={pathValue} />
      ))}
    </svg>
  );
}

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const loggedIn = isLoggedIn(session);
  const normalizedRole = normalizeRole(session.role) || "GUEST";

  const menuItems = useMemo(() => {
    if (normalizedRole === "ADMIN") {
      return [
        { id: "home", label: "Dashboard", icon: "home" },
        { id: "incidents", label: "Incidents", icon: "incidents" },
        { id: "participations", label: "Participations", icon: "participations" },
        { id: "history", label: "History", icon: "history" },
        { id: "messages", label: "Messages", icon: "messages" },
        { id: "users", label: "Users", icon: "users" }
      ];
    }

    if (!loggedIn) {
      return [
        { id: "home", label: "Dashboard", icon: "home" },
        { id: "incidents", label: "Incidents", icon: "incidents" }
      ];
    }

    return [
      { id: "home", label: "Dashboard", icon: "home" },
      { id: "incidents", label: "Incidents", icon: "incidents" },
      ...(normalizedRole === "VOLUNTEER"
        ? [{ id: "participations", label: "Participations", icon: "participations" }]
        : []),
      { id: "history", label: "History", icon: "history" },
      { id: "messages", label: "Messages", icon: "messages" }
    ];
  }, [loggedIn, normalizedRole]);

  const dismissNotification = useCallback((notificationId) => {
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    if (!session.userId) {
      return;
    }
    fetchJson("/api/notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        viewerId: session.userId,
        notificationIds: [notificationId]
      })
    })
      .then(() => window.dispatchEvent(new Event("notifications:refresh")))
      .catch((error) => console.error("Failed dismissing notification:", error));
  }, [session.userId]);

  const dismissAllNotifications = useCallback(() => {
    if (!session.userId || notifications.length === 0) {
      return;
    }
    const ids = notifications.map((item) => item.id);
    setNotifications([]);
    fetchJson("/api/notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        viewerId: session.userId,
        notificationIds: ids
      })
    })
      .then(() => window.dispatchEvent(new Event("notifications:refresh")))
      .catch((error) => console.error("Failed dismissing all notifications:", error));
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

  const toggleSidebar = () => {
    setShowUserMenu(false);
    setIsSidebarCollapsed((prev) => !prev);
  };

  const roleLabel = (() => {
    if (normalizedRole === "ADMIN") return "Administrator";
    if (normalizedRole === "VOLUNTEER") return "Volunteer";
    if (normalizedRole === "USER") return "User";
    return "Guest";
  })();

  const initials = (session.displayName || session.username || "?").charAt(0).toUpperCase();
  const displayName = session.displayName || session.username || "Guest User";
  const secondaryMenu = loggedIn
    ? [{ id: "profile", label: "Profile Settings", icon: "settings", route: "/dashboard/profile" }]
    : [];

  const pageTitle = (() => {
    const allItems = [...menuItems, ...secondaryMenu];
    const match = allItems.find((item) => item.id === activeMenu);
    if (match) return match.label;
    if (location.pathname.includes("/profile")) return "Profile Settings";
    return "Dashboard";
  })();

  return (
    <div className="dashboard-container">
      <div className={`dashboard-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`.trim()}>
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <button className="brand-button" onClick={() => handleMenuClick("home")}>
              <span className="brand-mark">
                <Icon name="incidents" />
              </span>
              <span className="brand-text">Fire Service</span>
            </button>
          </div>

          <button
            className="quick-create-button"
            onClick={() => {
              if (!loggedIn) {
                navigate("/login");
                return;
              }
              navigate(`/dashboard/incidents?create=1&ts=${Date.now()}`);
            }}
          >
            <Icon name="quick" />
            <span>Quick Create</span>
          </button>

          <nav className="sidebar-nav">
            <p className="sidebar-section-label">Navigation</p>
            <ul>
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    className={`sidebar-item ${activeMenu === item.id ? "active" : ""}`}
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <Icon name={item.icon} className="sidebar-item-icon" />
                    <span className="sidebar-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {secondaryMenu.length > 0 && (
            <nav className="sidebar-nav secondary">
              <p className="sidebar-section-label">Account</p>
              <ul>
                {secondaryMenu.map((item) => (
                  <li key={item.id}>
                    <button
                      className={`sidebar-item ${activeMenu === item.id ? "active" : ""}`}
                      onClick={() => {
                        if (item.id === "profile") setActiveMenu("profile");
                        navigate(item.route);
                      }}
                    >
                      <Icon name={item.icon} className="sidebar-item-icon" />
                      <span className="sidebar-label">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {loggedIn ? (
            <div className="sidebar-user-card" ref={userMenuRef}>
              <button
                className="sidebar-user-main"
                onClick={() => setShowUserMenu((prev) => !prev)}
                aria-label="Open user menu"
              >
                <span className="sidebar-avatar">{initials}</span>
                <span className="sidebar-user-meta">
                  <strong>{displayName}</strong>
                  <small>{roleLabel}</small>
                </span>
              </button>
              <button
                className="sidebar-user-menu-btn"
                onClick={() => setShowUserMenu((prev) => !prev)}
                aria-label="Open user menu"
              >
                <Icon name="more" />
              </button>

              {showUserMenu && (
                <div className="user-dropdown sidebar-user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      <span className="avatar-initial">{initials}</span>
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-username">{displayName}</div>
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
                    <Icon name="settings" className="dropdown-icon" />
                    Profile Settings
                  </button>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <Icon name="logout" className="dropdown-icon" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="sidebar-login-btn" onClick={() => navigate("/login")}>
              <Icon name="login" />
              <span>Login</span>
            </button>
          )}
        </aside>

        <section className="dashboard-main">
          <header className="dashboard-topbar">
            <div className="topbar-title">
              <button
                type="button"
                className={`sidebar-toggle-button ${isSidebarCollapsed ? "collapsed" : ""}`.trim()}
                onClick={toggleSidebar}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!isSidebarCollapsed}
              >
                <Icon name="panelToggle" />
              </button>
              <span className="topbar-divider" />
              <h1>{pageTitle}</h1>
            </div>

            {loggedIn && (
              <div className="topbar-actions">
                <div className="notifications-container" ref={notificationsRef}>
                  <button
                    className="notification-button"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    aria-label="Notifications"
                  >
                    <Icon name="bell" className="notification-icon" />
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
                              dismissNotification(item.id);
                              setShowNotifications(false);
                              if (item.route) navigate(item.route);
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
                      <button className="view-all-btn" onClick={dismissAllNotifications}>
                        Dismiss All
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </header>

          <main className="dashboard-content">
            <Outlet />
          </main>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
