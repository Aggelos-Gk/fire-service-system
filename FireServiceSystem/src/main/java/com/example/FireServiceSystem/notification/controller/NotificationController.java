package com.example.FireServiceSystem.notification.controller;

import com.example.FireServiceSystem.incident.entity.Incident;
import com.example.FireServiceSystem.incident.repository.IncidentRepository;
import com.example.FireServiceSystem.message.entity.IncidentMessage;
import com.example.FireServiceSystem.message.repository.IncidentMessageRepository;
import com.example.FireServiceSystem.notification.dto.NotificationReadRequest;
import com.example.FireServiceSystem.notification.dto.NotificationResponse;
import com.example.FireServiceSystem.notification.entity.NotificationRead;
import com.example.FireServiceSystem.notification.repository.NotificationReadRepository;
import com.example.FireServiceSystem.participant.entity.ParticipantRequest;
import com.example.FireServiceSystem.participant.repository.ParticipantRequestRepository;
import com.example.FireServiceSystem.user.entity.User;
import com.example.FireServiceSystem.user.entity.UserRole;
import com.example.FireServiceSystem.user.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:3000")
public class NotificationController {

    private final IncidentRepository incidentRepository;
    private final IncidentMessageRepository messageRepository;
    private final ParticipantRequestRepository participantRequestRepository;
    private final NotificationReadRepository notificationReadRepository;
    private final UserRepository userRepository;

    public NotificationController(
            IncidentRepository incidentRepository,
            IncidentMessageRepository messageRepository,
            ParticipantRequestRepository participantRequestRepository,
            NotificationReadRepository notificationReadRepository,
            UserRepository userRepository
    ) {
        this.incidentRepository = incidentRepository;
        this.messageRepository = messageRepository;
        this.participantRequestRepository = participantRequestRepository;
        this.notificationReadRepository = notificationReadRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getNotifications(
            @RequestParam Long viewerId,
            @RequestParam(required = false) String viewerRole,
            @RequestParam(required = false, defaultValue = "false") boolean includeRead,
            @RequestParam(required = false, defaultValue = "50") Integer limit
    ) {
        if (!userRepository.existsById(viewerId)) {
            return ResponseEntity.badRequest().body(Map.of("message", "viewerId user does not exist"));
        }

        int safeLimit = Math.max(1, Math.min(limit == null ? 50 : limit, 200));
        boolean adminViewer = isAdminRole(viewerRole);

        List<NotificationResponse> notifications = new ArrayList<>();
        appendIncidentNotifications(notifications, adminViewer);
        appendMessageNotifications(notifications, viewerId);
        appendParticipantRequestNotifications(notifications, viewerId, adminViewer);

        notifications.sort((a, b) -> toSafeTime(b.getTime()).compareTo(toSafeTime(a.getTime())));

        Set<String> readIds = notificationReadRepository.findByUserId(viewerId).stream()
                .map(NotificationRead::getNotificationId)
                .collect(HashSet::new, HashSet::add, HashSet::addAll);

        List<NotificationResponse> filtered = notifications.stream()
                .peek(item -> item.setRead(readIds.contains(item.getId())))
                .filter(item -> includeRead || !item.isRead())
                .limit(safeLimit)
                .toList();

        return ResponseEntity.ok(filtered);
    }

    @PutMapping("/read")
    public ResponseEntity<?> markAsRead(@RequestBody NotificationReadRequest request) {
        if (request.getViewerId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "viewerId is required"));
        }
        if (!userRepository.existsById(request.getViewerId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "viewerId user does not exist"));
        }
        if (request.getNotificationIds() == null || request.getNotificationIds().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "notificationIds is required"));
        }

        List<String> normalizedIds = request.getNotificationIds().stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .distinct()
                .toList();
        if (normalizedIds.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "notificationIds is required"));
        }

        Set<String> existing = notificationReadRepository
                .findByUserIdAndNotificationIdIn(request.getViewerId(), normalizedIds)
                .stream()
                .map(NotificationRead::getNotificationId)
                .collect(HashSet::new, HashSet::add, HashSet::addAll);

        List<NotificationRead> toInsert = new ArrayList<>();
        for (String notificationId : normalizedIds) {
            if (existing.contains(notificationId)) {
                continue;
            }
            NotificationRead item = new NotificationRead();
            item.setUserId(request.getViewerId());
            item.setNotificationId(notificationId);
            toInsert.add(item);
        }

        if (!toInsert.isEmpty()) {
            notificationReadRepository.saveAll(toInsert);
        }

        return ResponseEntity.ok(Map.of(
                "message", "notifications marked as read",
                "count", toInsert.size()
        ));
    }

    private void appendIncidentNotifications(List<NotificationResponse> target, boolean adminViewer) {
        List<Incident> incidents = incidentRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        for (Incident incident : incidents) {
            if (!adminViewer && isRequestedStatus(incident.getStatus())) {
                continue;
            }

            NotificationResponse item = new NotificationResponse();
            item.setId("incident-" + incident.getId());
            item.setEntityType("incident");
            item.setEntityId(incident.getId());
            item.setTitle(incident.getTitle() != null ? incident.getTitle()
                    : incident.getIncidentCode() != null ? incident.getIncidentCode() : "Incident #" + incident.getId());
            item.setTime(incident.getCreatedAt());
            item.setRoute("/dashboard/incidents?open=" + incident.getId());
            target.add(item);
        }
    }

    private void appendMessageNotifications(List<NotificationResponse> target, Long viewerId) {
        List<IncidentMessage> messages = messageRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        for (IncidentMessage message : messages) {
            if (!isMessageVisibleToViewer(message, viewerId)) {
                continue;
            }

            NotificationResponse item = new NotificationResponse();
            item.setId("message-" + message.getId());
            item.setEntityType("message");
            item.setEntityId(message.getId());
            item.setTitle(message.getTitle() != null ? message.getTitle() : "Message #" + message.getId());
            item.setTime(message.getCreatedAt());
            item.setRoute("/dashboard/messages?open=" + message.getId());
            target.add(item);
        }
    }

    private void appendParticipantRequestNotifications(List<NotificationResponse> target, Long viewerId, boolean adminViewer) {
        List<ParticipantRequest> requests = adminViewer
                ? participantRequestRepository.findByStatusIgnoreCaseOrderByCreatedAtDesc("requested")
                : participantRequestRepository.findByUserIdOrderByCreatedAtDesc(viewerId);

        Map<Long, String> usernames = userRepository.findAll().stream()
                .collect(HashMap::new, (acc, user) -> acc.put(user.getId(), user.getUsername()), HashMap::putAll);

        for (ParticipantRequest request : requests) {
            String status = normalizeStatus(request.getStatus());
            if (!adminViewer && status.equals("requested")) {
                continue;
            }

            NotificationResponse item = new NotificationResponse();
            item.setId("participant-request-" + request.getId());
            item.setEntityType("request");
            item.setEntityId(request.getId());
            if (adminViewer) {
                String username = usernames.get(request.getUserId());
                item.setTitle((username != null ? username : "User " + request.getUserId()) + " requested " + request.getRequestedRole());
            } else {
                item.setTitle("Your " + request.getRequestedRole() + " request is " + request.getStatus());
            }
            item.setTime(request.getDecidedAt() != null ? request.getDecidedAt() : request.getCreatedAt());
            item.setRoute("/dashboard/participations?request=" + request.getId());
            target.add(item);
        }
    }

    private boolean isMessageVisibleToViewer(IncidentMessage message, Long viewerId) {
        String messageType = normalizeMessageType(message.getMessageType());
        if (messageType.equals("public")) {
            return true;
        }
        if (viewerId == null) {
            return false;
        }
        if (messageType.equals("private")) {
            return Objects.equals(message.getReceiverId(), viewerId) || Objects.equals(message.getSenderId(), viewerId);
        }
        return false;
    }

    private LocalDateTime toSafeTime(LocalDateTime value) {
        return value == null ? LocalDateTime.MIN : value;
    }

    private String normalizeMessageType(String value) {
        if (value == null || value.isBlank()) {
            return "public";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("admin")) {
            return "private";
        }
        return normalized;
    }

    private String normalizeStatus(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isRequestedStatus(String status) {
        return status != null && status.trim().equalsIgnoreCase("requested");
    }

    private boolean isAdminRole(String role) {
        return role != null && role.trim().equalsIgnoreCase(UserRole.ADMIN.name());
    }
}
