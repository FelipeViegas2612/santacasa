package com.ufcspa.santa_rita_dashboard_service.domain.patient;

import com.ufcspa.santa_rita_dashboard_service.domain.prescription.Prescription;
import com.ufcspa.santa_rita_dashboard_service.domain.prescription.PrescriptionRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientRepository patientRepository;
    private final PrescriptionRepository prescriptionRepository;

    public PatientController(PatientRepository patientRepository, PrescriptionRepository prescriptionRepository) {
        this.patientRepository = patientRepository;
        this.prescriptionRepository = prescriptionRepository;
    }

    @GetMapping
    public List<Patient> getAll(@RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return patientRepository.findByFullNameContainingIgnoreCase(search);
        }
        return patientRepository.findAll();
    }

    @PostMapping
    public Patient create(@Valid @RequestBody Patient patient) {
        return patientRepository.save(patient);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Patient> getById(@PathVariable Long id) {
        return patientRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<Patient> update(@PathVariable Long id, @Valid @RequestBody Patient request) {
        return patientRepository.findById(id).map(p -> {
            p.setFullName(request.getFullName());
            p.setBirthDate(request.getBirthDate());
            p.setAdmissionDate(request.getAdmissionDate());
            p.setRg(request.getRg());
            p.setCpf(request.getCpf());
            p.setDiagnosis(request.getDiagnosis());
            p.setAllergies(request.getAllergies());
            p.setObservations(request.getObservations());
            p.setCaregiver(request.getCaregiver());
            p.setRoomId(request.getRoomId());
            return ResponseEntity.ok(patientRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        if (!patientRepository.existsById(id)) return ResponseEntity.notFound().build();
        patientRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Paciente removido"));
    }

    @GetMapping("/{id}/prescriptions")
    public List<Prescription> getPrescriptions(@PathVariable Long id) {
        return prescriptionRepository.findByPatientIdOrderByCreatedAtDesc(id);
    }

    @PostMapping("/{id}/prescriptions")
    public ResponseEntity<Prescription> createPrescription(@PathVariable Long id, @RequestBody Prescription prescription) {
        if (!patientRepository.existsById(id)) return ResponseEntity.notFound().build();
        prescription.setPatientId(id);
        return ResponseEntity.ok(prescriptionRepository.save(prescription));
    }
}
