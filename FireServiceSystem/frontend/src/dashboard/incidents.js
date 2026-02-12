import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./incidents.css";
import { fetchJson } from "../utils/api";
import { getStoredSession, normalizeRole } from "../utils/session";
import { formatRelativeTime } from "../utils/time";
import FreeMap from "./FreeMap";

const extractApiError = (error, fallback) => {
  const raw = String(error?.message || "");
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (parsed?.message) return parsed.message;
    } catch (parseError) {
      // ignore and return fallback
    }
  }
  return fallback;
};

function Incidents() {
  const [searchParams] = useSearchParams();
  const openIncidentId = Number(searchParams.get("open"));

  const session = getStoredSession();
  const role = normalizeRole(session.role);
  const userId = session.userId;
  const isAdmin = role === "ADMIN";
  const isVolunteer = role === "VOLUNTEER";

  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [participantRequests, setParticipantRequests] = useState([]);
  const [incidentParticipants, setIncidentParticipants] = useState([]);
  const [volunteerRole, setVolunteerRole] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    location: "",
    lat: "",
    lon: "",
    neededDrivers: "0",
    neededFirefighters: "0"
  });

  const loadIncidents = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      }
      setError("");
      const data = await fetchJson(`/api/incidents?viewerRole=${encodeURIComponent(role || "GUEST")}`);
      setIncidents(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error(loadError);
      setError("Could not load incidents.");
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }, [role]);

  const loadParticipantRequests = useCallback(async (incidentId) => {
    if (!incidentId) {
      setParticipantRequests([]);
      return;
    }

    try {
      if (isAdmin) {
        const rows = await fetchJson(`/api/participants/requests?incidentId=${incidentId}`);
        setParticipantRequests(Array.isArray(rows) ? rows : []);
      } else if (isVolunteer && userId) {
        const rows = await fetchJson(`/api/participants/requests?incidentId=${incidentId}&userId=${userId}`);
        setParticipantRequests(Array.isArray(rows) ? rows : []);
      } else {
        setParticipantRequests([]);
      }
    } catch (requestError) {
      console.error(requestError);
      setParticipantRequests([]);
    }
  }, [isAdmin, isVolunteer, userId]);

  const loadIncidentParticipants = useCallback(async (incidentId) => {
    if (!incidentId) {
      setIncidentParticipants([]);
      return;
    }

    try {
      const rows = await fetchJson(`/api/participants?incidentId=${incidentId}`);
      setIncidentParticipants(Array.isArray(rows) ? rows : []);
    } catch (participantError) {
      console.error(participantError);
      setIncidentParticipants([]);
    }
  }, []);

  useEffect(() => {
    loadIncidents(true);
    const timer = setInterval(() => loadIncidents(false), 45000);
    return () => clearInterval(timer);
  }, [loadIncidents]);

  useEffect(() => {
    if (!Number.isFinite(openIncidentId)) return;
    const found = incidents.find((incident) => incident.id === openIncidentId);
    if (found) {
      setSelectedIncident(found);
    }
  }, [incidents, openIncidentId]);

  useEffect(() => {
    if (selectedIncident?.id) {
      loadParticipantRequests(selectedIncident.id);
      loadIncidentParticipants(selectedIncident.id);
    } else {
      setParticipantRequests([]);
      setIncidentParticipants([]);
    }
  }, [selectedIncident, loadParticipantRequests, loadIncidentParticipants]);

  useEffect(() => {
    if (!isVolunteer || !userId) {
      setVolunteerRole("");
      return;
    }

    const loadVolunteerRole = async () => {
      try {
        const user = await fetchJson(`/api/users/${userId}`);
        setVolunteerRole((user.volunteerRole || "").toUpperCase());
      } catch (userError) {
        console.error(userError);
        setVolunteerRole("");
      }
    };

    loadVolunteerRole();
  }, [isVolunteer, userId]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      const status = (incident.status || "").toLowerCase();
      const matchesFilter = filterStatus === "all" || status === filterStatus;
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        !query ||
        (incident.title || "").toLowerCase().includes(query) ||
        (incident.location || "").toLowerCase().includes(query) ||
        String(incident.id || "").includes(query) ||
        (incident.incidentCode || "").toLowerCase().includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [incidents, filterStatus, searchTerm]);

  const pendingRequests = useMemo(
    () => participantRequests.filter((item) => (item.status || "").toLowerCase() === "requested"),
    [participantRequests]
  );

  const getStatusBadge = (status) => {
    const normalized = (status || "").toLowerCase();
    if (normalized === "active") {
      return { bg: "rgba(255, 107, 107, 0.15)", color: "#ff6b6b", text: "Active" };
    }
    if (normalized === "resolved") {
      return { bg: "rgba(100, 255, 218, 0.15)", color: "#64ffda", text: "Resolved" };
    }
    if (normalized === "requested") {
      return { bg: "rgba(100, 181, 246, 0.15)", color: "#64b5f6", text: "Requested" };
    }
    return { bg: "rgba(255, 167, 38, 0.15)", color: "#ffa726", text: status || "Unknown" };
  };

  const updateIncidentStatus = async (incident, newStatus) => {
    if (!isAdmin || !userId) return;
    try {
      await fetchJson(`/api/incidents/${incident.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, actorId: userId })
      });
      await loadIncidents(false);
      if (selectedIncident?.id === incident.id) {
        setSelectedIncident((prev) => (prev ? { ...prev, status: newStatus } : prev));
      }
    } catch (updateError) {
      console.error(updateError);
      setError("Failed updating incident status.");
    }
  };

  const canVolunteerRequestIncident = (incident) => {
    const status = (incident?.status || "").toLowerCase();
    return status === "active";
  };

  const submitIncident = async (event) => {
    event.preventDefault();
    if (!userId) {
      setError("Login required to create incidents.");
      return;
    }
    if (!createForm.title.trim()) {
      setError("Incident title is required.");
      return;
    }

    try {
      setCreateLoading(true);
      setError("");
      await fetchJson("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createForm.title.trim(),
          description: createForm.description.trim() || null,
          location: createForm.location.trim() || null,
          lat: createForm.lat.trim() ? Number(createForm.lat) : null,
          lon: createForm.lon.trim() ? Number(createForm.lon) : null,
          neededDrivers: createForm.neededDrivers.trim() ? Number(createForm.neededDrivers) : 0,
          neededFirefighters: createForm.neededFirefighters.trim() ? Number(createForm.neededFirefighters) : 0,
          createdBy: userId,
          status: isAdmin ? "active" : "requested"
        })
      });

      setCreateForm({
        title: "",
        description: "",
        location: "",
        lat: "",
        lon: "",
        neededDrivers: "0",
        neededFirefighters: "0"
      });
      setShowCreateForm(false);
      await loadIncidents(false);
    } catch (submitError) {
      console.error(submitError);
      setError("Failed creating incident.");
    } finally {
      setCreateLoading(false);
    }
  };

  const requestJoinIncidentFor = async (incident) => {
    if (!incident || !userId || !isVolunteer) {
      return;
    }

    try {
      setRequestLoading(true);
      setError("");
      await fetchJson("/api/participants/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: incident.id,
          userId,
          requestedRole: volunteerRole
        })
      });
      if (selectedIncident?.id === incident.id) {
        await loadParticipantRequests(incident.id);
        await loadIncidentParticipants(incident.id);
      }
    } catch (requestError) {
      console.error(requestError);
      setError(extractApiError(requestError, "Failed sending participation request."));
    } finally {
      setRequestLoading(false);
    }
  };

  const requestJoinIncident = async () => {
    if (!selectedIncident) return;
    await requestJoinIncidentFor(selectedIncident);
  };

  const deleteIncident = async (incident) => {
    if (!isAdmin || !userId || !incident?.id) return;
    const confirmed = window.confirm("Delete this incident permanently?");
    if (!confirmed) return;

    try {
      setError("");
      await fetchJson(`/api/incidents/${incident.id}?actorId=${encodeURIComponent(userId)}`, {
        method: "DELETE"
      });
      if (selectedIncident?.id === incident.id) {
        setSelectedIncident(null);
      }
      await loadIncidents(false);
    } catch (deleteError) {
      console.error(deleteError);
      setError(extractApiError(deleteError, "Failed deleting incident."));
    }
  };

  const decideRequest = async (requestId, status) => {
    if (!isAdmin || !userId) return;
    try {
      setError("");
      await fetchJson(`/api/participants/requests/${requestId}/decision`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          decidedBy: userId
        })
      });
      if (selectedIncident?.id) {
        await loadParticipantRequests(selectedIncident.id);
      }
    } catch (decisionError) {
      console.error(decisionError);
      setError("Failed updating volunteer request.");
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "N/A";
    return date.toLocaleString();
  };

  const hasPendingOwnRequest = useMemo(
    () => participantRequests.some((request) => (request.status || "").toLowerCase() === "requested"),
    [participantRequests]
  );

  const assignedDrivers = useMemo(
    () => incidentParticipants.filter((item) => (item.role || "").toLowerCase() === "driver").length,
    [incidentParticipants]
  );

  const assignedFirefighters = useMemo(
    () => incidentParticipants.filter((item) => (item.role || "").toLowerCase() === "firefighter").length,
    [incidentParticipants]
  );

  const volunteerNeed = useMemo(() => {
    if (!selectedIncident) return { needed: 0, assigned: 0, remaining: 0 };
    if (volunteerRole === "DRIVER") {
      const needed = Number(selectedIncident.neededDrivers || 0);
      const remaining = Math.max(needed - assignedDrivers, 0);
      return { needed, assigned: assignedDrivers, remaining };
    }
    if (volunteerRole === "FIREFIGHTER") {
      const needed = Number(selectedIncident.neededFirefighters || 0);
      const remaining = Math.max(needed - assignedFirefighters, 0);
      return { needed, assigned: assignedFirefighters, remaining };
    }
    return { needed: 0, assigned: 0, remaining: 0 };
  }, [assignedDrivers, assignedFirefighters, selectedIncident, volunteerRole]);

  return (
    <div className="incidents-container">
      <div className="content-header">
        <h2>Incident Management</h2>
        {userId && (
          <button className="new-incident-btn" onClick={() => setShowCreateForm((prev) => !prev)}>
            {showCreateForm ? "Close Form" : "New Incident"}
          </button>
        )}
      </div>

      {error && <div className="inline-error">{error}</div>}
      {loading && <div className="inline-loading">Loading incidents...</div>}

      {showCreateForm && userId && (
        <form className="incident-form-card" onSubmit={submitIncident}>
          <div className="message-form-row">
            <input
              type="text"
              placeholder="Incident title"
              value={createForm.title}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
              className="search-incidents-input"
            />
          </div>
          <div className="message-form-row">
            <textarea
              placeholder="Description"
              value={createForm.description}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
              className="message-textarea"
              rows={4}
            />
          </div>
          <div className="message-form-row two-col">
            <input
              type="text"
              placeholder="Location"
              value={createForm.location}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, location: e.target.value }))}
              className="search-incidents-input"
            />
            <div className="message-form-row two-col">
              <input
                type="text"
                placeholder="Lat"
                value={createForm.lat}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, lat: e.target.value }))}
                className="search-incidents-input"
              />
              <input
                type="text"
                placeholder="Lon"
                value={createForm.lon}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, lon: e.target.value }))}
                className="search-incidents-input"
              />
            </div>
          </div>
          <div className="message-form-row two-col">
            <input
              type="number"
              min="0"
              placeholder="Needed Drivers"
              value={createForm.neededDrivers}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, neededDrivers: e.target.value }))}
              className="search-incidents-input"
            />
            <input
              type="number"
              min="0"
              placeholder="Needed Firefighters"
              value={createForm.neededFirefighters}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, neededFirefighters: e.target.value }))}
              className="search-incidents-input"
            />
          </div>
          <div className="message-form-actions">
            <button type="submit" className="incident-action-btn view-btn" disabled={createLoading}>
              {createLoading ? "Saving..." : isAdmin ? "Create Incident" : "Request Incident"}
            </button>
          </div>
        </form>
      )}

      <div className="incidents-controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            All
          </button>
          <button
            className={`filter-btn ${filterStatus === "active" ? "active" : ""}`}
            onClick={() => setFilterStatus("active")}
          >
            Active
          </button>
          <button
            className={`filter-btn ${filterStatus === "resolved" ? "active" : ""}`}
            onClick={() => setFilterStatus("resolved")}
          >
            Resolved
          </button>
          {isAdmin && (
            <button
              className={`filter-btn ${filterStatus === "requested" ? "active" : ""}`}
              onClick={() => setFilterStatus("requested")}
            >
              Requested
            </button>
          )}
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-incidents-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="incidents-list">
        {filteredIncidents.length > 0 ? (
          filteredIncidents.map((incident) => {
            const statusStyle = getStatusBadge(incident.status);
            const resolved = (incident.status || "").toLowerCase() === "resolved";
            const requested = (incident.status || "").toLowerCase() === "requested";
            const canVolunteerRequest = canVolunteerRequestIncident(incident);

            return (
              <div
                key={incident.id}
                className={`incident-card ${openIncidentId === incident.id ? "highlight" : ""}`}
              >
                <div className="incident-header">
                  <div className="incident-id-section">
                    <span className="incident-id">{incident.incidentCode || `#${incident.id}`}</span>
                    <span
                      className="status-badge"
                      style={{ background: statusStyle.bg, color: statusStyle.color }}
                    >
                      {statusStyle.text}
                    </span>
                  </div>
                  <span className="incident-time">{formatRelativeTime(incident.createdAt)}</span>
                </div>

                <div className="incident-body">
                  <h3 className="incident-title">{incident.title}</h3>
                  <div className="incident-meta">
                    <div className="meta-item">
                      <span className="meta-icon">📍</span>
                      <span className="meta-text">{incident.location || "No location set"}</span>
                    </div>
                    {typeof incident.lat === "number" && typeof incident.lon === "number" && (
                      <div className="meta-item">
                        <span className="meta-icon">🧭</span>
                        <span className="meta-text">
                          {incident.lat.toFixed(4)}, {incident.lon.toFixed(4)}
                        </span>
                      </div>
                    )}
                    <div className="meta-item">
                      <span className="meta-icon">🚒</span>
                      <span className="meta-text">
                        Need Drivers: {incident.neededDrivers ?? 0}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon">🧑‍🚒</span>
                      <span className="meta-text">
                        Need Firefighters: {incident.neededFirefighters ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="incident-footer">
                  <button
                    className="incident-action-btn view-btn"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    View Details
                  </button>

                  {isVolunteer && canVolunteerRequest && (
                    <button
                      className="incident-action-btn update-btn"
                      onClick={() => requestJoinIncidentFor(incident)}
                      disabled={requestLoading || !volunteerRole}
                    >
                      {requestLoading ? "Sending..." : volunteerRole ? "Request Join" : "Set Role First"}
                    </button>
                  )}

                  {isAdmin && requested && (
                    <>
                      <button
                        className="incident-action-btn update-btn"
                        onClick={() => updateIncidentStatus(incident, "active")}
                      >
                        Accept
                      </button>
                      <button
                        className="incident-action-btn reject-btn"
                        onClick={() => updateIncidentStatus(incident, "resolved")}
                      >
                        Resolve
                      </button>
                    </>
                  )}

                  {isAdmin && !requested && (
                    <button
                      className="incident-action-btn update-btn"
                      onClick={() => updateIncidentStatus(incident, resolved ? "active" : "resolved")}
                    >
                      {resolved ? "Set Active" : "Set Resolved"}
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      className="incident-action-btn delete-btn"
                      onClick={() => deleteIncident(incident)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-incidents">
            <span className="no-incidents-icon">🔍</span>
            <p>No incidents found matching your criteria</p>
          </div>
        )}
      </div>

      {selectedIncident && (
        <div className="incident-modal-backdrop" onClick={() => setSelectedIncident(null)}>
          <div className="incident-modal" onClick={(e) => e.stopPropagation()}>
            <div className="incident-modal-header">
              <h3>{selectedIncident.title}</h3>
              <button
                className="incident-modal-close"
                onClick={() => setSelectedIncident(null)}
                aria-label="Close details"
              >
                ×
              </button>
            </div>

            <div className="incident-modal-body">
              <div className="incident-details-grid">
                <div className="detail-item"><strong>Code:</strong> {selectedIncident.incidentCode || `#${selectedIncident.id}`}</div>
                <div className="detail-item"><strong>Status:</strong> {selectedIncident.status || "N/A"}</div>
                <div className="detail-item"><strong>Location:</strong> {selectedIncident.location || "N/A"}</div>
                <div className="detail-item"><strong>Latitude:</strong> {typeof selectedIncident.lat === "number" ? selectedIncident.lat.toFixed(6) : "N/A"}</div>
                <div className="detail-item"><strong>Longitude:</strong> {typeof selectedIncident.lon === "number" ? selectedIncident.lon.toFixed(6) : "N/A"}</div>
                <div className="detail-item"><strong>Needed Drivers:</strong> {selectedIncident.neededDrivers ?? 0}</div>
                <div className="detail-item"><strong>Needed Firefighters:</strong> {selectedIncident.neededFirefighters ?? 0}</div>
                <div className="detail-item"><strong>Created At:</strong> {formatDateTime(selectedIncident.createdAt)}</div>
                <div className="detail-item"><strong>Updated At:</strong> {formatDateTime(selectedIncident.updatedAt)}</div>
              </div>

              {selectedIncident.description && (
                <p className="incident-description">{selectedIncident.description}</p>
              )}

              {typeof selectedIncident.lat === "number" && typeof selectedIncident.lon === "number" ? (
                <FreeMap
                  center={{ lat: selectedIncident.lat, lon: selectedIncident.lon }}
                  markers={[
                    {
                      id: `incident-${selectedIncident.id}`,
                      type: "incident",
                      lat: selectedIncident.lat,
                      lon: selectedIncident.lon,
                      label: selectedIncident.title
                    }
                  ]}
                  zoom={13}
                  height={300}
                />
              ) : (
                <p className="incident-description">No coordinates provided for map pin.</p>
              )}

              {isVolunteer && (
                <div className="request-panel">
                  <h4>Volunteer Request</h4>
                  {["active"].includes((selectedIncident.status || "").toLowerCase()) ? (
                    <>
                      {volunteerRole ? (
                        <>
                          <p>
                            Your role: <strong>{volunteerRole === "FIREFIGHTER" ? "Firefighter" : "Driver"}</strong>.
                            Slots {volunteerNeed.assigned}/{volunteerNeed.needed}, open: {volunteerNeed.remaining}.
                          </p>
                          <div className="request-row">
                            <button
                              className="incident-action-btn view-btn"
                              onClick={requestJoinIncident}
                              disabled={requestLoading || hasPendingOwnRequest || volunteerNeed.remaining <= 0}
                            >
                              {hasPendingOwnRequest
                                ? "Already Requested"
                                : volunteerNeed.remaining <= 0
                                  ? "No Open Slots"
                                  : requestLoading
                                    ? "Sending..."
                                    : "Request Join"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p>Set your volunteer role in Profile Settings first (Firefighter or Driver).</p>
                      )}
                    </>
                  ) : (
                    <p>Participation requests are available only for active incidents.</p>
                  )}
                </div>
              )}

              {isAdmin && (
                <div className="request-panel">
                  <h4>Volunteer Requests ({pendingRequests.length} pending)</h4>
                  {participantRequests.length === 0 && <p>No requests for this incident yet.</p>}
                  {participantRequests.map((request) => (
                    <div key={request.id} className="request-item">
                      <div>
                        <strong>{request.username || `User ${request.userId}`}</strong> requested <strong>{request.requestedRole}</strong>
                        <span className={`request-status status-${(request.status || "").toLowerCase()}`}>
                          {(request.status || "requested").toUpperCase()}
                        </span>
                      </div>
                      {(request.status || "").toLowerCase() === "requested" && (
                        <div className="request-actions">
                          <button
                            className="incident-action-btn update-btn"
                            onClick={() => decideRequest(request.id, "approved")}
                          >
                            Approve
                          </button>
                          <button
                            className="incident-action-btn reject-btn"
                            onClick={() => decideRequest(request.id, "rejected")}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Incidents;
