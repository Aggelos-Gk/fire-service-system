package com.example.FireServiceSystem.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.FireServiceSystem.user.entity.User;
import com.example.FireServiceSystem.user.entity.UserRole;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByUsernameAndPassword(String username, String password);
    boolean existsByUsername(String username);
    boolean existsByUsernameAndIdNot(String username, Long id);
    Optional<User> findByUsernameAndPassword(String username, String password);
    Optional<User> findFirstByUserType(UserRole userType);
    long countByUserType(UserRole userType);
}
