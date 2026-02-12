import React, { useEffect, useMemo, useState } from "react";
import "./home.css";
import { fetchJson } from "../utils/api";
import { haversineKm } from "../utils/geo";
import { getStoredSession, normalizeRole } from "../utils/session";
import { formatRelativeTime } from "../utils/time";
import FreeMap from "./FreeMap";

const formatIncidentCode = (incident) => {
  const raw = (incident?.incidentCode || "").trim().toUpperCase();
  if (raw.startsWith("INC-")) {
    return raw;
  }
  if (raw) {
    return `INC-${raw}`;
  }
  return `INC-${incident?.id ?? "N/A"}`;
};

function Home() {
  const session = getStoredSession();
  const role = normalizeRole(session.role) || "GUEST";
  const userId = session.userId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [volunteersCount, setVolunteersCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async (initial = false) => {
      if (initial) {
        setLoading(true);
      }
      setError("");
      try {
        const requests = [
          fetchJson(`/api/incidents?viewerRole=${encodeURIComponent(role)}`),
          fetchJson("/api/participants"),
          fetchJson(`/api/messages?viewerRole=${encodeURIComponent(role)}${userId ? `&viewerId=${userId}` : ""}`),
          fetchJson("/api/users?role=VOLUNTEER")
        ];

        if (userId) {
          requests.push(fetchJson(`/api/users/${userId}`));
        }

        const result = await Promise.all(requests);
        if (!mounted) return;

        setIncidents(Array.isArray(result[0]) ? result[0] : []);
        setParticipants(Array.isArray(result[1]) ? result[1] : []);
        setMessages(Array.isArray(result[2]) ? result[2] : []);
        setVolunteersCount(Array.isArray(result[3]) ? result[3].length : 0);
        setCurrentUser(userId ? result[4] || null : null);
      } catch (loadError) {
        console.error(loadError);
        if (mounted) setError("Could not load dashboard data.");
      } finally {
        if (mounted && initial) setLoading(false);
      }
    };

    load(true);
    const timer = setInterval(() => load(false), 45000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [role, userId]);

  const stats = useMemo(() => {
    const activeIncidents = incidents.filter((item) => (item.status || "").toLowerCase() === "active");
    const activeIncidentIds = new Set(activeIncidents.map((item) => item.id));
    const activeResponders = participants.filter((item) => activeIncidentIds.has(item.incidentId)).length;

    return {
      activeIncidents: activeIncidents.length,
      activeResponders,
      totalIncidents: incidents.length,
      totalVolunteers: volunteersCount
    };
  }, [incidents, participants, volunteersCount]);

  const visibleMessages = useMemo(() => {
    return messages;
  }, [messages]);

  const adminOverview = useMemo(() => {
    const statusCounts = incidents.reduce((acc, item) => {
      const key = (item.status || "unknown").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const latestIncidents = [...incidents]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    const latestMessages = [...visibleMessages]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    return { statusCounts, latestIncidents, latestMessages };
  }, [incidents, visibleMessages]);

  const nearby = useMemo(() => {
    if (!currentUser || typeof currentUser.lat !== "number" || typeof currentUser.lon !== "number") {
      return [];
    }

    return incidents
      .filter((item) => typeof item.lat === "number" && typeof item.lon === "number")
      .map((item) => ({
        ...item,
        distanceKm: haversineKm(currentUser.lat, currentUser.lon, item.lat, item.lon)
      }))
      .filter((item) => item.distanceKm <= 30)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [currentUser, incidents]);

  const mapCenter = useMemo(() => {
    if (!currentUser || typeof currentUser.lat !== "number" || typeof currentUser.lon !== "number") {
      return null;
    }
    return { lat: currentUser.lat, lon: currentUser.lon };
  }, [currentUser]);

  const mapMarkers = useMemo(() => {
    if (!mapCenter) return [];

    const markers = [
      {
        id: "current-user",
        type: "user",
        lat: mapCenter.lat,
        lon: mapCenter.lon,
        label: "Your position"
      }
    ];

    nearby.forEach((incident) => {
      const code = formatIncidentCode(incident);
      markers.push({
        id: `incident-${incident.id}`,
        type: "incident",
        lat: incident.lat,
        lon: incident.lon,
        label: `${code} • ${(incident.status || "active").toUpperCase()} • ${incident.distanceKm.toFixed(1)} km`
      });
    });

    return markers;
  }, [mapCenter, nearby]);

  return (
    <div className="home-container">
      <div className="content-header">
        <h2>Dashboard Overview</h2>
      </div>

      {error && <div className="data-error">{error}</div>}
      {loading && <div className="data-loading">Loading data...</div>}

      <div className="content-grid">
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-info">
              <div className="stat-value">{stats.activeIncidents}</div>
              <div className="stat-label">Active Incidents</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👨‍🚒</div>
            <div className="stat-info">
              <div className="stat-value">{stats.activeResponders}</div>
              <div className="stat-label">Active Responders</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalIncidents}</div>
              <div className="stat-label">Total Incidents</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🙋</div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalVolunteers}</div>
              <div className="stat-label">Total Volunteers</div>
            </div>
          </div>
        </div>

        {role === "ADMIN" ? (
          <div className="main-card admin-board">
            <div className="card-title">
              <h3>Admin Operations Board</h3>
            </div>
            <div className="card-content left">
              <div className="admin-overview-grid">
                <div className="admin-section status-panel">
                  <h4>Incident Status</h4>
                  <div className="simple-list">
                    <div className="simple-list-row">
                      <span>Active</span>
                      <strong>{adminOverview.statusCounts.active || 0}</strong>
                    </div>
                    <div className="simple-list-row">
                      <span>Resolved</span>
                      <strong>{adminOverview.statusCounts.resolved || 0}</strong>
                    </div>
                    <div className="simple-list-row">
                      <span>Requested</span>
                      <strong>{adminOverview.statusCounts.requested || 0}</strong>
                    </div>
                  </div>
                </div>

                <div className="admin-section">
                  <h4>Latest Incidents</h4>
                  <div className="simple-list">
                    {adminOverview.latestIncidents.map((incident) => (
                      <div key={incident.id} className="simple-list-row compact">
                        <span>{incident.title || incident.incidentCode}</span>
                        <small>{formatRelativeTime(incident.createdAt)}</small>
                      </div>
                    ))}
                    {adminOverview.latestIncidents.length === 0 && (
                      <div className="simple-list-row compact">
                        <span>No incidents</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-section">
                  <h4>Latest Messages</h4>
                  <div className="simple-list">
                    {adminOverview.latestMessages.map((message) => (
                      <div key={message.id} className="simple-list-row compact">
                        <span>{message.title}</span>
                        <small>{formatRelativeTime(message.createdAt)}</small>
                      </div>
                    ))}
                    {adminOverview.latestMessages.length === 0 && (
                      <div className="simple-list-row compact">
                        <span>No messages</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="main-card">
            <div className="card-title">
              <h3>Nearby Incidents (30 km)</h3>
            </div>
            <div className="card-content left map-content">
              {!currentUser && (
                <p className="home-info-text">
                  Login to load your position and nearby incidents map.
                </p>
              )}

              {currentUser && (typeof currentUser.lat !== "number" || typeof currentUser.lon !== "number") && (
                <p className="home-info-text">
                  Your account has no location yet (`lat/lon`), so nearby incidents cannot be calculated.
                </p>
              )}

              {mapCenter && (
                <FreeMap
                  center={mapCenter}
                  markers={mapMarkers}
                  zoom={12}
                  height={320}
                />
              )}

              {nearby.length > 0 && (
                <div className="nearby-incidents-scroll">
                  {nearby.map((incident) => {
                    const code = formatIncidentCode(incident);
                    const status = (incident.status || "active").toLowerCase();
                    return (
                      <div key={incident.id} className="nearby-incident-card">
                        <div className="nearby-incident-top">
                          <span className="nearby-incident-code">{code}</span>
                          <span className={`nearby-incident-status status-${status}`}>{status.toUpperCase()}</span>
                        </div>
                        <div className="nearby-incident-title">{incident.title || code}</div>
                        <div className="nearby-incident-meta">
                          <span>{incident.location || "No location provided"}</span>
                          <strong>{incident.distanceKm.toFixed(1)} km</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {currentUser && nearby.length === 0 && mapCenter && (
                <p className="home-info-text">No incidents found within 30 km of your location.</p>
              )}

              {currentUser && nearby.length > 0 && (
                <div className="home-info-text nearby-hint">
                  Showing only incidents within 30 km from your position.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
