package com.ufcspa.santa_rita_dashboard_service.domain.prescription;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, Long> {
    List<PrescriptionItem> findByPrescriptionIdOrderBySortOrderAsc(Long prescriptionId);

    @Query("SELECT DISTINCT p.patientId FROM PrescriptionItem pi JOIN Prescription p ON pi.prescriptionId = p.id WHERE pi.medicationId = :medId")
    List<Long> findDistinctPatientIdsByMedicationId(@Param("medId") Long medId);

    List<PrescriptionItem> findByMedicationId(Long medicationId);
}
