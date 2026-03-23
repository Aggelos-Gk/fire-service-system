package com.example.FireServiceSystem.message.controller;

import com.example.FireServiceSystem.incident.repository.IncidentRepository;
import com.example.FireServiceSystem.message.dto.IncidentMessageRequest;
import com.example.FireServiceSystem.message.entity.IncidentMessage;
import com.example.FireServiceSystem.message.repository.IncidentMessageRepository;
import com.example.FireServiceSystem.user.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

@RestController
@RequestMapping("/api/messages")
public class IncidentMessageController {

    private final IncidentMessageRepository messageRepository;
    private final IncidentRepository incidentRepository;
    private final UserRepository userRepository;

    public IncidentMessageController(
            IncidentMessageRepository messageRepository,
            IncidentRepository incidentRepository,
            UserRepository userRepository
    ) {
        this.messageRepository = messageRepository;
        this.incidentRepository = incidentRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<IncidentMessage> getMessages(
            @RequestParam(required = false) Long incidentId,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long viewerId,
            @RequestParam(required = false) String viewerRole
    ) {
        List<IncidentMessage> messages = (incidentId == null)
                ? messageRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                : messageRepository.findByIncidentIdOrderByCreatedAtDesc(incidentId);

        messages = messages.stream()
                .filter(message -> isVisibleToViewer(message, viewerId))
                .toList();

        if (type != null && !type.isBlank()) {
            String normalizedType = type.trim().toLowerCase(Locale.ROOT);
            if (normalizedType.equals("admin")) {
                normalizedType = "private";
            }
            if (normalizedType.equals("sent")) {
                if (viewerId == null) {
                    messages = List.of();
                } else {
                    messages = messages.stream()
                            .filter(m -> Objects.equals(m.getSenderId(), viewerId))
                            .toList();
                }
            } else if (normalizedType.equals("private")) {
                if (viewerId == null) {
                    messages = List.of();
                } else {
                    messages = messages.stream()
                            .filter(m -> normalizeType(m.getMessageType()).equals("private")
                                    && Objects.equals(m.getReceiverId(), viewerId)
                                    && !Objects.equals(m.getSenderId(), viewerId))
                            .toList();
                }
            } else if (normalizedType.equals("all")) {
                if (viewerId == null) {
                    messages = messages.stream()
                            .filter(m -> normalizeType(m.getMessageType()).equals("public"))
                            .toList();
                } else {
                    messages = messages.stream()
                            .filter(m -> normalizeType(m.getMessageType()).equals("public")
                                    || (normalizeType(m.getMessageType()).equals("private")
                                    && Objects.equals(m.getReceiverId(), viewerId)
                                    && !Objects.equals(m.getSenderId(), viewerId)))
                            .toList();
                }
            } else if (!normalizedType.equals("all")) {
                String typeFilter = normalizedType;
                messages = messages.stream()
                        .filter(m -> normalizeType(m.getMessageType()).equals(typeFilter))
                        .toList();
            }
        }

        if (q != null && !q.isBlank()) {
            String query = q.toLowerCase(Locale.ROOT);
            messages = messages.stream()
                    .filter(m -> containsIgnoreCase(m.getTitle(), query)
                            || containsIgnoreCase(m.getContent(), query))
                    .toList();
        }

        return messages;
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getMessageById(@PathVariable Long id) {
        return messageRepository.findById(id)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createMessage(@RequestBody IncidentMessageRequest request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "title is required"));
        }
        if (request.getContent() == null || request.getContent().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "content is required"));
        }
        if (request.getSenderId() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "senderId is required"));
        }
        if (request.getIncidentId() != null && !incidentRepository.existsById(request.getIncidentId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "incident does not exist"));
        }
        if (!userRepository.existsById(request.getSenderId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "sender user does not exist"));
        }

        String messageType = normalizeType(request.getMessageType());
        if (!isSupportedType(messageType)) {
            return ResponseEntity.badRequest().body(Map.of("message", "messageType must be public or private"));
        }

        if (messageType.equals("private")) {
            if (request.getReceiverId() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "receiverId is required for private messages"));
            }
            if (!userRepository.existsById(request.getReceiverId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "receiver user does not exist"));
            }
        }

        IncidentMessage message = new IncidentMessage();
        message.setIncidentId(request.getIncidentId());
        message.setSenderId(request.getSenderId());
        message.setReceiverId(messageType.equals("private") ? request.getReceiverId() : null);

        message.setTitle(request.getTitle().trim());
        message.setContent(request.getContent().trim());
        message.setMessageType(messageType);
        message.setPriority(request.getPriority());

        return ResponseEntity.ok(messageRepository.save(message));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMessage(@PathVariable Long id, @RequestBody IncidentMessageRequest request) {
        Optional<IncidentMessage> existing = messageRepository.findById(id);
        if (existing.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        IncidentMessage message = existing.get();

        if (request.getIncidentId() != null && !incidentRepository.existsById(request.getIncidentId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "incident does not exist"));
        }
        if (request.getSenderId() != null && !userRepository.existsById(request.getSenderId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "sender user does not exist"));
        }
        if (request.getReceiverId() != null && !userRepository.existsById(request.getReceiverId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "receiver user does not exist"));
        }

        String targetType = request.getMessageType() != null
                ? normalizeType(request.getMessageType())
                : normalizeType(message.getMessageType());
        if (!isSupportedType(targetType)) {
            return ResponseEntity.badRequest().body(Map.of("message", "messageType must be public or private"));
        }

        if (request.getIncidentId() != null) {
            message.setIncidentId(request.getIncidentId());
        }
        if (request.getSenderId() != null) {
            message.setSenderId(request.getSenderId());
        }
        if (request.getTitle() != null) {
            message.setTitle(request.getTitle());
        }
        if (request.getContent() != null) {
            message.setContent(request.getContent());
        }
        if (request.getMessageType() != null) {
            message.setMessageType(targetType);
        }
        if (request.getPriority() != null) {
            message.setPriority(request.getPriority());
        }
        if (targetType.equals("private")) {
            Long receiverId = request.getReceiverId() != null ? request.getReceiverId() : message.getReceiverId();
            if (receiverId == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "receiverId is required for private messages"));
            }
            if (!userRepository.existsById(receiverId)) {
                return ResponseEntity.badRequest().body(Map.of("message", "receiver user does not exist"));
            }
            message.setReceiverId(receiverId);
        } else {
            message.setReceiverId(null);
        }

        return ResponseEntity.ok(messageRepository.save(message));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id) {
        if (!messageRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        messageRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "message deleted"));
    }

    private String normalizeType(String value) {
        if (value == null || value.isBlank()) {
            return "public";
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("admin")) {
            return "private";
        }
        return normalized;
    }

    private boolean isSupportedType(String value) {
        return value.equals("public") || value.equals("private");
    }

    private boolean isVisibleToViewer(IncidentMessage message, Long viewerId) {
        String messageType = normalizeType(message.getMessageType());
        if (messageType.equals("public")) {
            return true;
        }
        if (viewerId == null) {
            return false;
        }
        return Objects.equals(message.getSenderId(), viewerId) || Objects.equals(message.getReceiverId(), viewerId);
    }

    private boolean containsIgnoreCase(String source, String queryLowerCase) {
        return source != null && source.toLowerCase(Locale.ROOT).contains(queryLowerCase);
    }
}
