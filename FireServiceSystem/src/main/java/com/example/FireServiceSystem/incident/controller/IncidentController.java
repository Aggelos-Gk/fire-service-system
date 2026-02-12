package com.example.FireServiceSystem.incident.controller;

import com.example.FireServiceSystem.incident.dto.IncidentRequest;
import com.example.FireServiceSystem.incident.entity.Incident;
import com.example.FireServiceSystem.incident.repository.IncidentRepository;
import com.example.FireServiceSystem.message.entity.IncidentMessage;
import com.example.FireServiceSystem.message.repository.IncidentMessageRepository;
import com.example.FireServiceSystem.user.entity.User;
import com.example.FireServiceSystem.user.entity.UserRole;
import com.example.FireServiceSystem.user.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/incidents")
@CrossOrigin(origins = "http://localhost:3000")
public class IncidentController {

    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;
    private final IncidentMessageRepository messageRepository;

    public IncidentController(
            IncidentRepository incidentRepository,
            UserRepository userRepository,
            IncidentMessageRepository messageRepository
    ) {
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
        this.messageRepository = messageRepository;
    }

    @GetMapping
    public List<Incident> getIncidents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String viewerRole
    ) {
        List<Incident> incidents = incidentRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        boolean adminViewer = isAdminRole(viewerRole);

        if (!adminViewer) {
            incidents = incidents.stream()
                    .filter(incident -> !isRequestedStatus(incident.getStatus()))
                    .toList();
        }

        if (status != null && !status.isBlank()) {
            String normalizedStatus = status.toLowerCase(Locale.ROOT);
            incidents = incidents.stream()
                    .filter(i -> i.getStatus() != null && i.getStatus().toLowerCase(Locale.ROOT).equals(normalizedStatus))
                    .toList();
        }

        if (q != null && !q.isBlank()) {
            String query = q.toLowerCase(Locale.ROOT);
            incidents = incidents.stream()
                    .filter(i -> containsIgnoreCase(i.getIncidentCode(), query)
                            || containsIgnoreCase(i.getTitle(), query)
                            || containsIgnoreCase(i.getDescription(), query)
                            || containsIgnoreCase(i.getLocation(), query))
                    .toList();
        }

        return incidents;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getIncidentById(@PathVariable Long id) {
        return incidentRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createIncident(@RequestBody IncidentRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "title is required"));
        }
        if (request.getCreatedBy() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "createdBy is required"));
        }

        Optional<User> creator = userRepository.findById(request.getCreatedBy());
        if (creator.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "createdBy user does not exist"));
        }

        if (request.getIncidentCode() != null && !request.getIncidentCode().isBlank()) {
            Optional<Incident> existing = incidentRepository.findByIncidentCode(request.getIncidentCode().trim());
            if (existing.isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "incidentCode already exists"));
            }
        }

        Incident incident = new Incident();
        incident.setIncidentCode(emptyToNull(request.getIncidentCode()));
        incident.setTitle(request.getTitle().trim());
        incident.setDescription(emptyToNull(request.getDescription()));
        incident.setPriority(emptyToNull(request.getPriority()));
        incident.setLocation(emptyToNull(request.getLocation()));
        incident.setLat(request.getLat());
        incident.setLon(request.getLon());
        if (request.getNeededDrivers() != null && request.getNeededDrivers() < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "neededDrivers cannot be negative"));
        }
        if (request.getNeededFirefighters() != null && request.getNeededFirefighters() < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "neededFirefighters cannot be negative"));
        }
        incident.setNeededDrivers(request.getNeededDrivers() == null ? 0 : request.getNeededDrivers());
        incident.setNeededFirefighters(request.getNeededFirefighters() == null ? 0 : request.getNeededFirefighters());
        incident.setCreatedBy(request.getCreatedBy());

        boolean creatorIsAdmin = creator.get().getUserType() == UserRole.ADMIN;
        if (creatorIsAdmin) {
            String normalizedStatus = normalizeIncidentStatus(request.getStatus());
            if (request.getStatus() != null && normalizedStatus == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "status must be active, resolved, or requested"));
            }

            incident.setStatus(normalizedStatus);
            if (normalizedStatus == null) {
                incident.setStatus("active");
            }
        } else {
            incident.setStatus("requested");
        }

        Incident saved = incidentRepository.save(incident);

        if (!creatorIsAdmin) {
            sendAdminIncidentRequestNotification(saved, creator.get());
        }

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateIncident(@PathVariable Long id, @RequestBody IncidentRequest request) {
        Optional<Incident> existing = incidentRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        if (request.getActorId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "actorId is required"));
        }

        Optional<User> actor = userRepository.findById(request.getActorId());
        if (actor.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "actor user does not exist"));
        }

        Incident incident = existing.get();
        boolean actorIsAdmin = actor.get().getUserType() == UserRole.ADMIN;
        boolean actorIsCreator = incident.getCreatedBy() != null && incident.getCreatedBy().equals(request.getActorId());

        if (!actorIsAdmin) {
            if (!actorIsCreator) {
                return ResponseEntity.status(403).body(Map.of("message", "only the creator can edit this incident"));
            }
            if (!isRequestedStatus(incident.getStatus())) {
                return ResponseEntity.status(403).body(Map.of("message", "incident can only be edited while requested"));
            }
            if (request.getStatus() != null || request.getPriority() != null || request.getIncidentCode() != null) {
                return ResponseEntity.status(403).body(Map.of("message", "only admin can update status/priority/code"));
            }
        }

        String previousStatus = incident.getStatus();

        if (request.getCreatedBy() != null && !userRepository.existsById(request.getCreatedBy())) {
            return ResponseEntity.badRequest().body(Map.of("message", "createdBy user does not exist"));
        }

        if (actorIsAdmin && request.getIncidentCode() != null && !request.getIncidentCode().isBlank()) {
            Optional<Incident> sameCode = incidentRepository.findByIncidentCode(request.getIncidentCode().trim());
            if (sameCode.isPresent() && !sameCode.get().getId().equals(id)) {
                return ResponseEntity.badRequest().body(Map.of("message", "incidentCode already exists"));
            }
            incident.setIncidentCode(request.getIncidentCode().trim());
        }

        if (request.getTitle() != null) {
            incident.setTitle(request.getTitle().trim());
        }
        if (request.getDescription() != null) {
            incident.setDescription(request.getDescription());
        }
        if (actorIsAdmin && request.getStatus() != null) {
            String nextStatus = normalizeIncidentStatus(request.getStatus());
            if (nextStatus == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "status must be active, resolved, or requested"));
            }
            incident.setStatus(nextStatus);
        }
        if (actorIsAdmin && request.getPriority() != null) {
            incident.setPriority(request.getPriority().trim().toLowerCase(Locale.ROOT));
        }
        if (request.getLocation() != null) {
            incident.setLocation(request.getLocation());
        }
        if (request.getLat() != null) {
            incident.setLat(request.getLat());
        }
        if (request.getLon() != null) {
            incident.setLon(request.getLon());
        }
        if (request.getNeededDrivers() != null) {
            if (request.getNeededDrivers() < 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "neededDrivers cannot be negative"));
            }
            incident.setNeededDrivers(request.getNeededDrivers());
        }
        if (request.getNeededFirefighters() != null) {
            if (request.getNeededFirefighters() < 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "neededFirefighters cannot be negative"));
            }
            incident.setNeededFirefighters(request.getNeededFirefighters());
        }
        if (request.getCreatedBy() != null && actorIsAdmin) {
            incident.setCreatedBy(request.getCreatedBy());
        }

        Incident saved = incidentRepository.save(incident);

        if (actorIsAdmin && isRequestedStatus(previousStatus) && !isRequestedStatus(saved.getStatus())) {
            sendIncidentDecisionNotification(saved, actor.get(), saved.getStatus());
        }

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteIncident(@PathVariable Long id, @RequestParam Long actorId) {
        if (!incidentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        Optional<User> actor = userRepository.findById(actorId);
        if (actor.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "actor user does not exist"));
        }
        if (actor.get().getUserType() != UserRole.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("message", "only admin can delete incidents"));
        }

        incidentRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "incident deleted"));
    }

    private void sendAdminIncidentRequestNotification(Incident incident, User creator) {
        Optional<User> admin = userRepository.findFirstByUserType(UserRole.ADMIN);
        if (admin.isEmpty()) {
            return;
        }

        IncidentMessage message = new IncidentMessage();
        message.setIncidentId(incident.getId());
        message.setSenderId(creator.getId());
        message.setTitle("Incident Request");
        message.setContent(creator.getUsername() + " submitted " + incident.getIncidentCode() + " for approval.");
        message.setMessageType("admin");
        message.setPriority("normal");
        messageRepository.save(message);
    }

    private void sendIncidentDecisionNotification(Incident incident, User admin, String decisionStatus) {
        if (incident.getCreatedBy() == null) {
            return;
        }
        if (decisionStatus == null || decisionStatus.isBlank()) {
            decisionStatus = "updated";
        }

        IncidentMessage message = new IncidentMessage();
        message.setIncidentId(incident.getId());
        message.setSenderId(admin.getId());
        message.setTitle("Incident " + decisionStatus.substring(0, 1).toUpperCase(Locale.ROOT) + decisionStatus.substring(1));
        message.setContent("Incident " + incident.getIncidentCode() + " was marked as " + decisionStatus + " by admin.");
        message.setMessageType("public");
        message.setPriority("normal");
        messageRepository.save(message);
    }

    private boolean containsIgnoreCase(String source, String queryLowerCase) {
        return source != null && source.toLowerCase(Locale.ROOT).contains(queryLowerCase);
    }

    private boolean isRequestedStatus(String status) {
        return status != null && status.trim().equalsIgnoreCase("requested");
    }

    private boolean isAdminRole(String role) {
        return role != null && role.trim().equalsIgnoreCase("ADMIN");
    }

    private String normalizeIncidentStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String normalized = status.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("active") || normalized.equals("resolved") || normalized.equals("requested")) {
            return normalized;
        }
        return null;
    }

    private String emptyToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
