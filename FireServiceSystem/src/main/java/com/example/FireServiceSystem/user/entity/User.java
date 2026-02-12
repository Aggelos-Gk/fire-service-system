package com.example.FireServiceSystem.user.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    private String telephone;

    @Column(nullable = false)
    private String password;

    @Column(name = "user_type", nullable = false)
    @Convert(converter = UserRoleConverter.class)
    private UserRole userType;

    private LocalDate birthdate;
    private String gender;
    private String country;
    private String municipality;

    private String address;

    private String job;

    @Column(name = "volunteer_role")
    private String volunteerRole;

    private Double lat;
    private Double lon;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Constructors
    public User() {}

    public User(String username, String password, UserRole userType) {
        this.username = username;
        this.password = password;
        this.userType = userType;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public UserRole getUserType() { return userType; }
    public void setUserType(UserRole userType) { this.userType = userType; }

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

    public String getVolunteerRole() { return volunteerRole; }
    public void setVolunteerRole(String volunteerRole) { this.volunteerRole = volunteerRole; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLon() { return lon; }
    public void setLon(Double lon) { this.lon = lon; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Lifecycle methods
    @PrePersist
    protected void onCreate() {
        if (userType == null) {
            userType = UserRole.USER;
        }
        sanitizeVolunteerRole();
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        sanitizeVolunteerRole();
        updatedAt = LocalDateTime.now();
    }

    private void sanitizeVolunteerRole() {
        if (userType != UserRole.VOLUNTEER) {
            volunteerRole = null;
            return;
        }

        if (volunteerRole == null || volunteerRole.isBlank()) {
            volunteerRole = null;
            return;
        }

        volunteerRole = volunteerRole.trim().toUpperCase();
    }

    public static boolean isValidVolunteerRole(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }
        String normalized = value.trim().toUpperCase();
        return normalized.equals("FIREFIGHTER") || normalized.equals("DRIVER");
    }

    // Optional: toString() method for debugging
    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", userType='" + userType + '\'' +
                ", country='" + country + '\'' +
                '}';
    }
}
