package com.example.FireServiceSystem.auth.controller;

import com.example.FireServiceSystem.auth.dto.RegisterRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.FireServiceSystem.auth.dto.LoginRequest;
import com.example.FireServiceSystem.user.repository.UserRepository;
import com.example.FireServiceSystem.user.entity.User;

import java.util.HashMap;
import java.util.Map;

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
        boolean exists = userRepository.existsByUsernameAndPassword(
                request.getUsername(),
                request.getPassword()
        );

        if (exists) {
            return Map.of(
                    "status", "SUCCESS",
                    "username", request.getUsername()
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
        newUser.setPassword(request.getPassword());
        newUser.setUserType(request.getUserType());
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