package com.example.FireServiceSystem.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.FireServiceSystem.user.entity.User;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByUsernameAndPassword(String username, String password);
    boolean existsByUsername(String username);
}
