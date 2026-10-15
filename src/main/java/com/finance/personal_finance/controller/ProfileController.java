package com.finance.personal_finance.controller;

import java.util.Map;

import jakarta.servlet.http.HttpSession;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.finance.personal_finance.entity.User;
import com.finance.personal_finance.repository.UserRepository;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getProfile(HttpSession session) {
        Object id = session.getAttribute("userId");

        if (!(id instanceof Number)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in first."));
        }

        return userRepository.findById(((Number) id).longValue())
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(
                        Map.of(
                                "id", user.getId(),
                                "fullName", user.getFullName(),
                                "email", user.getEmail()
                        )))
                .orElseGet(() -> ResponseEntity.status(
                        HttpStatus.UNAUTHORIZED).body(
                                Map.of("message", "User account not found.")));
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(
            @RequestBody Map<String, String> data,
            HttpSession session) {

        Object id = session.getAttribute("userId");

        if (!(id instanceof Number)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in first."));
        }

        String name = data.get("fullName");
        String email = data.get("email");

        if (name == null || name.trim().length() < 2 ||
                email == null ||
                !email.trim().matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            return ResponseEntity.badRequest().body(
                    Map.of("message", "Enter a valid name and email."));
        }

        User user = userRepository.findById(((Number) id).longValue())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User account not found."));
        }

        String cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail.equalsIgnoreCase(user.getEmail()) &&
                userRepository.existsByEmail(cleanEmail)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                    Map.of("message", "This email is already registered."));
        }

        user.setFullName(name.trim());
        user.setEmail(cleanEmail);
        userRepository.save(user);

        session.setAttribute("userName", user.getFullName());
        session.setAttribute("userEmail", user.getEmail());

        return ResponseEntity.ok(Map.of(
                "message", "Profile updated successfully!",
                "fullName", user.getFullName(),
                "email", user.getEmail()
        ));
    }
    
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody Map<String, String> data,
            HttpSession session) {

        Object id = session.getAttribute("userId");

        if (!(id instanceof Number)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in first."));
        }

        String currentPassword = data.get("currentPassword");
        String newPassword = data.get("newPassword");
        String confirmPassword = data.get("confirmPassword");

        if (currentPassword == null || newPassword == null
                || confirmPassword == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Please fill all password fields."));
        }

        if (newPassword.length() < 8) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "New password must contain at least 8 characters."));
        }

        if (!newPassword.equals(confirmPassword)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "New password and confirm password do not match."));
        }

        User user = userRepository.findById(((Number) id).longValue())
                .orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User account not found."));
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Current password is incorrect."));
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message",
                            "New password must differ from current password."));
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(
                Map.of("message", "Password changed successfully!"));
    }
}