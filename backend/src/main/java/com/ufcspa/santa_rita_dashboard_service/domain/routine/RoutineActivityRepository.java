package com.ufcspa.santa_rita_dashboard_service.domain.routine;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutineActivityRepository extends JpaRepository<RoutineActivity, Long> {
    List<RoutineActivity> findByPatientIdOrderByIdAsc(Long patientId);
    void deleteByPatientId(Long patientId);
}
