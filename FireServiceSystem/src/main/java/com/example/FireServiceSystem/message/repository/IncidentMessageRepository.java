package com.example.FireServiceSystem.message.repository;

import com.example.FireServiceSystem.message.entity.IncidentMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IncidentMessageRepository extends JpaRepository<IncidentMessage, Long> {
    List<IncidentMessage> findByIncidentIdOrderByCreatedAtDesc(Long incidentId);
    void deleteBySenderIdOrReceiverId(Long senderId, Long receiverId);
}
