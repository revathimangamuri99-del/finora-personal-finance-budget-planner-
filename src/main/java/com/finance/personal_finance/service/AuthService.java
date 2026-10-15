package com.finance.personal_finance.service;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;


import com.finance.personal_finance.entity.User;
import com.finance.personal_finance.repository.UserRepository;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder =
            new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User signup(String fullName, String email, String password) {
        String cleanName = fullName == null ? "" : fullName.trim();
        String cleanEmail = email == null
                ? "" : email.trim().toLowerCase();

        if (cleanName.length() < 2) {
            throw new IllegalArgumentException("Please enter your full name.");
        }

        if (!cleanEmail.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new IllegalArgumentException("Enter a valid email address.");
        }

        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException(
                    "Password must contain at least 8 characters.");
        }

        if (userRepository.existsByEmail(cleanEmail)) {
            throw new IllegalArgumentException(
                    "This email is already registered.");
        }

        User user = new User();
        user.setFullName(cleanName);
        user.setEmail(cleanEmail);
        user.setPassword(passwordEncoder.encode(password));

        return userRepository.save(user);
    }

    public User login(String email, String password) {
        String cleanEmail = email == null
                ? "" : email.trim().toLowerCase();

        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid email or password."));

        if (password == null ||
                !passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException(
                    "Invalid email or password.");
        }

        return user;
    }
}