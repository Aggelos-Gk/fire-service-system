package com.example.FireServiceSystem.notification.dto;

import java.util.List;

public class NotificationReadRequest {
    private Long viewerId;
    private List<String> notificationIds;

    public Long getViewerId() {
        return viewerId;
    }

    public void setViewerId(Long viewerId) {
        this.viewerId = viewerId;
    }

    public List<String> getNotificationIds() {
        return notificationIds;
    }

    public void setNotificationIds(List<String> notificationIds) {
        this.notificationIds = notificationIds;
    }
}
