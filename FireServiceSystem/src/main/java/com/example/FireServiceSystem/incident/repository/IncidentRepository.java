package com.example.FireServiceSystem.incident.repository;

import com.example.FireServiceSystem.incident.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IncidentRepository extends JpaRepository<Incident, Long> {
    Optional<Incident> findByIncidentCode(String incidentCode);
    List<Incident> findByCreatedBy(Long createdBy);
}
