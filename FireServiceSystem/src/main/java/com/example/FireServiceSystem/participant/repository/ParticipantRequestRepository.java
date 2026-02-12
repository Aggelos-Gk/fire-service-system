package com.example.FireServiceSystem.participant.repository;

import com.example.FireServiceSystem.participant.entity.ParticipantRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParticipantRequestRepository extends JpaRepository<ParticipantRequest, Long> {
    List<ParticipantRequest> findByIncidentIdOrderByCreatedAtDesc(Long incidentId);
    List<ParticipantRequest> findByStatusIgnoreCaseOrderByCreatedAtDesc(String status);
    List<ParticipantRequest> findByUserIdOrderByCreatedAtDesc(Long userId);
    boolean existsByIncidentIdAndUserIdAndStatusIgnoreCase(Long incidentId, Long userId, String status);
    void deleteByUserId(Long userId);
    void deleteByDecidedBy(Long userId);
}
