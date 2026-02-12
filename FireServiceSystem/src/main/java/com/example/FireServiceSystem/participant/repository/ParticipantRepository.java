package com.example.FireServiceSystem.participant.repository;

import com.example.FireServiceSystem.participant.entity.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    List<Participant> findByIncidentIdOrderByJoinedAtDesc(Long incidentId);
    boolean existsByIncidentIdAndUserId(Long incidentId, Long userId);
    long countByIncidentIdAndRoleIgnoreCase(Long incidentId, String role);
    void deleteByUserId(Long userId);
}
