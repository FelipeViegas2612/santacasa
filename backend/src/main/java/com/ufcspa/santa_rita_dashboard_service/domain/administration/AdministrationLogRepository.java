package com.ufcspa.santa_rita_dashboard_service.domain.administration;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AdministrationLogRepository extends JpaRepository<AdministrationLog, Long> {
    List<AdministrationLog> findByPrescriptionItemIdOrderByAdministeredAtDesc(Long itemId);
    Optional<AdministrationLog> findFirstByPrescriptionItemIdAndScheduledTimeOrderByAdministeredAtDesc(Long itemId, String scheduledTime);
}
