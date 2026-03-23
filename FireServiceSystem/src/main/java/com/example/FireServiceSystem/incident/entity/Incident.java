package com.example.FireServiceSystem.incident.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "incident_code", nullable = false, unique = true)
    private String incidentCode;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String priority;

    private String location;
    private Double lat;
    private Double lon;

    @Column(name = "needed_drivers")
    private Integer neededDrivers;

    @Column(name = "needed_firefighters")
    private Integer neededFirefighters;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getIncidentCode() {
        return incidentCode;
    }

    public void setIncidentCode(String incidentCode) {
        this.incidentCode = incidentCode;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Double getLat() {
        return lat;
    }

    public void setLat(Double lat) {
        this.lat = lat;
    }

    public Double getLon() {
        return lon;
    }

    public void setLon(Double lon) {
        this.lon = lon;
    }

    public Integer getNeededDrivers() {
        return neededDrivers;
    }

    public void setNeededDrivers(Integer neededDrivers) {
        this.neededDrivers = neededDrivers;
    }

    public Integer getNeededFirefighters() {
        return neededFirefighters;
    }

    public void setNeededFirefighters(Integer neededFirefighters) {
        this.neededFirefighters = neededFirefighters;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @PrePersist
    protected void onCreate() {
        if (incidentCode == null || incidentCode.isBlank()) {
            incidentCode = "INC-" + System.currentTimeMillis();
        }
        if (status == null || status.isBlank()) {
            status = "active";
        }
        if (priority == null || priority.isBlank()) {
            priority = "medium";
        }
        if (neededDrivers == null || neededDrivers < 0) {
            neededDrivers = 0;
        }
        if (neededFirefighters == null || neededFirefighters < 0) {
            neededFirefighters = 0;
        }
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        if (neededDrivers == null || neededDrivers < 0) {
            neededDrivers = 0;
        }
        if (neededFirefighters == null || neededFirefighters < 0) {
            neededFirefighters = 0;
        }
        updatedAt = LocalDateTime.now();
    }
}
