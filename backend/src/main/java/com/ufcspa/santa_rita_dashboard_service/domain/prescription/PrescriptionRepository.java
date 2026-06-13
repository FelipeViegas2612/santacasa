package com.ufcspa.santa_rita_dashboard_service.domain.prescription;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    Optional<Prescription> findFirstByPatientIdOrderByCreatedAtDesc(Long patientId);
}
