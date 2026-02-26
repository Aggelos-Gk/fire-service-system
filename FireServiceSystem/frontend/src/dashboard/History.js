import React, { useState } from "react";
import "./history.css";
import "./theme-overrides.css";
import SectionIcon from "./sectionIcon";

function History() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [dateRange, setDateRange] = useState("week");

  const historyData = [
    {
      id: "#1247",
      title: "Vehicle Accident - Highway 101",
      date: "Feb 5, 2026",
      time: "14:30",
      duration: "1h 15m",
      responders: 6,
      location: "Highway 101, Mile 45",
      type: "Vehicle Accident",
      status: "Completed",
      outcome: "Successful"
    },
    {
      id: "#1246",
      title: "Gas Leak - Commercial District",
      date: "Feb 5, 2026",
      time: "10:15",
      duration: "2h 30m",
      responders: 10,
      location: "789 Business Blvd",
      type: "Hazmat",
      status: "Completed",
      outcome: "Successful"
    },
    {
      id: "#1245",
      title: "Building Fire - Warehouse",
      date: "Feb 4, 2026",
      time: "22:45",
      duration: "4h 20m",
      responders: 15,
      location: "Industrial Park, Unit 12",
      type: "Building Fire",
      status: "Completed",
      outcome: "Successful"
    },
    {
      id: "#1244",
      title: "Medical Emergency - Shopping Mall",
      date: "Feb 4, 2026",
      time: "16:20",
      duration: "45m",
      responders: 4,
      location: "Central Mall, Food Court",
      type: "Medical",
      status: "Completed",
      outcome: "Successful"
    },
    {
      id: "#1243",
      title: "Rescue Operation - Mountain Trail",
      date: "Feb 3, 2026",
      time: "11:00",
      duration: "5h 10m",
      responders: 12,
      location: "Eagle Peak Trail",
      type: "Rescue",
      status: "Completed",
      outcome: "Successful"
    },
    {
      id: "#1242",
      title: "Electrical Fire - Residential",
      date: "Feb 3, 2026",
      time: "08:30",
      duration: "1h 40m",
      responders: 8,
      location: "456 Maple Street",
      type: "Building Fire",
      status: "Completed",
      outcome: "Partial Loss"
    },
    {
      id: "#1241",
      title: "Chemical Spill - Factory",
      date: "Feb 2, 2026",
      time: "13:15",
      duration: "3h 25m",
      responders: 14,
      location: "Industrial Zone B",
      type: "Hazmat",
      status: "Completed",
      outcome: "Successful"
    },
    {
      id: "#1240",
      title: "Water Rescue - River",
      date: "Feb 1, 2026",
      time: "15:45",
      duration: "2h 05m",
      responders: 10,
      location: "River Park, East Side",
      type: "Rescue",
      status: "Completed",
      outcome: "Successful"
    }
  ];

  const getOutcomeBadge = (outcome) => {
    const styles = {
      "Successful": { bg: "rgba(145, 145, 145, 0.2)", color: "#dedede" },
      "Partial Loss": { bg: "rgba(120, 120, 120, 0.2)", color: "#d2d2d2" },
      "Total Loss": { bg: "rgba(95, 95, 95, 0.24)", color: "#c9c9c9" }
    };
    return styles[outcome] || styles["Successful"];
  };

  const filteredHistory = historyData.filter(item => {
    if (selectedFilter === "all") return true;
    return item.type === selectedFilter;
  });

  const stats = {
    total: historyData.length,
    successful: historyData.filter(h => h.outcome === "Successful").length,
    avgDuration: "2h 15m",
    totalResponders: historyData.reduce((sum, h) => sum + h.responders, 0)
  };

  return (
    <div className="history-container">
      <div className="content-header">
        <div className="date-range-selector">
          <button 
            className={`range-btn ${dateRange === "day" ? "active" : ""}`}
            onClick={() => setDateRange("day")}
          >
            Today
          </button>
          <button 
            className={`range-btn ${dateRange === "week" ? "active" : ""}`}
            onClick={() => setDateRange("week")}
          >
            This Week
          </button>
          <button 
            className={`range-btn ${dateRange === "month" ? "active" : ""}`}
            onClick={() => setDateRange("month")}
          >
            This Month
          </button>
          <button 
            className={`range-btn ${dateRange === "all" ? "active" : ""}`}
            onClick={() => setDateRange("all")}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="history-stats">
        <div className="history-stat-card">
          <div className="stat-icon"><SectionIcon name="chart" /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Incidents</div>
          </div>
        </div>
        <div className="history-stat-card">
          <div className="stat-icon"><SectionIcon name="checkCircle" /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.successful}</div>
            <div className="stat-label">Successful</div>
          </div>
        </div>
        <div className="history-stat-card">
          <div className="stat-icon"><SectionIcon name="clock" /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.avgDuration}</div>
            <div className="stat-label">Avg Duration</div>
          </div>
        </div>
        <div className="history-stat-card">
          <div className="stat-icon"><SectionIcon name="firefighter" /></div>
          <div className="stat-info">
            <div className="stat-value">{stats.totalResponders}</div>
            <div className="stat-label">Total Responders</div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="history-filters">
        <button 
          className={`history-filter-btn ${selectedFilter === "all" ? "active" : ""}`}
          onClick={() => setSelectedFilter("all")}
        >
          All Types
        </button>
        <button 
          className={`history-filter-btn ${selectedFilter === "Building Fire" ? "active" : ""}`}
          onClick={() => setSelectedFilter("Building Fire")}
        >
          Fire
        </button>
        <button 
          className={`history-filter-btn ${selectedFilter === "Medical" ? "active" : ""}`}
          onClick={() => setSelectedFilter("Medical")}
        >
          Medical
        </button>
        <button 
          className={`history-filter-btn ${selectedFilter === "Rescue" ? "active" : ""}`}
          onClick={() => setSelectedFilter("Rescue")}
        >
          Rescue
        </button>
        <button 
          className={`history-filter-btn ${selectedFilter === "Hazmat" ? "active" : ""}`}
          onClick={() => setSelectedFilter("Hazmat")}
        >
          Hazmat
        </button>
        <button 
          className={`history-filter-btn ${selectedFilter === "Vehicle Accident" ? "active" : ""}`}
          onClick={() => setSelectedFilter("Vehicle Accident")}
        >
          Vehicle
        </button>
      </div>

      {/* History Table */}
      <div className="history-table-container">
        <table className="history-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Incident</th>
              <th>Date & Time</th>
              <th>Duration</th>
              <th>Type</th>
              <th>Responders</th>
              <th>Outcome</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHistory.map((item) => {
              const outcomeStyle = getOutcomeBadge(item.outcome);
              return (
                <tr key={item.id} className="history-row">
                  <td className="history-id">{item.id}</td>
                  <td className="history-incident">
                    <div className="incident-cell">
                      <div className="incident-title-cell">{item.title}</div>
                      <div className="incident-location-cell"><SectionIcon name="mapPin" /> {item.location}</div>
                    </div>
                  </td>
                  <td className="history-date">
                    <div>{item.date}</div>
                    <div className="time-text">{item.time}</div>
                  </td>
                  <td className="history-duration">{item.duration}</td>
                  <td className="history-type">
                    <span className="type-badge">{item.type}</span>
                  </td>
                  <td className="history-responders">
                    <span className="responders-count"><SectionIcon name="firefighter" /> {item.responders}</span>
                  </td>
                  <td className="history-outcome">
                    <span 
                      className="outcome-badge"
                      style={{ 
                        background: outcomeStyle.bg, 
                        color: outcomeStyle.color 
                      }}
                    >
                      {item.outcome}
                    </span>
                  </td>
                  <td className="history-actions">
                    <button className="view-details-btn">
                      <SectionIcon name="file" /> View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default History;
