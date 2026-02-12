package com.example.FireServiceSystem.user.controller;

import com.example.FireServiceSystem.incident.entity.Incident;
import com.example.FireServiceSystem.incident.repository.IncidentRepository;
import com.example.FireServiceSystem.message.repository.IncidentMessageRepository;
import com.example.FireServiceSystem.notification.repository.NotificationReadRepository;
import com.example.FireServiceSystem.participant.repository.ParticipantRepository;
import com.example.FireServiceSystem.participant.repository.ParticipantRequestRepository;
import com.example.FireServiceSystem.user.dto.UserResponse;
import com.example.FireServiceSystem.user.dto.UserUpdateRequest;
import com.example.FireServiceSystem.user.entity.User;
import com.example.FireServiceSystem.user.entity.UserRole;
import com.example.FireServiceSystem.user.repository.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:3000")
public class UserController {

    private final UserRepository userRepository;
    private final IncidentRepository incidentRepository;
    private final IncidentMessageRepository messageRepository;
    private final ParticipantRepository participantRepository;
    private final ParticipantRequestRepository participantRequestRepository;
    private final NotificationReadRepository notificationReadRepository;

    public UserController(
            UserRepository userRepository,
            IncidentRepository incidentRepository,
            IncidentMessageRepository messageRepository,
            ParticipantRepository participantRepository,
            ParticipantRequestRepository participantRequestRepository,
            NotificationReadRepository notificationReadRepository
    ) {
        this.userRepository = userRepository;
        this.incidentRepository = incidentRepository;
        this.messageRepository = messageRepository;
        this.participantRepository = participantRepository;
        this.participantRequestRepository = participantRequestRepository;
        this.notificationReadRepository = notificationReadRepository;
    }

    @GetMapping
    public List<UserResponse> getUsers(@RequestParam(required = false) String role) {
        List<User> users = userRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));

        if (role != null && !role.isBlank()) {
            String normalizedRole = role.toUpperCase(Locale.ROOT);
            UserRole requestedRole;
            try {
                requestedRole = UserRole.fromValueStrict(normalizedRole);
            } catch (IllegalArgumentException ex) {
                return List.of();
            }

            users = users.stream()
                    .filter(user -> user.getUserType() == requestedRole)
                    .toList();
        }

        return users.stream().map(UserResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(UserResponse.from(user, true)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody UserUpdateRequest request) {
        Optional<User> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = optionalUser.get();

        if (request.getUsername() != null && !request.getUsername().isBlank()) {
            if (userRepository.existsByUsernameAndIdNot(request.getUsername(), id)) {
                return ResponseEntity.badRequest().body(Map.of("message", "username already exists"));
            }
            user.setUsername(request.getUsername().trim());
        }
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName().trim());
        }
        if (request.getTelephone() != null) {
            user.setTelephone(request.getTelephone().trim());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPassword(request.getPassword());
        }
        if (request.getBirthdate() != null) {
            user.setBirthdate(request.getBirthdate());
        }
        if (request.getGender() != null) {
            user.setGender(request.getGender());
        }
        if (request.getCountry() != null) {
            user.setCountry(request.getCountry());
        }
        if (request.getMunicipality() != null) {
            user.setMunicipality(request.getMunicipality());
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress());
        }
        if (request.getJob() != null) {
            user.setJob(request.getJob());
        }
        if (user.getUserType() == UserRole.VOLUNTEER) {
            if (request.getVolunteerRole() != null) {
                if (!User.isValidVolunteerRole(request.getVolunteerRole())) {
                    return ResponseEntity.badRequest().body(Map.of("message", "volunteerRole must be FIREFIGHTER or DRIVER"));
                }
                user.setVolunteerRole(request.getVolunteerRole().trim().toUpperCase(Locale.ROOT));
            } else if (user.getVolunteerRole() == null || user.getVolunteerRole().isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "volunteerRole is required for volunteers"));
            }
        } else {
            user.setVolunteerRole(null);
        }
        if (request.getLat() != null) {
            user.setLat(request.getLat());
        }
        if (request.getLon() != null) {
            user.setLon(request.getLon());
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(UserResponse.from(saved, true));
    }

    @GetMapping("/admin")
    public ResponseEntity<?> getUsersForAdmin(@RequestParam Long actorId) {
        Optional<User> actor = userRepository.findById(actorId);
        if (actor.isEmpty() || actor.get().getUserType() != UserRole.ADMIN) {
            return ResponseEntity.status(404).body(Map.of("message", "website cannot find it"));
        }

        List<UserResponse> users = userRepository.findAll(Sort.by(Sort.Direction.DESC, "id"))
                .stream()
                .map(UserResponse::from)
                .toList();
        return ResponseEntity.ok(users);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id, @RequestParam Long actorId) {
        Optional<User> actor = userRepository.findById(actorId);
        if (actor.isEmpty() || actor.get().getUserType() != UserRole.ADMIN) {
            return ResponseEntity.status(404).body(Map.of("message", "website cannot find it"));
        }

        Optional<User> target = userRepository.findById(id);
        if (target.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (actorId.equals(id)) {
            return ResponseEntity.badRequest().body(Map.of("message", "admin cannot delete own account"));
        }
        if (target.get().getUserType() == UserRole.ADMIN && userRepository.countByUserType(UserRole.ADMIN) <= 1) {
            return ResponseEntity.badRequest().body(Map.of("message", "cannot delete the last admin"));
        }

        List<Incident> createdIncidents = incidentRepository.findByCreatedBy(id);
        for (Incident incident : createdIncidents) {
            incident.setCreatedBy(null);
        }
        if (!createdIncidents.isEmpty()) {
            incidentRepository.saveAll(createdIncidents);
        }

        participantRepository.deleteByUserId(id);
        participantRequestRepository.deleteByUserId(id);
        participantRequestRepository.deleteByDecidedBy(id);
        messageRepository.deleteBySenderIdOrReceiverId(id, id);
        notificationReadRepository.deleteByUserId(id);
        userRepository.deleteById(id);

        return ResponseEntity.ok(Map.of("message", "user deleted"));
    }
}
