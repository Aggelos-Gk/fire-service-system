import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./participations.css";
import "./theme-overrides.css";
import { fetchJson } from "../utils/api";
import { getStoredSession, normalizeRole } from "../utils/session";
import { formatRelativeTime } from "../utils/time";
import SectionIcon from "./sectionIcon";

const toTimestamp = (value) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatIncidentCode = (incident, fallbackIncidentId) => {
  const raw = (incident?.incidentCode || "").trim().toUpperCase();
  if (raw.startsWith("INC-")) return raw;
  if (raw) return `INC-${raw}`;
  const fallback = Number.isFinite(Number(fallbackIncidentId)) ? fallbackIncidentId : incident?.id;
  return `INC-${fallback ?? "N/A"}`;
};

const incidentTitle = (incident, incidentId) => {
  if (incident?.title && incident.title.trim()) {
    return incident.title.trim();
  }
  return `Incident #${incidentId ?? "-"}`;
};

const normalizeParticipantRole = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "driver") return "Driver";
  if (normalized === "firefighter") return "Firefighter";
  return "";
};

const normalizeRequestedRole = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "DRIVER" || normalized === "FIREFIGHTER") {
    return normalized;
  }
  return "";
};

function Participations() {
  const [searchParams] = useSearchParams();
  const highlightedRequestParam = searchParams.get("request");
  const highlightedRequestId = highlightedRequestParam ? Number(highlightedRequestParam) : Number.NaN;

  const session = getStoredSession();
  const role = normalizeRole(session.role);
  const userId = session.userId;
  const isAdmin = role === "ADMIN";
  const isVolunteer = role === "VOLUNTEER";

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [requestRoleFilter, setRequestRoleFilter] = useState("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [participantRequests, setParticipantRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestCardRefs = useRef(new Map());
  const openedRequestNotificationRef = useRef(null);

  const dismissParticipationNotification = useCallback((requestId) => {
    if (!userId || !Number.isFinite(requestId)) {
      return;
    }

    fetchJson("/api/notifications/dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        viewerId: userId,
        notificationIds: [`participant-request-${requestId}`]
      })
    })
      .then(() => window.dispatchEvent(new Event("notifications:refresh")))
      .catch((markError) => console.error("Failed dismissing participation notification:", markError));
  }, [userId]);

  const loadParticipants = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      }
      setError("");

      const participantCall = isAdmin
        ? fetchJson("/api/participants")
        : isVolunteer && userId
          ? fetchJson(`/api/participants?userId=${userId}`)
          : Promise.resolve([]);

      const requestCall = isAdmin
        ? fetchJson("/api/participants/requests")
        : userId
          ? fetchJson(`/api/participants/requests?userId=${userId}`)
          : Promise.resolve([]);

      const incidentCall = fetchJson(`/api/incidents?viewerRole=${encodeURIComponent(role || "GUEST")}`)
        .catch((incidentError) => {
          console.error("Failed loading incidents:", incidentError);
          return [];
        });

      const [participantData, requestData, incidentData] = await Promise.all([participantCall, requestCall, incidentCall]);
      const normalizedParticipants = (Array.isArray(participantData) ? participantData : [])
        .map((item) => ({ ...item, role: normalizeParticipantRole(item?.role) }))
        .filter((item) => Boolean(item.role));
      const normalizedRequests = (Array.isArray(requestData) ? requestData : [])
        .map((item) => ({ ...item, requestedRole: normalizeRequestedRole(item?.requestedRole) }))
        .filter((item) => Boolean(item.requestedRole));
      setParticipants(normalizedParticipants);
      setParticipantRequests(normalizedRequests);
      setIncidents(Array.isArray(incidentData) ? incidentData : []);
    } catch (loadError) {
      console.error(loadError);
      setError("Could not load participants.");
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }, [isAdmin, isVolunteer, role, userId]);

  const decideRequest = async (requestId, status) => {
    if (!isAdmin || !userId) return;
    try {
      await fetchJson(`/api/participants/requests/${requestId}/decision`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, decidedBy: userId })
      });
      await loadParticipants(false);
      window.dispatchEvent(new Event("notifications:refresh"));
    } catch (decisionError) {
      console.error(decisionError);
      setError("Failed to update request.");
    }
  };

  useEffect(() => {
    loadParticipants(true);
    const timer = setInterval(() => loadParticipants(false), 45000);
    return () => clearInterval(timer);
  }, [loadParticipants]);

  useEffect(() => {
    if (!Number.isFinite(highlightedRequestId)) {
      return;
    }
    if (openedRequestNotificationRef.current === highlightedRequestId) {
      return;
    }
    openedRequestNotificationRef.current = highlightedRequestId;
    dismissParticipationNotification(highlightedRequestId);
  }, [dismissParticipationNotification, highlightedRequestId]);

  const incidentById = useMemo(() => {
    return incidents.reduce((acc, incident) => {
      const key = Number(incident?.id);
      if (Number.isFinite(key)) {
        acc.set(key, incident);
      }
      return acc;
    }, new Map());
  }, [incidents]);

  const uniqueRoles = useMemo(() => {
    return [...new Set(participants.map((item) => item.role).filter(Boolean))];
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((participant) => {
      const matchesFilter = filterRole === "all" || participant.role === filterRole;
      const query = searchTerm.trim().toLowerCase();
      if (!query) {
        return matchesFilter;
      }

      if (isAdmin) {
        const matchesSearch =
          (participant.username || "").toLowerCase().includes(query)
          || String(participant.userId || "").includes(query)
          || (participant.role || "").toLowerCase().includes(query);
        return matchesSearch && matchesFilter;
      }

      const incident = incidentById.get(Number(participant.incidentId));
      const matchesSearch =
        (participant.role || "").toLowerCase().includes(query)
        || (incident?.title || "").toLowerCase().includes(query)
        || (incident?.location || "").toLowerCase().includes(query)
        || formatIncidentCode(incident, participant.incidentId).toLowerCase().includes(query)
        || String(participant.incidentId || "").includes(query);

      return matchesSearch && matchesFilter;
    });
  }, [filterRole, incidentById, isAdmin, participants, searchTerm]);

  const stats = useMemo(() => {
    if (isAdmin) {
      const incidentsCount = new Set(participants.map((participant) => participant.incidentId)).size;
      const volunteers = participants.filter((participant) => participant.userType === "VOLUNTEER").length;
      return {
        total: participants.length,
        incidents: incidentsCount,
        volunteers,
        roles: uniqueRoles.length
      };
    }

    const incidentIds = new Set(participants.map((participant) => Number(participant.incidentId)).filter((id) => Number.isFinite(id)));
    const activeIncidents = new Set(
      participants
        .filter((participant) => {
          const incident = incidentById.get(Number(participant.incidentId));
          return (incident?.status || "").toLowerCase() === "active";
        })
        .map((participant) => Number(participant.incidentId))
        .filter((id) => Number.isFinite(id))
    ).size;

    const approvedRequests = participantRequests.filter((request) => (request.status || "").toLowerCase() === "approved").length;
    const pendingRequests = participantRequests.filter((request) => (request.status || "").toLowerCase() === "requested").length;

    return {
      total: participants.length,
      incidents: incidentIds.size,
      activeIncidents,
      approvedRequests,
      pendingRequests
    };
  }, [incidentById, isAdmin, participantRequests, participants, uniqueRoles.length]);

  const statCards = useMemo(() => {
    if (isAdmin) {
      return [
        { key: "total", icon: "users", value: stats.total, label: "Total Participants" },
        { key: "incidents", icon: "incidents", value: stats.incidents, label: "Incidents Covered" },
        { key: "volunteers", icon: "participations", value: stats.volunteers, label: "Volunteers" },
        { key: "roles", icon: "tag", value: stats.roles, label: "Roles" }
      ];
    }

    return [
      { key: "mine", icon: "participations", value: stats.total, label: "My Participations" },
      { key: "active", icon: "incidents", value: stats.activeIncidents, label: "My Active Incidents" },
      { key: "approved", icon: "checkCircle", value: stats.approvedRequests, label: "Approved Requests" },
      { key: "pending", icon: "clock", value: stats.pendingRequests, label: "Pending Requests" }
    ];
  }, [isAdmin, stats.activeIncidents, stats.approvedRequests, stats.incidents, stats.pendingRequests, stats.roles, stats.total, stats.volunteers]);

  const pendingRequestCount = useMemo(
    () => participantRequests.filter((item) => (item.status || "").toLowerCase() === "requested").length,
    [participantRequests]
  );

  const requestRoles = useMemo(() => {
    return [...new Set(participantRequests.map((item) => item.requestedRole).filter(Boolean))];
  }, [participantRequests]);

  const filteredRequests = useMemo(() => {
    return participantRequests.filter((request) => {
      const status = (request.status || "requested").toLowerCase();
      const matchesStatus = requestStatusFilter === "all" || status === requestStatusFilter;
      const matchesRole = requestRoleFilter === "all" || (request.requestedRole || "") === requestRoleFilter;
      const query = requestSearch.trim().toLowerCase();
      const incident = incidentById.get(Number(request.incidentId));
      const matchesSearch =
        !query
        || (request.username || "").toLowerCase().includes(query)
        || (request.requestedRole || "").toLowerCase().includes(query)
        || String(request.incidentId || "").includes(query)
        || (incident?.title || "").toLowerCase().includes(query)
        || (incident?.location || "").toLowerCase().includes(query);
      return matchesStatus && matchesRole && matchesSearch;
    });
  }, [incidentById, participantRequests, requestRoleFilter, requestSearch, requestStatusFilter]);

  useEffect(() => {
    if (!Number.isFinite(highlightedRequestId)) {
      return;
    }

    const handle = window.requestAnimationFrame(() => {
      const card = requestCardRefs.current.get(highlightedRequestId);
      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    return () => window.cancelAnimationFrame(handle);
  }, [filteredRequests, highlightedRequestId]);

  return (
    <div className="participations-container">
      {error && <div className="inline-error">{error}</div>}
      {loading && <div className="inline-loading">Loading participants...</div>}

      {!isAdmin && !isVolunteer && (
        <div className="inline-loading">Participations are available for volunteer and admin accounts.</div>
      )}

      <div className="request-board">
        <h3>{isAdmin ? `Volunteer Requests (${pendingRequestCount} pending)` : "My Participation Requests"}</h3>
        <div className="request-filters">
          <div className="request-filter-row">
            <button
              className={`request-filter-btn ${requestStatusFilter === "all" ? "active" : ""}`}
              onClick={() => setRequestStatusFilter("all")}
            >
              All
            </button>
            <button
              className={`request-filter-btn ${requestStatusFilter === "requested" ? "active" : ""}`}
              onClick={() => setRequestStatusFilter("requested")}
            >
              Requested
            </button>
            <button
              className={`request-filter-btn ${requestStatusFilter === "approved" ? "active" : ""}`}
              onClick={() => setRequestStatusFilter("approved")}
            >
              Approved
            </button>
            <button
              className={`request-filter-btn ${requestStatusFilter === "rejected" ? "active" : ""}`}
              onClick={() => setRequestStatusFilter("rejected")}
            >
              Rejected
            </button>
          </div>
          <div className="request-filter-row">
            <select
              className="search-participants-input"
              value={requestRoleFilter}
              onChange={(e) => setRequestRoleFilter(e.target.value)}
            >
              <option value="all">All Request Roles</option>
              {requestRoles.map((roleName) => (
                <option key={roleName} value={roleName}>
                  {roleName}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="search-participants-input"
              placeholder="Search request role or incident..."
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
            />
          </div>
        </div>
        {filteredRequests.length === 0 && <p className="request-empty">No requests available.</p>}
        {filteredRequests.map((request) => {
          const status = (request.status || "requested").toLowerCase();
          const requestIncident = incidentById.get(Number(request.incidentId));

          return (
            <div
              key={request.id}
              className={`request-card ${highlightedRequestId === request.id ? "highlight" : ""}`}
              data-request-id={request.id}
              ref={(node) => {
                if (node) {
                  requestCardRefs.current.set(request.id, node);
                } else {
                  requestCardRefs.current.delete(request.id);
                }
              }}
            >
              <div className="request-main">
                <div className="request-title">
                  {isAdmin ? (
                    <>
                      <strong>{request.username || `User ${request.userId}`}</strong> requested <strong>{request.requestedRole}</strong>
                    </>
                  ) : (
                    <>
                      Requested role <strong>{request.requestedRole}</strong>
                    </>
                  )}
                  <span className={`request-status status-${status}`}>{status.toUpperCase()}</span>
                </div>
                <div className="request-meta">
                  <span>{incidentTitle(requestIncident, request.incidentId)}</span>
                  <span>{formatRelativeTime(request.createdAt)}</span>
                </div>
              </div>

              {isAdmin && status === "requested" && (
                <div className="request-actions">
                  <button className="decision-btn approve" onClick={() => decideRequest(request.id, "approved")}>
                    Approve
                  </button>
                  <button className="decision-btn reject" onClick={() => decideRequest(request.id, "rejected")}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="participants-stats">
        {statCards.map((card) => (
          <div key={card.key} className="participant-stat-card">
            <div className="stat-icon"><SectionIcon name={card.icon} /></div>
            <div className="stat-info">
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="participants-controls">
        <div className="role-filters">
          <button
            className={`role-filter-btn ${filterRole === "all" ? "active" : ""}`}
            onClick={() => setFilterRole("all")}
          >
            {isAdmin ? "All Roles" : "All My Roles"}
          </button>
          {uniqueRoles.map((roleName) => (
            <button
              key={roleName}
              className={`role-filter-btn ${filterRole === roleName ? "active" : ""}`}
              onClick={() => setFilterRole(roleName)}
            >
              {roleName}
            </button>
          ))}
        </div>

        <div className="search-participants">
          <input
            type="text"
            placeholder={isAdmin ? "Search by username, user id, role..." : "Search by incident title/location/role..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-participants-input"
          />
          <span className="search-icon"><SectionIcon name="search" /></span>
        </div>
      </div>

      <div className="participants-grid">
        {filteredParticipants
          .sort((a, b) => toTimestamp(b.joinedAt) - toTimestamp(a.joinedAt))
          .map((participant) => {
            const joinedAgo = formatRelativeTime(participant.joinedAt);
            const incident = incidentById.get(Number(participant.incidentId));
            const status = (incident?.status || "unknown").toLowerCase();
            const statusClass = status === "active"
              ? "status-approved"
              : status === "resolved" || status === "closed" || status === "cancelled"
                ? "status-rejected"
                : "status-requested";

            return (
              <div key={participant.id} className="participant-card">
                <div className="participant-header">
                  <div className="participant-avatar">
                    {(isAdmin ? participant.username : incidentTitle(incident, participant.incidentId)).charAt(0).toUpperCase()}
                  </div>
                  <div className="participant-basic">
                    <h3 className="participant-name">
                      {isAdmin ? (participant.username || `User ${participant.userId}`) : incidentTitle(incident, participant.incidentId)}
                    </h3>
                    <div className="participant-role">{participant.role || "No role set"}</div>
                    <div className="participant-badge">
                      {isAdmin ? `User #${participant.userId}` : formatIncidentCode(incident, participant.incidentId)}
                    </div>
                  </div>
                </div>

                <div className="participant-details">
                  <div className="detail-row">
                    <span className="detail-icon"><SectionIcon name="incidents" /></span>
                    <span className="detail-text">
                      {isAdmin ? `Incident #${participant.incidentId}` : incident?.location || "No location"}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon"><SectionIcon name={isAdmin ? "users" : "checkCircle"} /></span>
                    <span className="detail-text">
                      {isAdmin ? (participant.userType || "N/A") : `Status: ${status.toUpperCase()}`}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon"><SectionIcon name="clock" /></span>
                    <span className="detail-text">Joined {joinedAgo}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon"><SectionIcon name="tag" /></span>
                    <span className={`request-status ${statusClass}`}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                  {isAdmin && (
                    <>
                      <div className="detail-row">
                        <span className="detail-icon"><SectionIcon name="globe" /></span>
                        <span className="detail-text">
                          {participant.country || "-"} / {participant.municipality || "-"}
                        </span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-icon"><SectionIcon name="compass" /></span>
                        <span className="detail-text">
                          {typeof participant.lat === "number" && typeof participant.lon === "number"
                            ? `${participant.lat.toFixed(4)}, ${participant.lon.toFixed(4)}`
                            : "No location"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {filteredParticipants.length === 0 && (
        <div className="no-participants">
          <span className="no-participants-icon"><SectionIcon name="search" /></span>
          <p>{isAdmin ? "No participants found matching your criteria" : "You are not assigned to any incidents yet"}</p>
        </div>
      )}
    </div>
  );
}

export default Participations;
