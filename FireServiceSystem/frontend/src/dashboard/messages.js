import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./messages.css";
import "./theme-overrides.css";
import { fetchJson } from "../utils/api";
import { getStoredSession, normalizeRole } from "../utils/session";
import { formatRelativeTime } from "../utils/time";

const asArray = (value) => (Array.isArray(value) ? value : []);

const normalizeMessageType = (value) => (value || "public").toString().trim().toLowerCase();

const toNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const nestedRows = payload.messages
    || payload.items
    || payload.data
    || payload.content
    || payload.results;

  return Array.isArray(nestedRows) ? nestedRows : [];
};

const normalizeMessageRow = (row) => {
  if (!row || typeof row !== "object") return null;

  return {
    ...row,
    id: toNumberOrNull(row.id ?? row.message_id ?? row.messageId),
    incidentId: toNumberOrNull(row.incidentId ?? row.incident_id),
    senderId: toNumberOrNull(row.senderId ?? row.sender_id),
    receiverId: toNumberOrNull(row.receiverId ?? row.receiver_id),
    title: row.title || "",
    content: row.content || row.body || "",
    messageType: row.messageType || row.message_type || row.type || "public",
    priority: row.priority || "normal",
    createdAt: row.createdAt || row.created_at || null
  };
};

const normalizeMessageRows = (payload) => (
  extractRows(payload)
    .map(normalizeMessageRow)
    .filter(Boolean)
);

const toText = (value) => {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    if (typeof value.content === "string") return value.content;
    if (typeof value.value === "string") return value.value;
  }
  return "";
};

const getAudienceType = (message) => {
  const type = normalizeMessageType(message?.messageType);
  if (type === "private") return "private";
  return "public";
};

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

function Messages() {
  const [searchParams] = useSearchParams();
  const openParam = searchParams.get("open");
  const openMessageId = openParam ? Number(openParam) : Number.NaN;

  const session = getStoredSession();
  const role = normalizeRole(session.role);
  const viewerKey = session.userId ? `user-${session.userId}` : "guest";
  const readStorageKey = `readMessages:${viewerKey}`;

  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [messages, setMessages] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [readIds, setReadIds] = useState(() => asArray(JSON.parse(localStorage.getItem(readStorageKey) || "[]")));
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({
    title: "",
    content: "",
    incidentId: "",
    messageType: "public",
    receiverId: ""
  });
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setReadIds(asArray(JSON.parse(localStorage.getItem(readStorageKey) || "[]")));
  }, [readStorageKey]);

  const loadMessagesData = useCallback(async (initial = false) => {
    try {
      if (initial) {
        setLoading(true);
      }
      setError("");

      if (!session.userId) {
        setMessages([]);
        setUsersById({});
        setIncidents([]);
        return;
      }

      const messagePath = `/api/messages?viewerRole=${encodeURIComponent(role || "GUEST")}${session.userId ? `&viewerId=${session.userId}` : ""}`;
      let messagePayload;
      try {
        messagePayload = await fetchJson(messagePath);
      } catch (primaryError) {
        console.warn(`Messages lookup failed for ${messagePath}, trying fallback /api/messages`, primaryError);
        messagePayload = await fetchJson("/api/messages");
      }
      setMessages(normalizeMessageRows(messagePayload));

      const incidentPath = `/api/incidents?viewerRole=${encodeURIComponent(role || "GUEST")}`;
      const [usersResult, incidentsResult] = await Promise.allSettled([
        fetchJson("/api/users"),
        fetchJson(incidentPath)
      ]);

      const userMap = {};
      if (usersResult.status === "fulfilled" && Array.isArray(usersResult.value)) {
        usersResult.value.forEach((user) => {
          userMap[user.id] = user;
        });
      } else if (usersResult.status === "rejected") {
        console.warn("Users lookup failed in messages page:", usersResult.reason);
      }

      if (incidentsResult.status === "fulfilled" && Array.isArray(incidentsResult.value)) {
        setIncidents(incidentsResult.value);
      } else {
        if (incidentsResult.status === "rejected") {
          console.warn("Incidents lookup failed in messages page:", incidentsResult.reason);
        }
        setIncidents([]);
      }

      setUsersById(userMap);
    } catch (loadError) {
      console.error(loadError);
      setError(extractApiError(loadError, "Could not load messages."));
    } finally {
      if (initial) setLoading(false);
    }
  }, [role, session.userId]);

  const markAsRead = useCallback((messageId) => {
    setReadIds((prev) => {
      if (prev.includes(messageId)) return prev;
      const next = [...prev, messageId];
      localStorage.setItem(readStorageKey, JSON.stringify(next));

      return next;
    });

    if (!session.userId) {
      return;
    }

    fetchJson("/api/notifications/read", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        viewerId: session.userId,
        notificationIds: [`message-${messageId}`]
      })
    })
      .then(() => window.dispatchEvent(new Event("notifications:refresh")))
      .catch((markError) => console.error("Failed marking message notification as read:", markError));
  }, [readStorageKey, session.userId]);

  useEffect(() => {
    let mounted = true;

    const guardedLoad = async (initial = false) => {
      if (!mounted) return;
      await loadMessagesData(initial);
    };

    guardedLoad(true);
    const timer = setInterval(() => guardedLoad(false), 45000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [loadMessagesData]);

  useEffect(() => {
    if (Number.isFinite(openMessageId)) {
      markAsRead(openMessageId);
    }
  }, [openMessageId, markAsRead]);

  const visibleMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [messages]);

  const filteredMessages = useMemo(() => {
    const isViewer = (userId) => session.userId && String(userId) === String(session.userId);

    return visibleMessages.filter((message) => {
      const audience = getAudienceType(message);
      const isPrivateInbox = audience === "private" && isViewer(message.receiverId) && !isViewer(message.senderId);
      const isSent = isViewer(message.senderId);

      const matchesFilter = (() => {
        if (filterType === "all") return audience === "public" || isPrivateInbox;
        if (filterType === "public") return audience === "public";
        if (filterType === "private") return isPrivateInbox;
        if (filterType === "sent") return Boolean(isSent);
        return false;
      })();

      const query = searchTerm.trim().toLowerCase();
      const sender = usersById[message.senderId]?.username || "System";
      const receiver = usersById[message.receiverId]?.username || "";
      const matchesSearch =
        !query ||
        (message.title || "").toLowerCase().includes(query) ||
        (message.content || "").toLowerCase().includes(query) ||
        sender.toLowerCase().includes(query) ||
        receiver.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [visibleMessages, filterType, searchTerm, session.userId, usersById]);

  const stats = useMemo(() => {
    const isViewer = (userId) => session.userId && String(userId) === String(session.userId);

    const isPrivateInbox = (message) =>
      getAudienceType(message) === "private" && isViewer(message.receiverId) && !isViewer(message.senderId);
    const isPublic = (message) => getAudienceType(message) === "public";
    const isAllBucket = (message) => isPublic(message) || isPrivateInbox(message);
    const isSent = (message) => isViewer(message.senderId);

    return {
      total: visibleMessages.filter(isAllBucket).length,
      public: visibleMessages.filter(isPublic).length,
      private: visibleMessages.filter(isPrivateInbox).length,
      sent: visibleMessages.filter(isSent).length,
      unread: visibleMessages.filter((m) => isAllBucket(m) && !readIds.includes(m.id)).length
    };
  }, [visibleMessages, readIds, session.userId]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!composeForm.title.trim() || !composeForm.content.trim()) {
      setError("Title and content are required.");
      return;
    }

    if (!session.userId) {
      setError("Login required to send messages.");
      return;
    }

    if (composeForm.messageType === "private" && !composeForm.receiverId) {
      setError("Private message needs a receiver.");
      return;
    }

    try {
      setSending(true);
      setError("");
      await fetchJson("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: composeForm.title.trim(),
          content: composeForm.content.trim(),
          senderId: session.userId,
          receiverId: composeForm.messageType === "private" ? Number(composeForm.receiverId) : null,
          incidentId: composeForm.incidentId ? Number(composeForm.incidentId) : null,
          messageType: composeForm.messageType,
          priority: "normal"
        })
      });

      setComposeForm({
        title: "",
        content: "",
        incidentId: "",
        messageType: "public",
        receiverId: ""
      });
      setShowCompose(false);
      await loadMessagesData(false);
      window.dispatchEvent(new Event("notifications:refresh"));
    } catch (sendError) {
      console.error(sendError);
      setError(extractApiError(sendError, "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  const recipientOptions = useMemo(() => {
    return Object.values(usersById)
      .filter((user) => user.id !== session.userId)
      .sort((a, b) => {
        const aAdmin = (a.userType || "").toUpperCase() === "ADMIN" ? 1 : 0;
        const bAdmin = (b.userType || "").toUpperCase() === "ADMIN" ? 1 : 0;
        if (aAdmin !== bAdmin) return bAdmin - aAdmin;
        return (a.username || "").localeCompare(b.username || "");
      });
  }, [session.userId, usersById]);

  return (
    <div className="messages-container">
      <div className="content-header">
        <h2>Messages</h2>
        {session.userId && (
          <button
            className="new-message-btn"
            onClick={() => setShowCompose((prev) => !prev)}
          >
            {showCompose ? "Close Form" : "Send Message"}
          </button>
        )}
      </div>

      {error && <div className="inline-error">{error}</div>}
      {loading && <div className="inline-loading">Loading messages...</div>}

      {!session.userId && (
        <div className="inline-error">Login required. Guests cannot access messages.</div>
      )}

      {showCompose && session.userId && (
        <form className="message-form-card" onSubmit={sendMessage}>
          <div className="message-form-row">
            <input
              type="text"
              placeholder="Message title"
              value={composeForm.title}
              onChange={(e) => setComposeForm((prev) => ({ ...prev, title: e.target.value }))}
              className="search-messages-input"
            />
          </div>
          <div className={`message-form-row ${composeForm.messageType === "private" ? "three-col" : "two-col"}`}>
            <select
              value={composeForm.incidentId}
              onChange={(e) => setComposeForm((prev) => ({ ...prev, incidentId: e.target.value }))}
              className="search-messages-input"
            >
              <option value="">No incident link</option>
              {incidents.map((incident) => (
                <option key={incident.id} value={incident.id}>
                  {incident.incidentCode || `#${incident.id}`} - {incident.title}
                </option>
              ))}
            </select>
            <select
              value={composeForm.messageType}
              onChange={(e) => setComposeForm((prev) => ({ ...prev, messageType: e.target.value, receiverId: "" }))}
              className="search-messages-input"
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            {composeForm.messageType === "private" && (
              <select
                value={composeForm.receiverId}
                onChange={(e) => setComposeForm((prev) => ({ ...prev, receiverId: e.target.value }))}
                className="search-messages-input"
              >
                <option value="">Select receiver</option>
                {recipientOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({user.userType})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="message-form-row">
            <textarea
              placeholder="Write your message..."
              value={composeForm.content}
              onChange={(e) => setComposeForm((prev) => ({ ...prev, content: e.target.value }))}
              className="message-textarea"
              rows={5}
            />
          </div>
          <div className="message-form-actions">
            <button type="submit" className="message-action-btn read-btn" disabled={sending}>
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      )}

      {session.userId && (
      <div className="messages-stats">
        <div className="message-stat-card">
          <div className="stat-icon">📬</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Messages</div>
          </div>
        </div>
        <div className="message-stat-card">
          <div className="stat-icon">✉️</div>
          <div className="stat-info">
            <div className="stat-value">{stats.unread}</div>
            <div className="stat-label">Unread</div>
          </div>
        </div>
        <div className="message-stat-card">
          <div className="stat-icon">🌐</div>
          <div className="stat-info">
            <div className="stat-value">{stats.public}</div>
            <div className="stat-label">Public</div>
          </div>
        </div>
        <div className="message-stat-card">
          <div className="stat-icon">🔐</div>
          <div className="stat-info">
            <div className="stat-value">{stats.private}</div>
            <div className="stat-label">Private</div>
          </div>
        </div>
        <div className="message-stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-info">
            <div className="stat-value">{stats.sent}</div>
            <div className="stat-label">Sent</div>
          </div>
        </div>
      </div>
      )}

      {session.userId && (
      <div className="messages-controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            All
          </button>
          <button
            className={`filter-btn ${filterType === "public" ? "active" : ""}`}
            onClick={() => setFilterType("public")}
          >
            Public
          </button>
          <button
            className={`filter-btn ${filterType === "private" ? "active" : ""}`}
            onClick={() => setFilterType("private")}
          >
            Private
          </button>
          <button
            className={`filter-btn ${filterType === "sent" ? "active" : ""}`}
            onClick={() => setFilterType("sent")}
          >
            Sent
          </button>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-messages-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>
      )}

      {session.userId && (
      <div className="messages-list">
        {filteredMessages.length > 0 ? (
          filteredMessages.map((message) => {
            const sender = usersById[message.senderId]?.username
              || (message.senderId ? `User #${message.senderId}` : "System");
            const receiver = usersById[message.receiverId]?.username
              || (message.receiverId ? `User #${message.receiverId}` : "");
            const messageType = getAudienceType(message);
            const isRead = readIds.includes(message.id);
            const badgeLabel = messageType === "private" ? "Private" : "Public";
            const safeTitle = toText(message.title).trim() || `Message #${message.id ?? "?"}`;
            const safeContent = toText(message.content).trim() || "No message content.";
            const recipientLabel = messageType === "private" ? (receiver || "Private") : "Public";

            return (
              <div
                key={message.id}
                className={`message-card ${openMessageId === message.id ? "highlight" : ""}`}
                onClick={() => markAsRead(message.id)}
              >
                <div className="message-plain-top">
                  <div className="message-plain-title">{safeTitle}</div>
                  <span className="type-badge">{badgeLabel}</span>
                </div>
                <div className="message-plain-meta">
                  <span><strong>From:</strong> {sender}</span>
                  <span><strong>To:</strong> {recipientLabel}</span>
                  <span><strong>Time:</strong> {formatRelativeTime(message.createdAt)}</span>
                </div>
                <div className="message-plain-content">{safeContent}</div>

                <div className="message-footer">
                  <button
                    className="message-action-btn read-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      markAsRead(message.id);
                    }}
                    disabled={isRead}
                  >
                    {isRead ? "Read" : "Mark As Read"}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-messages">
            <span className="no-messages-icon">📭</span>
            <p>No messages found matching your criteria</p>
          </div>
        )}
      </div>
      )}
    </div>
  );
}

export default Messages;
