package com.example.FireServiceSystem.user.entity;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum UserRole {
    ADMIN,
    USER,
    VOLUNTEER;

    @JsonCreator
    public static UserRole fromValue(String value) {
        if (value == null || value.isBlank()) {
            return USER;
        }

        try {
            return UserRole.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return USER;
        }
    }

    public static UserRole fromValueStrict(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("userType is required");
        }

        return UserRole.valueOf(value.trim().toUpperCase());
    }

    @JsonValue
    public String toValue() {
        return name();
    }
}
