import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./home.css";
import "./theme-overrides.css";
import { fetchJson } from "../utils/api";
import { getStoredSession, normalizeRole } from "../utils/session";
import { formatRelativeTime } from "../utils/time";
import { haversineKm } from "../utils/geo";
import FreeMap from "./FreeMap";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEARBY_RADIUS_KM = 30;

const toTimestamp = (value) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatIncidentCode = (incident) => {
  const raw = (incident?.incidentCode || "").trim().toUpperCase();
  if (raw.startsWith("INC-")) return raw;
  if (raw) return `INC-${raw}`;
  return `INC-${incident?.id ?? "N/A"}`;
};

const toDayStart = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
};

const toLinePath = (points) => {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
};

const toRoundedLinePath = (points, radius = 12) => {
  if (points.length === 0) return "";
  if (points.length < 3) return toLinePath(points);

  let path = `M${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    const prevDx = current.x - previous.x;
    const prevDy = current.y - previous.y;
    const nextDx = next.x - current.x;
    const nextDy = next.y - current.y;

    const prevLength = Math.hypot(prevDx, prevDy);
    const nextLength = Math.hypot(nextDx, nextDy);

    if (prevLength === 0 || nextLength === 0) {
      path += ` L${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
      continue;
    }

    const cornerRadius = Math.min(radius, prevLength / 2, nextLength / 2);
    const entryX = current.x - (prevDx / prevLength) * cornerRadius;
    const entryY = current.y - (prevDy / prevLength) * cornerRadius;
    const exitX = current.x + (nextDx / nextLength) * cornerRadius;
    const exitY = current.y + (nextDy / nextLength) * cornerRadius;

    path += ` L${entryX.toFixed(2)} ${entryY.toFixed(2)}`;
    path += ` Q${current.x.toFixed(2)} ${current.y.toFixed(2)} ${exitX.toFixed(2)} ${exitY.toFixed(2)}`;
  }

  const last = points[points.length - 1];
  path += ` L${last.x.toFixed(2)} ${last.y.toFixed(2)}`;
  return path;
};

const toAreaPath = (points, baselineY) => {
  if (points.length === 0) return "";
  const line = toRoundedLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L${last.x.toFixed(2)} ${baselineY.toFixed(2)} L${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
};

const formatCount = (value) => Number(value || 0).toLocaleString("en-US");

function Home() {
  const navigate = useNavigate();
  const session = getStoredSession();
  const role = normalizeRole(session.role) || "GUEST";
  const userId = session.userId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [incidents, setIncidents] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [viewerLocation, setViewerLocation] = useState(null);
  const [rangeDays, setRangeDays] = useState(30);
  const isAdmin = role === "ADMIN";
  const isVolunteer = role === "VOLUNTEER";
  const isUser = role === "USER";
  const isGuest = role === "GUEST";
  const showNearbyMap = (role === "USER" || role === "VOLUNTEER") && Boolean(userId);

  useEffect(() => {
    let mounted = true;

    const load = async (initial = false) => {
      if (initial) setLoading(true);
      setError("");

      try {
        const participantsRequest = isAdmin
          ? fetchJson("/api/participants")
          : isVolunteer && userId
            ? fetchJson(`/api/participants?userId=${userId}`)
            : Promise.resolve([]);

        const result = await Promise.all([
          fetchJson(`/api/incidents?viewerRole=${encodeURIComponent(role)}`),
          participantsRequest,
          fetchJson(`/api/messages?viewerRole=${encodeURIComponent(role)}${userId ? `&viewerId=${userId}` : ""}`),
          showNearbyMap && userId
            ? fetchJson(`/api/users/${userId}`).catch((loadError) => {
              console.error(loadError);
              return null;
            })
            : Promise.resolve(null),
          isAdmin && userId
            ? fetchJson(`/api/users/admin?actorId=${userId}`).catch((loadError) => {
              console.error(loadError);
              return [];
            })
            : Promise.resolve([])
        ]);

        if (!mounted) return;

        setIncidents(Array.isArray(result[0]) ? result[0] : []);
        setParticipants(Array.isArray(result[1]) ? result[1] : []);
        setMessages(Array.isArray(result[2]) ? result[2] : []);
        setUsers(Array.isArray(result[4]) ? result[4] : []);

        const profile = result[3];
        if (showNearbyMap && profile && typeof profile.lat === "number" && typeof profile.lon === "number") {
          setViewerLocation({ lat: profile.lat, lon: profile.lon });
        } else {
          setViewerLocation(null);
        }
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
  }, [isAdmin, isVolunteer, role, showNearbyMap, userId]);

  const latestIncidents = useMemo(() => {
    return [...incidents]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6);
  }, [incidents]);

  const latestMessages = useMemo(() => {
    return [...messages]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 6);
  }, [messages]);

  const latestIncident = latestIncidents[0] || null;
  const incidentsById = useMemo(() => {
    return incidents.reduce((acc, incident) => {
      const key = Number(incident?.id);
      if (Number.isFinite(key)) {
        acc.set(key, incident);
      }
      return acc;
    }, new Map());
  }, [incidents]);

  const latestSentMessage = useMemo(() => {
    if (!userId) return null;
    return [...messages]
      .filter((message) => Number(message?.senderId) === Number(userId))
      .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))[0] || null;
  }, [messages, userId]);

  const latestOwnParticipation = useMemo(() => {
    if (!isVolunteer || !userId) return null;
    return [...participants]
      .filter((participant) => Number(participant?.userId) === Number(userId))
      .sort((a, b) => toTimestamp(b.joinedAt) - toTimestamp(a.joinedAt))[0] || null;
  }, [isVolunteer, participants, userId]);

  const adminMetrics = useMemo(() => {
    const totalUsers = users.length;
    const totalVolunteers = users.filter((item) => (item?.userType || "").toUpperCase() === "VOLUNTEER").length;
    const volunteerWithParticipation = new Set(
      participants
        .filter((participant) => (participant?.userType || "").toUpperCase() === "VOLUNTEER")
        .map((participant) => Number(participant?.userId))
        .filter((id) => Number.isFinite(id))
    ).size;

    return {
      totalUsers,
      totalVolunteers,
      volunteerWithParticipation
    };
  }, [participants, users]);

  const summaryCards = useMemo(() => {
    if (isAdmin) {
      return [
        {
          key: "session-role",
          title: "Session Role",
          badge: "ADMIN",
          primary: "Administrator",
          secondary: session.displayName || session.username || "Authenticated session"
        },
        {
          key: "users-total",
          title: "Total Users (All Types)",
          primary: formatCount(adminMetrics.totalUsers),
          secondary: "Includes admins, users and volunteers"
        },
        {
          key: "volunteers-total",
          title: "Total Volunteers",
          primary: formatCount(adminMetrics.totalVolunteers),
          secondary: "Registered volunteer accounts"
        },
        {
          key: "volunteers-active",
          title: "Volunteers With Participation",
          primary: formatCount(adminMetrics.volunteerWithParticipation),
          secondary: "Volunteers who joined at least one incident"
        }
      ];
    }

    const baseCards = [
      {
        key: "session-role",
        title: "Role",
        badge: role,
        primary: role === "VOLUNTEER" ? "Volunteer Account" : role === "USER" ? "User Account" : "Guest Session",
        secondary: session.displayName || session.username || "No profile name"
      },
      {
        key: "incident-latest",
        title: "Latest Incident",
        primary: latestIncident ? (latestIncident.title || formatIncidentCode(latestIncident)) : "No incidents",
        secondary: latestIncident
          ? `${latestIncident.location || "No location"} • ${formatRelativeTime(latestIncident.createdAt)}`
          : "No incidents available"
      }
    ];

    if (isVolunteer) {
      const participationIncident = incidentsById.get(Number(latestOwnParticipation?.incidentId));
      baseCards.push({
        key: "participation-own-latest",
        title: "Latest Participation",
        primary: latestOwnParticipation
          ? (participationIncident?.title || `Incident #${latestOwnParticipation.incidentId || "-"}`)
          : "No participations",
        secondary: latestOwnParticipation
          ? `${latestOwnParticipation.role || "No role"} • ${formatRelativeTime(latestOwnParticipation.joinedAt)}`
          : "No volunteer participations yet"
      });
    }

    if (isUser || isVolunteer) {
      baseCards.push({
        key: "message-sent-latest",
        title: "Latest Sent Message",
        primary: latestSentMessage?.title || "No sent messages",
        secondary: latestSentMessage
          ? `${latestSentMessage.messageType || "public"} • ${formatRelativeTime(latestSentMessage.createdAt)}`
          : "You have not sent any message yet"
      });
    }

    return baseCards;
  }, [
    adminMetrics.totalUsers,
    adminMetrics.totalVolunteers,
    adminMetrics.volunteerWithParticipation,
    incidentsById,
    isAdmin,
    isUser,
    isVolunteer,
    latestIncident,
    latestOwnParticipation,
    latestSentMessage,
    role,
    session.displayName,
    session.username
  ]);

  const trend = useMemo(() => {
    const endDay = toDayStart(new Date());
    const startDay = endDay - (rangeDays - 1) * DAY_MS;

    const incidentSeries = Array(rangeDays).fill(0);
    const messageSeries = Array(rangeDays).fill(0);

    incidents.forEach((incident) => {
      const day = toDayStart(incident.createdAt);
      if (day === null || day < startDay || day > endDay) return;
      const index = Math.floor((day - startDay) / DAY_MS);
      incidentSeries[index] += 1;
    });

    messages.forEach((message) => {
      const day = toDayStart(message.createdAt);
      if (day === null || day < startDay || day > endDay) return;
      const index = Math.floor((day - startDay) / DAY_MS);
      messageSeries[index] += 1;
    });

    const labels = Array.from({ length: rangeDays }, (_, index) => {
      const day = new Date(startDay + index * DAY_MS);
      return day.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });

    const maxCount = Math.max(1, ...incidentSeries, ...messageSeries);
    const daySlot = rangeDays <= 7 ? 72 : rangeDays <= 30 ? 36 : 13;
    const padLeft = 6;
    const padRight = 6;
    const minChartWidth = rangeDays <= 7 ? 520 : rangeDays <= 30 ? 1000 : 1120;
    const chartWidth = Math.max(minChartWidth, padLeft + padRight + (rangeDays - 1) * daySlot);
    const chartHeight = 300;
    const padTop = 18;
    const padBottom = 24;
    const drawableWidth = chartWidth - padLeft - padRight;
    const drawableHeight = chartHeight - padTop - padBottom;
    const baselineY = chartHeight - padBottom;

    const toX = (index) => {
      if (labels.length <= 1) return padLeft + drawableWidth / 2;
      return padLeft + (index / (labels.length - 1)) * drawableWidth;
    };

    const toPoints = (series) => {
      return series.map((value, index) => {
        const x = toX(index);
        const y = baselineY - (value / maxCount) * drawableHeight;
        return { x, y };
      });
    };

    const incidentPoints = toPoints(incidentSeries);
    const messagePoints = toPoints(messageSeries);

    const tickStep = rangeDays <= 7 ? 1 : rangeDays <= 30 ? 2 : 7;
    const tickIndices = [];
    for (let index = labels.length - 1; index >= 0; index -= tickStep) {
      tickIndices.push(index);
    }
    tickIndices.sort((a, b) => a - b);

    const tickLabels = tickIndices.map((index) => ({
      label: labels[index],
      index
    }));
    const gridLines = Array.from({ length: 4 }, (_, index) => {
      const ratio = (index + 1) / 4;
      return baselineY - ratio * drawableHeight;
    });

    return {
      labels,
      tickLabels: tickLabels.map((item) => ({
        ...item,
        x: toX(item.index),
        xPercent: (toX(item.index) / chartWidth) * 100
      })),
      incidentLinePath: toRoundedLinePath(incidentPoints),
      incidentAreaPath: toAreaPath(incidentPoints, baselineY),
      messageLinePath: toRoundedLinePath(messagePoints),
      messageAreaPath: toAreaPath(messagePoints, baselineY),
      gridLines,
      padLeft,
      padRight,
      chartWidth,
      chartHeight
    };
  }, [incidents, messages, rangeDays]);

  const nearbyIncidents = useMemo(() => {
    if (!showNearbyMap || !viewerLocation) return [];

    return incidents
      .filter((incident) => (incident?.status || "").toLowerCase() === "active")
      .filter((incident) => typeof incident.lat === "number" && typeof incident.lon === "number")
      .map((incident) => ({
        incident,
        distanceKm: haversineKm(viewerLocation.lat, viewerLocation.lon, incident.lat, incident.lon)
      }))
      .filter((item) => Number.isFinite(item.distanceKm) && item.distanceKm <= NEARBY_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [incidents, showNearbyMap, viewerLocation]);

  const nearbyMarkers = useMemo(() => {
    if (!viewerLocation) return [];

    return [
      {
        id: "viewer-location",
        type: "user",
        lat: viewerLocation.lat,
        lon: viewerLocation.lon,
        label: "Your location"
      },
      ...nearbyIncidents.map((item) => ({
        id: `incident-${item.incident.id}`,
        type: "nearby-incident",
        lat: item.incident.lat,
        lon: item.incident.lon,
        label: `${item.incident.title || formatIncidentCode(item.incident)} (${item.distanceKm.toFixed(1)} km)`
      }))
    ];
  }, [nearbyIncidents, viewerLocation]);

  return (
    <div className="home-container">
      {error && <div className="data-error">{error}</div>}
      {loading && <div className="data-loading">Loading dashboard...</div>}

      <section className={`home-summary-grid ${isGuest ? "guest-compact" : ""}`.trim()}>
        {summaryCards.map((card) => (
          <article key={card.key} className="home-summary-card">
            <div className="home-summary-head">
              <p className="home-summary-title">{card.title}</p>
              {card.badge && <span className="home-summary-badge">{card.badge}</span>}
            </div>
            <p className="home-summary-primary">{card.primary}</p>
            <p className="home-summary-secondary">{card.secondary}</p>
          </article>
        ))}
      </section>

      {!isGuest && (isAdmin || !showNearbyMap) && (
        <section className="home-trend-panel">
          <div className="home-trend-head">
            <div>
              <h3>Total Activity</h3>
              <p>Incidents and messages over time</p>
            </div>
            <div className="home-range-switch">
              <button
                type="button"
                className={`home-range-btn ${rangeDays === 90 ? "active" : ""}`.trim()}
                onClick={() => setRangeDays(90)}
              >
                Last 3 months
              </button>
              <button
                type="button"
                className={`home-range-btn ${rangeDays === 30 ? "active" : ""}`.trim()}
                onClick={() => setRangeDays(30)}
              >
                Last 30 days
              </button>
              <button
                type="button"
                className={`home-range-btn ${rangeDays === 7 ? "active" : ""}`.trim()}
                onClick={() => setRangeDays(7)}
              >
                Last 7 days
              </button>
            </div>
          </div>

          <div className="home-chart-shell">
            <div className="home-chart-scroll">
              <div className="home-chart-canvas" style={{ width: `${trend.chartWidth}px` }}>
                {trend.incidentLinePath ? (
                  <>
                    <svg
                      className="home-trend-chart"
                      viewBox={`0 0 ${trend.chartWidth} ${trend.chartHeight}`}
                      role="img"
                      aria-label="Dashboard activity chart"
                    >
                      <defs>
                        <linearGradient id="incident-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(101, 165, 255, 0.38)" />
                          <stop offset="55%" stopColor="rgba(66, 128, 224, 0.2)" />
                          <stop offset="100%" stopColor="rgba(26, 39, 63, 0)" />
                        </linearGradient>
                        <linearGradient id="message-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(145, 199, 255, 0.3)" />
                          <stop offset="55%" stopColor="rgba(76, 137, 231, 0.14)" />
                          <stop offset="100%" stopColor="rgba(22, 36, 59, 0)" />
                        </linearGradient>
                      </defs>

                      <g className="chart-grid">
                        {trend.gridLines.map((y) => (
                          <line
                            key={y}
                            x1={trend.padLeft}
                            y1={y}
                            x2={trend.chartWidth - trend.padRight}
                            y2={y}
                          />
                        ))}
                      </g>

                      <path className="chart-area area-secondary" d={trend.messageAreaPath} fill="url(#message-fill)" />
                      <path className="chart-area" d={trend.incidentAreaPath} fill="url(#incident-fill)" />
                      <path className="chart-line line-main" d={trend.incidentLinePath} />
                      <path className="chart-line line-secondary" d={trend.messageLinePath} />
                    </svg>

                    <div className="home-chart-axis">
                      {trend.tickLabels.map((item) => (
                        <span
                          key={`${item.label}-${item.index}`}
                          style={{ left: `${item.xPercent}%` }}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="home-chart-empty">No activity data for the selected period.</div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {showNearbyMap && (
        <section className="home-trend-panel">
          <div className="home-trend-head">
            <div>
              <h3>Nearby Incidents</h3>
              <p>Showing incidents within {NEARBY_RADIUS_KM} km of your profile location.</p>
            </div>
          </div>

          {viewerLocation ? (
            <>
              <div className="home-nearby-map-shell">
                <FreeMap
                  center={viewerLocation}
                  markers={nearbyMarkers}
                  zoom={11}
                  height={340}
                />
              </div>
              <div className="home-nearby-meta">
                {nearbyIncidents.length} incident{nearbyIncidents.length === 1 ? "" : "s"} found within {NEARBY_RADIUS_KM} km.
              </div>
              {nearbyIncidents.length === 0 && (
                <div className="home-nearby-empty">No incidents with coordinates were found within 30 km.</div>
              )}
              {nearbyIncidents.length > 0 && (
                <div className="home-nearby-list">
                  {nearbyIncidents.map((item) => (
                    <div className="home-nearby-row" key={item.incident.id}>
                      <div>
                        <strong>{item.incident.title || formatIncidentCode(item.incident)}</strong>
                        <span>{item.incident.location || "No location"}</span>
                      </div>
                      <small>{item.distanceKm.toFixed(1)} km</small>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="home-chart-empty">Set your profile latitude and longitude to view nearby incidents on the map.</div>
          )}
        </section>
      )}

      {isGuest && (
        <section className="home-promo-panel">
          <div className="home-promo-head">
            <p className="home-promo-kicker">Fire Service Coordination Platform</p>
            <h3>Protect communities with faster, connected emergency coordination</h3>
            <p>
              Register to report incidents, receive verified updates, coordinate with volunteers,
              and track response history in real time.
            </p>
            <p>
              From first alert to resolution, the platform keeps everyone aligned with clear
              priorities, location-aware context, and role-based access for citizens,
              volunteers, and administrators.
            </p>
          </div>
          <div className="home-promo-grid">
            <article className="home-promo-card">
              <h4>Faster Response</h4>
              <p>Submit incidents with location details and help teams dispatch without delays.</p>
            </article>
            <article className="home-promo-card">
              <h4>Trusted Communication</h4>
              <p>Get structured updates from the team and avoid fragmented channels.</p>
            </article>
            <article className="home-promo-card">
              <h4>Volunteer Coordination</h4>
              <p>Match available drivers and firefighters to active incidents near them.</p>
            </article>
            <article className="home-promo-card">
              <h4>Operational Visibility</h4>
              <p>Track incident status, participation, and message flow from one dashboard.</p>
            </article>
          </div>
          <div className="home-promo-strip">
            <div className="home-promo-strip-item">
              <strong>Real-time updates</strong>
              <span>Stay informed as incident status changes.</span>
            </div>
            <div className="home-promo-strip-item">
              <strong>Secure access</strong>
              <span>Role-based views for safer coordination.</span>
            </div>
            <div className="home-promo-strip-item">
              <strong>Single source of truth</strong>
              <span>One place for incidents, participants, and messages.</span>
            </div>
          </div>
          <div className="home-promo-actions">
            <button type="button" className="home-promo-btn primary" onClick={() => navigate("/login")}>
              Sign In
            </button>
            <button type="button" className="home-promo-btn" onClick={() => navigate("/register")}>
              Create Account
            </button>
          </div>
        </section>
      )}

      {isAdmin && (
        <section className="home-lists-grid">
          <article className="home-list-card">
            <div className="home-list-head">
              <h4>Latest Incidents</h4>
            </div>
            <div className="home-list-body">
              {latestIncidents.map((incident) => (
                <div className="home-list-row" key={incident.id}>
                  <div>
                    <strong>{incident.title || formatIncidentCode(incident)}</strong>
                    <span>{incident.location || "No location"}</span>
                  </div>
                  <small>{formatRelativeTime(incident.createdAt)}</small>
                </div>
              ))}
              {latestIncidents.length === 0 && <div className="home-list-empty">No incidents yet.</div>}
            </div>
          </article>

          <article className="home-list-card">
            <div className="home-list-head">
              <h4>Latest Messages</h4>
            </div>
            <div className="home-list-body">
              {latestMessages.map((message) => (
                <div className="home-list-row" key={message.id}>
                  <div>
                    <strong>{message.title || "Untitled message"}</strong>
                    <span>{message.type || "General"}</span>
                  </div>
                  <small>{formatRelativeTime(message.createdAt)}</small>
                </div>
              ))}
              {latestMessages.length === 0 && <div className="home-list-empty">No messages yet.</div>}
            </div>
          </article>
        </section>
      )}
    </div>
  );
}

export default Home;
