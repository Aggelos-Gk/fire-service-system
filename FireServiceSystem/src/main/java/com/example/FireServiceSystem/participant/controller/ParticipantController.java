package com.example.FireServiceSystem.participant.controller;

import com.example.FireServiceSystem.incident.entity.Incident;
import com.example.FireServiceSystem.incident.repository.IncidentRepository;
import com.example.FireServiceSystem.participant.dto.ParticipantJoinRequestDto;
import com.example.FireServiceSystem.participant.dto.ParticipantRequestDecisionDto;
import com.example.FireServiceSystem.participant.dto.ParticipantRequestResponse;
import com.example.FireServiceSystem.participant.dto.ParticipantResponse;
import com.example.FireServiceSystem.participant.dto.ParticipantUpsertRequest;
import com.example.FireServiceSystem.participant.entity.Participant;
import com.example.FireServiceSystem.participant.entity.ParticipantRequest;
import com.example.FireServiceSystem.participant.repository.ParticipantRepository;
import com.example.FireServiceSystem.participant.repository.ParticipantRequestRepository;
import com.example.FireServiceSystem.user.entity.User;
import com.example.FireServiceSystem.user.entity.UserRole;
import com.example.FireServiceSystem.user.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/participants")
public class ParticipantController {

    private final ParticipantRepository participantRepository;
    private final ParticipantRequestRepository participantRequestRepository;
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;

    public ParticipantController(
            ParticipantRepository participantRepository,
            ParticipantRequestRepository participantRequestRepository,
            IncidentRepository incidentRepository,
            UserRepository userRepository
    ) {
        this.participantRepository = participantRepository;
        this.participantRequestRepository = participantRequestRepository;
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<ParticipantResponse> getParticipants(
            @RequestParam(required = false) Long incidentId,
            @RequestParam(required = false) Long userId
    ) {
        List<Participant> participants;
        if (incidentId != null && userId != null) {
            participants = participantRepository.findByIncidentIdAndUserIdOrderByJoinedAtDesc(incidentId, userId);
        } else if (incidentId != null) {
            participants = participantRepository.findByIncidentIdOrderByJoinedAtDesc(incidentId);
        } else if (userId != null) {
            participants = participantRepository.findByUserIdOrderByJoinedAtDesc(userId);
        } else {
            participants = participantRepository.findAll(Sort.by(Sort.Direction.DESC, "joinedAt"));
        }

        return participants.stream()
                .filter(participant -> normalizeParticipantRole(participant.getRole()) != null)
                .map(this::toResponse)
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> addParticipant(@RequestBody ParticipantUpsertRequest request) {
        if (request.getIncidentId() == null || request.getUserId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "incidentId and userId are required"));
        }
        String normalizedRole = normalizeParticipantRole(request.getRole());
        if (normalizedRole == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "role must be Firefighter or Driver"));
        }
        if (!incidentRepository.existsById(request.getIncidentId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "incident does not exist"));
        }
        if (!userRepository.existsById(request.getUserId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "user does not exist"));
        }
        if (participantRepository.existsByIncidentIdAndUserId(request.getIncidentId(), request.getUserId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "participant already added to this incident"));
        }

        Participant participant = new Participant();
        participant.setIncidentId(request.getIncidentId());
        participant.setUserId(request.getUserId());
        participant.setRole(normalizedRole);

        Participant saved = participantRepository.save(participant);
        return ResponseEntity.ok(toResponse(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateParticipant(@PathVariable Long id, @RequestBody ParticipantUpsertRequest request) {
        Optional<Participant> existing = participantRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Participant participant = existing.get();
        if (request.getRole() != null && !request.getRole().isBlank()) {
            String normalizedRole = normalizeParticipantRole(request.getRole());
            if (normalizedRole == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "role must be Firefighter or Driver"));
            }
            participant.setRole(normalizedRole);
        }

        Participant saved = participantRepository.save(participant);
        return ResponseEntity.ok(toResponse(saved));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> removeParticipant(@PathVariable Long id) {
        if (!participantRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        participantRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "participant removed"));
    }

    @GetMapping("/requests")
    public List<ParticipantRequestResponse> getParticipantRequests(
            @RequestParam(required = false) Long incidentId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long userId
    ) {
        List<ParticipantRequest> requests = participantRequestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        if (incidentId != null) {
            requests = requests.stream().filter(item -> incidentId.equals(item.getIncidentId())).toList();
        }
        if (status != null && !status.isBlank()) {
            String normalized = status.toLowerCase(Locale.ROOT);
            requests = requests.stream()
                    .filter(item -> item.getStatus() != null && item.getStatus().toLowerCase(Locale.ROOT).equals(normalized))
                    .toList();
        }
        if (userId != null) {
            requests = requests.stream().filter(item -> userId.equals(item.getUserId())).toList();
        }

        return requests.stream().map(this::toRequestResponse).toList();
    }

    @PostMapping("/requests")
    public ResponseEntity<?> requestParticipation(@RequestBody ParticipantJoinRequestDto requestDto) {
        if (requestDto.getIncidentId() == null || requestDto.getUserId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "incidentId and userId are required"));
        }

        Optional<Incident> incident = incidentRepository.findById(requestDto.getIncidentId());
        if (incident.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "incident does not exist"));
        }
        String incidentStatus = incident.get().getStatus() == null ? "" : incident.get().getStatus().trim().toLowerCase(Locale.ROOT);
        if (!incidentStatus.equals("active")) {
            return ResponseEntity.badRequest().body(Map.of("message", "volunteer requests are allowed only for active incidents"));
        }

        Optional<User> requester = userRepository.findById(requestDto.getUserId());
        if (requester.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "user does not exist"));
        }
        if (requester.get().getUserType() != UserRole.VOLUNTEER) {
            return ResponseEntity.badRequest().body(Map.of("message", "only volunteers can send participation requests"));
        }

        String volunteerRole = normalizeVolunteerRole(requester.get().getVolunteerRole());
        if (volunteerRole == null) {
            volunteerRole = normalizeVolunteerRole(requestDto.getRequestedRole());
        }
        if (volunteerRole == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "volunteer role is missing. Set FIREFIGHTER or DRIVER in profile settings"));
        }

        int neededSlots = getNeededSlots(incident.get(), volunteerRole);
        if (neededSlots <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "incident does not require volunteers for role " + volunteerRole));
        }

        long filledSlots = participantRepository.countByIncidentIdAndRoleIgnoreCase(requestDto.getIncidentId(), roleLabel(volunteerRole));
        if (filledSlots >= neededSlots) {
            return ResponseEntity.badRequest().body(Map.of("message", "all " + volunteerRole + " slots are already filled"));
        }

        if (participantRepository.existsByIncidentIdAndUserId(requestDto.getIncidentId(), requestDto.getUserId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "user is already a participant in this incident"));
        }
        if (participantRequestRepository.existsByIncidentIdAndUserIdAndStatusIgnoreCase(
                requestDto.getIncidentId(),
                requestDto.getUserId(),
                "requested")) {
            return ResponseEntity.badRequest().body(Map.of("message", "a pending request already exists"));
        }

        ParticipantRequest request = new ParticipantRequest();
        request.setIncidentId(requestDto.getIncidentId());
        request.setUserId(requestDto.getUserId());
        request.setRequestedRole(volunteerRole);
        request.setStatus("requested");

        ParticipantRequest saved = participantRequestRepository.save(request);

        return ResponseEntity.ok(toRequestResponse(saved));
    }

    @PutMapping("/requests/{requestId}/decision")
    @Transactional
    public ResponseEntity<?> decideParticipationRequest(
            @PathVariable Long requestId,
            @RequestBody ParticipantRequestDecisionDto decisionDto
    ) {
        Optional<ParticipantRequest> optionalRequest = participantRequestRepository.findById(requestId);
        if (optionalRequest.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (decisionDto.getDecidedBy() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "decidedBy is required"));
        }

        Optional<User> decider = userRepository.findById(decisionDto.getDecidedBy());
        if (decider.isEmpty() || decider.get().getUserType() != UserRole.ADMIN) {
            return ResponseEntity.badRequest().body(Map.of("message", "decision can only be made by an admin"));
        }

        ParticipantRequest request = optionalRequest.get();
        if (!"requested".equalsIgnoreCase(request.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "request already decided"));
        }

        String status = decisionDto.getStatus() == null ? "" : decisionDto.getStatus().trim().toLowerCase(Locale.ROOT);
        if (!status.equals("approved") && !status.equals("rejected")) {
            return ResponseEntity.badRequest().body(Map.of("message", "status must be approved or rejected"));
        }

        boolean shouldCreateParticipant = status.equals("approved")
                && !participantRepository.existsByIncidentIdAndUserId(request.getIncidentId(), request.getUserId());

        if (shouldCreateParticipant) {
            Optional<Incident> incident = incidentRepository.findById(request.getIncidentId());
            if (incident.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "incident does not exist"));
            }

            String requestedRole = normalizeVolunteerRole(request.getRequestedRole());
            if (requestedRole == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "request role is invalid"));
            }
            int neededSlots = getNeededSlots(incident.get(), requestedRole);
            long filledSlots = participantRepository.countByIncidentIdAndRoleIgnoreCase(request.getIncidentId(), roleLabel(requestedRole));
            if (neededSlots <= 0 || filledSlots >= neededSlots) {
                return ResponseEntity.badRequest().body(Map.of("message", "no open " + requestedRole + " slots left"));
            }
        }

        request.setStatus(status);
        request.setDecidedBy(decisionDto.getDecidedBy());
        request.setDecidedAt(LocalDateTime.now());
        ParticipantRequest savedRequest = participantRequestRepository.save(request);

        if (shouldCreateParticipant) {
            String requestedRole = normalizeVolunteerRole(request.getRequestedRole());
            Participant participant = new Participant();
            participant.setIncidentId(request.getIncidentId());
            participant.setUserId(request.getUserId());
            participant.setRole(roleLabel(requestedRole));
            participantRepository.save(participant);
        }

        return ResponseEntity.ok(toRequestResponse(savedRequest));
    }

    private ParticipantResponse toResponse(Participant participant) {
        ParticipantResponse response = new ParticipantResponse();
        response.setId(participant.getId());
        response.setIncidentId(participant.getIncidentId());
        response.setUserId(participant.getUserId());
        response.setRole(normalizeParticipantRole(participant.getRole()));
        response.setJoinedAt(participant.getJoinedAt());

        userRepository.findById(participant.getUserId()).ifPresent(user -> {
            response.setUsername(user.getUsername());
            response.setUserType(user.getUserType().name());
            response.setCountry(user.getCountry());
            response.setMunicipality(user.getMunicipality());
            response.setJob(user.getJob());
            response.setLat(user.getLat());
            response.setLon(user.getLon());
        });

        return response;
    }

    private ParticipantRequestResponse toRequestResponse(ParticipantRequest request) {
        ParticipantRequestResponse response = new ParticipantRequestResponse();
        response.setId(request.getId());
        response.setIncidentId(request.getIncidentId());
        response.setUserId(request.getUserId());
        response.setRequestedRole(request.getRequestedRole());
        response.setStatus(request.getStatus());
        response.setCreatedAt(request.getCreatedAt());
        response.setDecidedAt(request.getDecidedAt());
        response.setDecidedBy(request.getDecidedBy());

        userRepository.findById(request.getUserId())
                .ifPresent(user -> response.setUsername(user.getUsername()));

        return response;
    }

    private String normalizeVolunteerRole(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!normalized.equals("FIREFIGHTER") && !normalized.equals("DRIVER")) {
            return null;
        }
        return normalized;
    }

    private int getNeededSlots(Incident incident, String volunteerRole) {
        if ("DRIVER".equals(volunteerRole)) {
            return incident.getNeededDrivers() == null ? 0 : incident.getNeededDrivers();
        }
        return incident.getNeededFirefighters() == null ? 0 : incident.getNeededFirefighters();
    }

    private String roleLabel(String volunteerRole) {
        if ("DRIVER".equals(volunteerRole)) {
            return "Driver";
        }
        return "Firefighter";
    }

    private String normalizeParticipantRole(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if ("DRIVER".equals(normalized)) {
            return "Driver";
        }
        if ("FIREFIGHTER".equals(normalized)) {
            return "Firefighter";
        }
        return null;
    }

}
