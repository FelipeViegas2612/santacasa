package com.ufcspa.santa_rita_dashboard_service.domain.routine;

import com.ufcspa.santa_rita_dashboard_service.domain.patient.PatientRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients/{patientId}/routine")
public class RoutineController {

    private final RoutineActivityRepository routineRepository;
    private final PatientRepository patientRepository;

    public RoutineController(RoutineActivityRepository routineRepository, PatientRepository patientRepository) {
        this.routineRepository = routineRepository;
        this.patientRepository = patientRepository;
    }

    @GetMapping
    public ResponseEntity<List<RoutineActivity>> get(@PathVariable Long patientId) {
        if (!patientRepository.existsById(patientId)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(routineRepository.findByPatientIdOrderByIdAsc(patientId));
    }

    @PutMapping
    @Transactional
    public ResponseEntity<List<RoutineActivity>> replace(@PathVariable Long patientId,
                                                         @RequestBody List<RoutineActivity> activities) {
        if (!patientRepository.existsById(patientId)) return ResponseEntity.notFound().build();
        routineRepository.deleteByPatientId(patientId);
        activities.forEach(a -> {
            a.setId(null);
            a.setPatientId(patientId);
        });
        return ResponseEntity.ok(routineRepository.saveAll(activities));
    }
}
