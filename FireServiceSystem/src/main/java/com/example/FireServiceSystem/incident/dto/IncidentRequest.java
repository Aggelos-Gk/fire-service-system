package com.example.FireServiceSystem.incident.dto;

public class IncidentRequest {
    private String incidentCode;
    private String title;
    private String description;
    private String status;
    private String priority;
    private String location;
    private Double lat;
    private Double lon;
    private Integer neededDrivers;
    private Integer neededFirefighters;
    private Long createdBy;
    private Long actorId;

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

    public Long getActorId() {
        return actorId;
    }

    public void setActorId(Long actorId) {
        this.actorId = actorId;
    }
}
