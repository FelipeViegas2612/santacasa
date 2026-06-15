package com.ufcspa.santa_rita_dashboard_service.domain.medication;

import com.ufcspa.santa_rita_dashboard_service.domain.patient.Patient;
import com.ufcspa.santa_rita_dashboard_service.domain.patient.PatientRepository;
import com.ufcspa.santa_rita_dashboard_service.domain.prescription.PrescriptionItem;
import com.ufcspa.santa_rita_dashboard_service.domain.prescription.PrescriptionItemRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/medications")
public class MedicationController {

    private final MedicationRepository medicationRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final PatientRepository patientRepository;

    public MedicationController(MedicationRepository medicationRepository,
                                 PrescriptionItemRepository prescriptionItemRepository,
                                 PatientRepository patientRepository) {
        this.medicationRepository = medicationRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.patientRepository = patientRepository;
    }

    @GetMapping
    public List<Medication> getAll(@RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return medicationRepository.findByNameContainingIgnoreCase(search);
        }
        return medicationRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Medication> getById(@PathVariable Long id) {
        return medicationRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Medication create(@RequestBody Medication medication) {
        return medicationRepository.save(medication);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Medication> update(@PathVariable Long id, @RequestBody Medication req) {
        return medicationRepository.findById(id).map(m -> {
            m.setName(req.getName());
            m.setActiveIngredient(req.getActiveIngredient());
            m.setConcentration(req.getConcentration());
            m.setForm(req.getForm());
            m.setRoute(req.getRoute());
            m.setManufacturer(req.getManufacturer());
            m.setLot(req.getLot());
            m.setExpiresAt(req.getExpiresAt());
            m.setStock(req.getStock());
            m.setMinStock(req.getMinStock());
            m.setUnit(req.getUnit());
            m.setCategory(req.getCategory());
            m.setObservation(req.getObservation());
            return ResponseEntity.ok(medicationRepository.save(m));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        if (!medicationRepository.existsById(id)) return ResponseEntity.notFound().build();
        medicationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Medicamento removido"));
    }

    @GetMapping("/{id}/patients")
    public ResponseEntity<List<Patient>> getPatients(@PathVariable Long id) {
        if (!medicationRepository.existsById(id)) return ResponseEntity.notFound().build();
        List<Long> patientIds = prescriptionItemRepository.findDistinctPatientIdsByMedicationId(id);
        if (patientIds.isEmpty()) return ResponseEntity.ok(List.of());
        return ResponseEntity.ok(patientRepository.findAllById(patientIds));
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<PrescriptionItem>> getItems(@PathVariable Long id) {
        if (!medicationRepository.existsById(id)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(prescriptionItemRepository.findByMedicationId(id));
    }
}
