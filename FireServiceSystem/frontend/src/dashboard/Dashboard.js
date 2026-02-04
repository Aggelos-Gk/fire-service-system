import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const userMenuRef = useRef(null);
  const notificationsRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState("home");

  useEffect(() => {
    const savedUsername = localStorage.getItem("username");
    if (savedUsername) {
      setUsername(savedUsername);
    }

    // Close menus when clicking outside
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    setUsername("");
    navigate("/login");
  };

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : "?";
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Searching for:", searchQuery);
      // Implement search functionality
    }
  };

  const menuItems = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "incidents", label: "Incidents", icon: "🔥" },
    { id: "participations", label: "Participations", icon: "👥" },
  ];

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">
            <div className="fire-icon-small">🔥</div>
            <h1>FIRE SERVICE</h1>
          </div>
        </div>

        <div className="header-center">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search incidents, personnel, equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-button">
              🔍
            </button>
          </form>
        </div>

        <div className="header-right">
          <div className="header-actions">
            {/* Notifications */}
            <div className="notifications-container" ref={notificationsRef}>
              <button
                className="notification-button"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <span className="notification-icon">🔔</span>
                <span className="notification-badge">3</span>
              </button>

              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h3>Notifications</h3>
                    <span className="notifications-count">3 new</span>
                  </div>
                  <div className="notifications-list">
                    <div className="notification-item">
                      <div className="notification-icon-small">🔥</div>
                      <div className="notification-content">
                        <p>New incident reported in Downtown</p>
                        <span className="notification-time">5 min ago</span>
                      </div>
                    </div>
                    <div className="notification-item">
                      <div className="notification-icon-small">🛠️</div>
                      <div className="notification-content">
                        <p>Equipment maintenance required</p>
                        <span className="notification-time">2 hours ago</span>
                      </div>
                    </div>
                    <div className="notification-item">
                      <div className="notification-icon-small">📋</div>
                      <div className="notification-content">
                        <p>Monthly report ready for review</p>
                        <span className="notification-time">1 day ago</span>
                      </div>
                    </div>
                  </div>
                  <button className="view-all-btn">View All Notifications</button>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="user-section" ref={userMenuRef}>
              <button
                className={`user-circle ${username ? 'logged-in' : 'guest'}`}
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                {username ? (
                  <span className="user-initial">{getInitials(username)}</span>
                ) : (
                  <span className="login-text">?</span>
                )}
              </button>

              {showUserMenu && username && (
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      <span className="avatar-initial">{getInitials(username)}</span>
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-username">{username}</div>
                      <div className="dropdown-role">Fire Service Operator</div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item">
                    <span className="dropdown-icon">👤</span>
                    My Profile
                  </button>
                  <button className="dropdown-item">
                    <span className="dropdown-icon">⚙️</span>
                    Account Settings
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout" onClick={handleLogout}>
                    <span className="dropdown-icon">🚪</span>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="main-layout">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <ul>
              {menuItems.map((item) => (
                <li key={item.id}>
                  <button
                    className={`sidebar-item ${activeMenu === item.id ? 'active' : ''}`}
                    onClick={() => setActiveMenu(item.id)}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-content">
          <div className="content-header">
            <h2>
              {activeMenu === "home" && "Dashboard Overview"}
              {activeMenu === "incidents" && "Incident Management"}
              {activeMenu === "participations" && "Participations"}
            </h2>
          </div>

          <div className="content-grid">
            {/* Stats Cards */}
            <div className="stats-container">
              <div className="stat-card">
                <div className="stat-icon">🔥</div>
                <div className="stat-info">
                  <div className="stat-value">12</div>
                  <div className="stat-label">Active Incidents</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">👨‍🚒</div>
                <div className="stat-info">
                  <div className="stat-value">48</div>
                  <div className="stat-label">Active Responders</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⏱️</div>
                <div className="stat-info">
                  <div className="stat-value">4.2m</div>
                  <div className="stat-label">Avg Response Time</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <div className="stat-value">94%</div>
                  <div className="stat-label">System Ready</div>
                </div>
              </div>
            </div>

            {/* Main Content Card */}
            <div className="main-card">
              <div className="card-title">
                <h3>Recent Activity</h3>
              </div>
              <div className="card-content">
                <p>No recent activity to display.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;