import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./participations.css";
import "./theme-overrides.css";
import { fetchJson } from "../utils/api";
import { getStoredSession, normalizeRole } from "../utils/session";
import { formatRelativeTime } from "../utils/time";
import SectionIcon from "./sectionIcon";

function Participations() {
  const [searchParams] = useSearchParams();
  const highlightedRequestId = Number(searchParams.get("request"));

  const session = getStoredSession();
  const role = normalizeRole(session.role);
  const userId = session.userId;
  const isAdmin = role === "ADMIN";

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [requestRoleFilter, setRequestRoleFilter] = useState("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [participants, setParticipants] = useState([]);
  const [participantRequests, setParticipantRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadParticipants = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      }
      setError("");
      const participantCall = fetchJson("/api/participants");
      const requestCall = isAdmin
        ? fetchJson("/api/participants/requests")
        : userId
          ? fetchJson(`/api/participants/requests?userId=${userId}`)
          : Promise.resolve([]);

      const [participantData, requestData] = await Promise.all([participantCall, requestCall]);
      setParticipants(Array.isArray(participantData) ? participantData : []);
      setParticipantRequests(Array.isArray(requestData) ? requestData : []);
    } catch (loadError) {
      console.error(loadError);
      setError("Could not load participants.");
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }, [isAdmin, userId]);

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

  const uniqueRoles = useMemo(() => {
    return [...new Set(participants.map((item) => item.role).filter(Boolean))];
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    return participants.filter((participant) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        (participant.username || "").toLowerCase().includes(query) ||
        String(participant.userId || "").includes(query) ||
        (participant.role || "").toLowerCase().includes(query);
      const matchesFilter = filterRole === "all" || participant.role === filterRole;
      return matchesSearch && matchesFilter;
    });
  }, [participants, searchTerm, filterRole]);

  const stats = useMemo(() => {
    const incidents = new Set(participants.map((participant) => participant.incidentId));
    const volunteers = participants.filter((participant) => participant.userType === "VOLUNTEER").length;
    return {
      total: participants.length,
      incidents: incidents.size,
      volunteers,
      roles: uniqueRoles.length
    };
  }, [participants, uniqueRoles.length]);

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
      const query = requestSearch.toLowerCase();
      const matchesSearch =
        !query
        || (request.username || "").toLowerCase().includes(query)
        || (request.requestedRole || "").toLowerCase().includes(query)
        || String(request.incidentId || "").includes(query);
      return matchesStatus && matchesRole && matchesSearch;
    });
  }, [participantRequests, requestRoleFilter, requestSearch, requestStatusFilter]);

  return (
    <div className="participations-container">
      {error && <div className="inline-error">{error}</div>}
      {loading && <div className="inline-loading">Loading participants...</div>}

      <div className="request-board">
        <h3>{isAdmin ? `Volunteer Requests (${pendingRequestCount} pending)` : "My Volunteer Requests"}</h3>
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
              placeholder="Search request user/role/incident..."
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
            />
          </div>
        </div>
        {filteredRequests.length === 0 && <p className="request-empty">No requests available.</p>}
        {filteredRequests.map((request) => {
          const status = (request.status || "requested").toLowerCase();
          return (
            <div
              key={request.id}
              className={`request-card ${highlightedRequestId === request.id ? "highlight" : ""}`}
            >
              <div className="request-main">
                <div className="request-title">
                  <strong>{request.username || `User ${request.userId}`}</strong> requested <strong>{request.requestedRole}</strong>
                  <span className={`request-status status-${status}`}>{status.toUpperCase()}</span>
                </div>
                <div className="request-meta">
                  <span>Incident #{request.incidentId}</span>
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
        <div className="participant-stat-card">
          <div className="stat-icon"><SectionIcon name="users" /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Participants</div>
          </div>
        </div>
        <div className="participant-stat-card">
          <div className="stat-icon"><SectionIcon name="incidents" /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.incidents}</div>
            <div className="stat-label">Incidents Covered</div>
          </div>
        </div>
        <div className="participant-stat-card">
          <div className="stat-icon"><SectionIcon name="participations" /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.volunteers}</div>
            <div className="stat-label">Volunteers</div>
          </div>
        </div>
        <div className="participant-stat-card">
          <div className="stat-icon"><SectionIcon name="tag" /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.roles}</div>
            <div className="stat-label">Roles</div>
          </div>
        </div>
      </div>

      <div className="participants-controls">
        <div className="role-filters">
          <button
            className={`role-filter-btn ${filterRole === "all" ? "active" : ""}`}
            onClick={() => setFilterRole("all")}
          >
            All Roles
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
            placeholder="Search by username, user id, role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-participants-input"
          />
          <span className="search-icon"><SectionIcon name="search" /></span>
        </div>
      </div>

      <div className="participants-grid">
        {filteredParticipants.map((participant) => (
          <div key={participant.id} className="participant-card">
            <div className="participant-header">
              <div className="participant-avatar">
                {(participant.username || "?").charAt(0).toUpperCase()}
              </div>
              <div className="participant-basic">
                <h3 className="participant-name">{participant.username || `User ${participant.userId}`}</h3>
                <div className="participant-role">{participant.role || "No role set"}</div>
                <div className="participant-badge">User #{participant.userId}</div>
              </div>
            </div>

            <div className="participant-details">
              <div className="detail-row">
                <span className="detail-icon"><SectionIcon name="incidents" /></span>
                <span className="detail-text">Incident #{participant.incidentId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-icon"><SectionIcon name="users" /></span>
                <span className="detail-text">{participant.userType || "N/A"}</span>
              </div>
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
            </div>
          </div>
        ))}
      </div>

      {filteredParticipants.length === 0 && (
        <div className="no-participants">
          <span className="no-participants-icon"><SectionIcon name="search" /></span>
          <p>No participants found matching your criteria</p>
        </div>
      )}
    </div>
  );
}

export default Participations;
