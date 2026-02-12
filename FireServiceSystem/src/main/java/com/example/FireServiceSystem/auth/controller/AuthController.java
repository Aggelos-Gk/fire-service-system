package com.example.FireServiceSystem.auth.controller;

import com.example.FireServiceSystem.auth.dto.RegisterRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.FireServiceSystem.auth.dto.LoginRequest;
import com.example.FireServiceSystem.user.repository.UserRepository;
import com.example.FireServiceSystem.user.entity.User;
import com.example.FireServiceSystem.user.entity.UserRole;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final UserRepository userRepository;

    public AuthController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/login")
    public Map<String, String> login(@RequestBody LoginRequest request) {
        Optional<User> user = userRepository.findByUsernameAndPassword(
                request.getUsername(),
                request.getPassword()
        );

        if (user.isPresent()) {
            User found = user.get();
            return Map.of(
                    "status", "SUCCESS",
                    "username", found.getUsername(),
                    "role", found.getUserType().name(),
                    "token", UUID.randomUUID().toString(),
                    "userId", String.valueOf(found.getId())
            );
        } else {
            return Map.of("status", "FAIL", "message", "Invalid username or password");
        }
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        Map<String, Object> response = new HashMap<>();

        // 1. Check if username already exists
        boolean usernameExists = userRepository.existsByUsername(request.getUsername());

        if (usernameExists) {
            response.put("success", false);
            response.put("message", "Username already exists");
            return ResponseEntity.ok(response);
        }

        // 2. Create new User entity
        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setFirstName(request.getFirstName());
        newUser.setLastName(request.getLastName());
        newUser.setTelephone(request.getTelephone());
        newUser.setPassword(request.getPassword());
        try {
            newUser.setUserType(UserRole.fromValueStrict(request.getUserType()));
        } catch (IllegalArgumentException ex) {
            response.put("success", false);
            response.put("message", "Invalid userType. Allowed values: ADMIN, USER, VOLUNTEER");
            return ResponseEntity.badRequest().body(response);
        }

        if (newUser.getUserType() == UserRole.VOLUNTEER) {
            if (!User.isValidVolunteerRole(request.getVolunteerRole())) {
                response.put("success", false);
                response.put("message", "Volunteer role is required and must be FIREFIGHTER or DRIVER");
                return ResponseEntity.badRequest().body(response);
            }
            newUser.setVolunteerRole(request.getVolunteerRole().trim().toUpperCase());
        } else {
            newUser.setVolunteerRole(null);
        }

        newUser.setBirthdate(request.getBirthdate());
        newUser.setGender(request.getGender());
        newUser.setCountry(request.getCountry());
        newUser.setMunicipality(request.getMunicipality());
        newUser.setAddress(request.getAddress());
        newUser.setJob(request.getJob());
        newUser.setLat(request.getLat());
        newUser.setLon(request.getLon());

        // 3. Save to database
        User user = userRepository.save(newUser);

        // 4. Return success
        response.put("success", true);
        response.put("message", "User registered successfully");
        response.put("userId", user.getId());

        return ResponseEntity.ok(response);
    }

}
