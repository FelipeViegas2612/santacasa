package com.ufcspa.santa_rita_dashboard_service.domain.prescription;

import com.ufcspa.santa_rita_dashboard_service.domain.administration.AdministrationLog;
import com.ufcspa.santa_rita_dashboard_service.domain.administration.AdministrationLogRepository;
import com.ufcspa.santa_rita_dashboard_service.domain.history.PrescriptionHistory;
import com.ufcspa.santa_rita_dashboard_service.domain.history.PrescriptionHistoryRepository;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api")
public class PrescriptionController {

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository itemRepository;
    private final AdministrationLogRepository logRepository;
    private final PrescriptionHistoryRepository historyRepository;

    public PrescriptionController(PrescriptionRepository prescriptionRepository,
                                   PrescriptionItemRepository itemRepository,
                                   AdministrationLogRepository logRepository,
                                   PrescriptionHistoryRepository historyRepository) {
        this.prescriptionRepository = prescriptionRepository;
        this.itemRepository = itemRepository;
        this.logRepository = logRepository;
        this.historyRepository = historyRepository;
    }

    @GetMapping("/prescriptions")
    public List<Prescription> listAll() {
        return prescriptionRepository.findAll();
    }

    @GetMapping("/prescriptions/{id}")
    public ResponseEntity<Prescription> getOne(@PathVariable Long id) {
        return prescriptionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/prescriptions")
    public Prescription create(@RequestBody Prescription req) {
        return prescriptionRepository.save(req);
    }

    @DeleteMapping("/prescriptions/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        if (!prescriptionRepository.existsById(id)) return ResponseEntity.notFound().build();
        prescriptionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Prescrição removida"));
    }

    @PutMapping("/prescriptions/{id}")
    public ResponseEntity<Prescription> updatePrescription(@PathVariable Long id, @RequestBody Prescription req) {
        return prescriptionRepository.findById(id).map(p -> {
            p.setReviewedAt(req.getReviewedAt());
            p.setValidUntil(req.getValidUntil());
            p.setNotes(req.getNotes());
            return ResponseEntity.ok(prescriptionRepository.save(p));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/prescriptions/{id}/items")
    public ResponseEntity<List<PrescriptionItem>> getItems(@PathVariable Long id) {
        return prescriptionRepository.findById(id)
                .map(p -> ResponseEntity.ok(itemRepository.findByPrescriptionIdOrderBySortOrderAsc(id)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/prescriptions/{id}/items")
    public ResponseEntity<PrescriptionItem> addItem(@PathVariable Long id, @RequestBody PrescriptionItem item) {
        if (!prescriptionRepository.existsById(id)) return ResponseEntity.notFound().build();
        item.setPrescriptionId(id);
        return ResponseEntity.ok(itemRepository.save(item));
    }

    @PutMapping("/prescription-items/{id}")
    public ResponseEntity<PrescriptionItem> updateItem(@PathVariable Long id,
                                                        @RequestBody PrescriptionItem req,
                                                        @AuthenticationPrincipal String email) {
        return itemRepository.findById(id).map(item -> {
            recordChange(id, "name", item.getName(), req.getName(), email);
            recordChange(id, "itemType", item.getItemType(), req.getItemType(), email);
            recordChange(id, "medicationId",
                    item.getMedicationId() == null ? null : String.valueOf(item.getMedicationId()),
                    req.getMedicationId() == null ? null : String.valueOf(req.getMedicationId()),
                    email);
            recordChange(id, "frequency", item.getFrequency(), req.getFrequency(), email);
            recordChange(id, "quantity", item.getQuantity(), req.getQuantity(), email);
            recordChange(id, "morningTimes", item.getMorningTimes(), req.getMorningTimes(), email);
            recordChange(id, "afternoonTimes", item.getAfternoonTimes(), req.getAfternoonTimes(), email);
            recordChange(id, "nightTimes", item.getNightTimes(), req.getNightTimes(), email);
            recordChange(id, "observation", item.getObservation(), req.getObservation(), email);

            item.setName(req.getName());
            item.setItemType(req.getItemType());
            item.setMedicationId(req.getMedicationId());
            item.setFrequency(req.getFrequency());
            item.setQuantity(req.getQuantity());
            item.setMorningTimes(req.getMorningTimes());
            item.setAfternoonTimes(req.getAfternoonTimes());
            item.setNightTimes(req.getNightTimes());
            item.setObservation(req.getObservation());
            item.setSortOrder(req.getSortOrder());
            return ResponseEntity.ok(itemRepository.save(item));
        }).orElse(ResponseEntity.notFound().build());
    }

    private void recordChange(Long itemId, String field, String oldValue, String newValue, String email) {
        if (Objects.equals(oldValue, newValue)) return;
        PrescriptionHistory h = new PrescriptionHistory();
        h.setPrescriptionItemId(itemId);
        h.setFieldChanged(field);
        h.setOldValue(oldValue);
        h.setNewValue(newValue);
        h.setChangedBy(email);
        h.setChangedAt(LocalDateTime.now());
        historyRepository.save(h);
    }

    @DeleteMapping("/prescription-items/{id}")
    public ResponseEntity<Map<String, String>> deleteItem(@PathVariable Long id) {
        if (!itemRepository.existsById(id)) return ResponseEntity.notFound().build();
        itemRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Item removido"));
    }

    @PostMapping("/administration-logs")
    public ResponseEntity<AdministrationLog> createLog(@RequestBody AdministrationLog log,
                                                       @AuthenticationPrincipal String email) {
        if (log.getPrescriptionItemId() == null
                || !itemRepository.existsById(log.getPrescriptionItemId())) {
            return ResponseEntity.badRequest().build();
        }
        if (log.getAdministeredBy() == null) log.setAdministeredBy(email);
        return ResponseEntity.ok(logRepository.save(log));
    }

    @DeleteMapping("/administration-logs/{id}")
    public ResponseEntity<Map<String, String>> deleteLog(@PathVariable Long id) {
        if (!logRepository.existsById(id)) return ResponseEntity.notFound().build();
        logRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Administração desfeita"));
    }

    @GetMapping("/prescription-items/{id}/administration-logs")
    public List<AdministrationLog> getLogs(@PathVariable Long id,
                                            @RequestParam(required = false)
                                            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<AdministrationLog> all = logRepository.findByPrescriptionItemIdOrderByAdministeredAtDesc(id);
        if (date == null) return all;
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);
        return all.stream()
                .filter(l -> l.getAdministeredAt() != null
                        && !l.getAdministeredAt().isBefore(start)
                        && !l.getAdministeredAt().isAfter(end))
                .toList();
    }

    @GetMapping("/prescription-items/{id}/history")
    public List<PrescriptionHistory> getHistory(@PathVariable Long id) {
        return historyRepository.findByPrescriptionItemIdOrderByChangedAtDesc(id);
    }
}
