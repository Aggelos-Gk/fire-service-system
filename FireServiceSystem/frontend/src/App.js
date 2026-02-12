import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Dashboard from "./dashboard/Dashboard";
import Home from "./dashboard/home";
import Incidents from "./dashboard/incidents";
import History from "./dashboard/History";
import Participations from "./dashboard/Participations";
import Login from "./auth/login";
import Register from "./auth/register";
import Messages from "./dashboard/messages";
import ProfileSettings from "./dashboard/ProfileSettings";
import Users from "./dashboard/Users";
import { getStoredSession, isLoggedIn, normalizeRole } from "./utils/session";

function RequireAuth() {
  const loggedIn = isLoggedIn(getStoredSession());
  if (!loggedIn) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function RequireAdmin() {
  const session = getStoredSession();
  const loggedIn = isLoggedIn(session);
  const role = normalizeRole(session.role);
  if (!loggedIn || role !== "ADMIN") {
    return <Navigate to="/not-found" replace />;
  }
  return <Outlet />;
}

function NotFound() {
  return <div style={{ padding: "2rem", color: "#fff" }}>Website cannot find it.</div>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/not-found" element={<NotFound />} />
        
        <Route path="/dashboard" element={<Dashboard />}>
          <Route index element={<Navigate to="/dashboard/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="incidents" element={<Incidents />} />
          <Route element={<RequireAuth />}>
            <Route path="history" element={<History />} />
            <Route path="participations" element={<Participations />} />
            <Route path="messages" element={<Messages />} />
            <Route path="profile" element={<ProfileSettings />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="users" element={<Users />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard/home" replace />} />
        <Route path="*" element={<Navigate to="/dashboard/home" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
