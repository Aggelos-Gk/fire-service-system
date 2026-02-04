package com.example.FireServiceSystem.auth.dto;

import java.time.LocalDate;

public class RegisterRequest {
    private String username;
    private String password;
    private String userType; // ADMIN, USER, VOLUNTEER
    private LocalDate birthdate;
    private String gender;
    private String country;
    private String municipality;
    private String address;
    private String job;
    private Double lat;
    private Double lon;

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getUserType() { return userType; }
    public void setUserType(String userType) { this.userType = userType; }

    public LocalDate getBirthdate() { return birthdate; }
    public void setBirthdate(LocalDate birthdate) { this.birthdate = birthdate; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public String getMunicipality() { return municipality; }
    public void setMunicipality(String municipality) { this.municipality = municipality; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getJob() { return job; }
    public void setJob(String job) { this.job = job; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLon() { return lon; }
    public void setLon(Double lon) { this.lon = lon; }
}