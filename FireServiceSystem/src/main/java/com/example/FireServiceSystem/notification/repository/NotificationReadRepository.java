package com.example.FireServiceSystem.notification.repository;

import com.example.FireServiceSystem.notification.entity.NotificationRead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;

public interface NotificationReadRepository extends JpaRepository<NotificationRead, Long> {
    List<NotificationRead> findByUserId(Long userId);
    List<NotificationRead> findByUserIdAndNotificationIdIn(Long userId, Collection<String> notificationIds);
    void deleteByUserId(Long userId);

    @Modifying
    @Transactional
    @Query(
            value = """
                    INSERT INTO notification_reads (user_id, notification_id, read_at)
                    VALUES (:userId, :notificationId, CURRENT_TIMESTAMP)
                    ON CONFLICT (user_id, notification_id) DO NOTHING
                    """,
            nativeQuery = true
    )
    int insertIgnore(@Param("userId") Long userId, @Param("notificationId") String notificationId);
}
