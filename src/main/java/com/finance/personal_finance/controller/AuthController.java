package com.finance.personal_finance.controller;

import java.util.Map;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.finance.personal_finance.entity.User;
import com.finance.personal_finance.service.AuthService;
import org.springframework.dao.DataIntegrityViolationException;
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Map<String, String> data) {
        try {
            User user = authService.signup(
                data.get("fullName"),
                data.get("email"),
                data.get("password")
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(
                Map.of(
                    "message", "Account created successfully!",
                    "id", user.getId(),
                    "fullName", user.getFullName(),
                    "email", user.getEmail()
                )
            );

        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(
                Map.of("message",
                    "This email is already registered. Please log in.")
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(
                Map.of("message", e.getMessage())
            );
        
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody Map<String, String> data,
            HttpSession session) {

        try {
            User user = authService.login(
                data.get("email"),
                data.get("password")
            );

            session.setAttribute("userId", user.getId());
            session.setAttribute("userName", user.getFullName());
            session.setAttribute("userEmail", user.getEmail());

            return ResponseEntity.ok(
                Map.of(
                    "message", "Login successful!",
                    "fullName", user.getFullName(),
                    "email", user.getEmail()
                )
            );

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                Map.of("message", e.getMessage())
            );
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> currentUser(HttpSession session) {
        Object userId = session.getAttribute("userId");

        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                Map.of("message", "Please log in first.")
            );
        }

        return ResponseEntity.ok(
            Map.of(
                "id", userId,
                "fullName", session.getAttribute("userName"),
                "email", session.getAttribute("userEmail")
            )
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpSession session) {
        session.invalidate();

        return ResponseEntity.ok(
            Map.of("message", "Logged out successfully.")
        );
    }
}