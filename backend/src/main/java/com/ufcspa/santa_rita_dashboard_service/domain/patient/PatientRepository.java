package com.ufcspa.santa_rita_dashboard_service.domain.patient;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    List<Patient> findByRoomId(Long roomId);
    List<Patient> findByFullNameContainingIgnoreCase(String name);
    Optional<Patient> findByCpf(String cpf);
}
