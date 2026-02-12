package com.example.FireServiceSystem.user.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class UserRoleConverter implements AttributeConverter<UserRole, String> {

    @Override
    public String convertToDatabaseColumn(UserRole attribute) {
        if (attribute == null) {
            return UserRole.USER.name();
        }
        return attribute.name();
    }

    @Override
    public UserRole convertToEntityAttribute(String dbData) {
        return UserRole.fromValue(dbData);
    }
}
