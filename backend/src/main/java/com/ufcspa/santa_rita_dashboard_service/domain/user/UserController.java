package com.ufcspa.santa_rita_dashboard_service.domain.user;

import com.ufcspa.santa_rita_dashboard_service.security.JwtUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        return userRepository.findByEmail(request.email())
                .filter(user -> passwordEncoder.matches(request.password(), user.getPassword()))
                .map(user -> ResponseEntity.ok(Map.of(
                        "token", jwtUtil.generateToken(user.getEmail(), user.getRole()),
                        "user", Map.of(
                                "id", user.getId(),
                                "name", user.getName(),
                                "email", user.getEmail(),
                                "role", user.getRole()
                        )
                )))
                .orElse(ResponseEntity.status(401).build());
    }

    @GetMapping("/users/me")
    public ResponseEntity<?> getMe(@AuthenticationPrincipal String email) {
        return userRepository.findByEmail(email)
                .map(user -> ResponseEntity.ok(Map.of(
                        "id", user.getId(),
                        "name", user.getName(),
                        "email", user.getEmail(),
                        "role", user.getRole()
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/me")
    public ResponseEntity<?> updateMe(@AuthenticationPrincipal String email,
                                      @RequestBody UpdateUserRequest request) {
        return userRepository.findByEmail(email).map(user -> {
            if (request.name() != null) user.setName(request.name());
            if (request.email() != null) user.setEmail(request.email());
            userRepository.save(user);
            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "role", user.getRole()
            ));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/me/password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal String email,
                                            @RequestBody ChangePasswordRequest request) {
        return userRepository.findByEmail(email).map(user -> {
            if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
                return ResponseEntity.status(400).body(Map.of("error", "Senha atual incorreta"));
            }
            user.setPassword(passwordEncoder.encode(request.newPassword()));
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Senha alterada com sucesso"));
        }).orElse(ResponseEntity.notFound().build());
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record UpdateUserRequest(String name, @Email String email) {}
    public record ChangePasswordRequest(@NotBlank String currentPassword, @NotBlank String newPassword) {}
}
