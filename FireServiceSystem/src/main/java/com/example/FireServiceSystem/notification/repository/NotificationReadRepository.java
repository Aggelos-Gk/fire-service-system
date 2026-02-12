package com.example.FireServiceSystem.notification.repository;

import com.example.FireServiceSystem.notification.entity.NotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface NotificationReadRepository extends JpaRepository<NotificationRead, Long> {
    List<NotificationRead> findByUserId(Long userId);
    List<NotificationRead> findByUserIdAndNotificationIdIn(Long userId, Collection<String> notificationIds);
    void deleteByUserId(Long userId);
}
