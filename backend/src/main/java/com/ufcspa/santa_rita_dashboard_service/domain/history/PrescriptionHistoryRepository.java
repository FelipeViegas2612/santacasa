package com.ufcspa.santa_rita_dashboard_service.domain.history;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrescriptionHistoryRepository extends JpaRepository<PrescriptionHistory, Long> {
    List<PrescriptionHistory> findByPrescriptionItemIdOrderByChangedAtDesc(Long itemId);
}
