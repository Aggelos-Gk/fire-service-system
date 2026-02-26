import React, { useEffect, useMemo, useState } from "react";
import "./home.css";
import "./theme-overrides.css";
import { fetchJson } from "../utils/api";
import { getStoredSession, normalizeRole } from "../utils/session";
import { formatRelativeTime } from "../utils/time";

const DAY_MS = 24 * 60 * 60 * 1000;

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

const toAreaPath = (points, baselineY) => {
  if (points.length === 0) return "";
  const line = toLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L${last.x.toFixed(2)} ${baselineY.toFixed(2)} L${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
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
  const [rangeDays, setRangeDays] = useState(30);

  useEffect(() => {
    let mounted = true;

    const load = async (initial = false) => {
      if (initial) setLoading(true);
      setError("");

      try {
        const result = await Promise.all([
          fetchJson(`/api/incidents?viewerRole=${encodeURIComponent(role)}`),
          fetchJson("/api/participants"),
          fetchJson(`/api/messages?viewerRole=${encodeURIComponent(role)}${userId ? `&viewerId=${userId}` : ""}`)
        ]);

        if (!mounted) return;

        setIncidents(Array.isArray(result[0]) ? result[0] : []);
        setParticipants(Array.isArray(result[1]) ? result[1] : []);
        setMessages(Array.isArray(result[2]) ? result[2] : []);
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

  const latestParticipant = useMemo(() => {
    return [...participants]
      .sort((a, b) => {
        const timeDelta = new Date(b.createdAt || b.updatedAt || 0) - new Date(a.createdAt || a.updatedAt || 0);
        if (timeDelta !== 0) return timeDelta;
        return Number(b.id || 0) - Number(a.id || 0);
      })[0] || null;
  }, [participants]);

  const latestIncident = latestIncidents[0] || null;
  const latestMessage = latestMessages[0] || null;

  const summaryCards = [
    {
      key: "incident",
      title: "Latest Incident",
      primary: latestIncident ? (latestIncident.title || formatIncidentCode(latestIncident)) : "No incidents",
      secondary: latestIncident
        ? `${latestIncident.location || "No location"} • ${formatRelativeTime(latestIncident.createdAt)}`
        : "No incidents available"
    },
    {
      key: "message",
      title: "Latest Message",
      primary: latestMessage?.title || "No message title",
      secondary: latestMessage
        ? `${latestMessage.type || "General"} • ${formatRelativeTime(latestMessage.createdAt)}`
        : "No messages available"
    },
    {
      key: "participation",
      title: "Latest Participation",
      primary: latestParticipant ? (latestParticipant.username || `User ${latestParticipant.userId}`) : "No participants",
      secondary: latestParticipant
        ? `${latestParticipant.role || "No role"} • Incident #${latestParticipant.incidentId || "-"}`
        : "No participant records"
    },
    {
      key: "session",
      title: "Session",
      primary: session.displayName || session.username || "Guest User",
      secondary: `Role: ${role}`
    }
  ];

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
    const chartWidth = 1000;
    const chartHeight = 300;
    const padLeft = 18;
    const padRight = 18;
    const padTop = 18;
    const padBottom = 24;
    const drawableWidth = chartWidth - padLeft - padRight;
    const drawableHeight = chartHeight - padTop - padBottom;
    const baselineY = chartHeight - padBottom;

    const toPoints = (series) => {
      if (series.length === 1) {
        const y = baselineY - (series[0] / maxCount) * drawableHeight;
        return [{ x: padLeft + drawableWidth / 2, y }];
      }

      return series.map((value, index) => {
        const x = padLeft + (index / (series.length - 1)) * drawableWidth;
        const y = baselineY - (value / maxCount) * drawableHeight;
        return { x, y };
      });
    };

    const incidentPoints = toPoints(incidentSeries);
    const messagePoints = toPoints(messageSeries);

    const tickInterval = Math.max(1, Math.floor(rangeDays / 7));
    const tickLabels = labels
      .map((label, index) => ({ label, index }))
      .filter((item) => item.index % tickInterval === 0 || item.index === labels.length - 1);

    return {
      labels,
      tickLabels,
      incidentLinePath: toLinePath(incidentPoints),
      incidentAreaPath: toAreaPath(incidentPoints, baselineY),
      messageLinePath: toLinePath(messagePoints),
      chartWidth,
      chartHeight
    };
  }, [incidents, messages, rangeDays]);

  return (
    <div className="home-container">
      {error && <div className="data-error">{error}</div>}
      {loading && <div className="data-loading">Loading dashboard...</div>}

      <section className="home-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.key} className="home-summary-card">
            <p className="home-summary-title">{card.title}</p>
            <p className="home-summary-primary">{card.primary}</p>
            <p className="home-summary-secondary">{card.secondary}</p>
          </article>
        ))}
      </section>

      <section className="home-trend-panel">
        <div className="home-trend-head">
          <div>
            <h3>Total Activity</h3>
            <p>Incidents and messages over time</p>
          </div>
          <div className="home-range-switch">
            <button
              type="button"
              className={rangeDays === 90 ? "active" : ""}
              onClick={() => setRangeDays(90)}
            >
              Last 3 months
            </button>
            <button
              type="button"
              className={rangeDays === 30 ? "active" : ""}
              onClick={() => setRangeDays(30)}
            >
              Last 30 days
            </button>
            <button
              type="button"
              className={rangeDays === 7 ? "active" : ""}
              onClick={() => setRangeDays(7)}
            >
              Last 7 days
            </button>
          </div>
        </div>

        <div className="home-chart-shell">
          {trend.incidentLinePath ? (
            <svg
              className="home-trend-chart"
              viewBox={`0 0 ${trend.chartWidth} ${trend.chartHeight}`}
              role="img"
              aria-label="Dashboard activity chart"
            >
              <defs>
                <linearGradient id="incident-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(170, 170, 170, 0.58)" />
                  <stop offset="100%" stopColor="rgba(35, 35, 35, 0.08)" />
                </linearGradient>
              </defs>

              <path className="chart-area" d={trend.incidentAreaPath} fill="url(#incident-fill)" />
              <path className="chart-line line-main" d={trend.incidentLinePath} />
              <path className="chart-line line-secondary" d={trend.messageLinePath} />
            </svg>
          ) : (
            <div className="home-chart-empty">No activity data for the selected period.</div>
          )}
        </div>

        <div className="home-chart-axis">
          {trend.tickLabels.map((item) => (
            <span key={`${item.label}-${item.index}`}>{item.label}</span>
          ))}
        </div>
      </section>

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
    </div>
  );
}

export default Home;
