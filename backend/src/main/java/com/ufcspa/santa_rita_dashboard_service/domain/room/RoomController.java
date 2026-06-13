package com.ufcspa.santa_rita_dashboard_service.domain.room;

import com.ufcspa.santa_rita_dashboard_service.domain.patient.Patient;
import com.ufcspa.santa_rita_dashboard_service.domain.patient.PatientRepository;
import com.ufcspa.santa_rita_dashboard_service.domain.prescription.PrescriptionItem;
import com.ufcspa.santa_rita_dashboard_service.domain.prescription.PrescriptionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomRepository roomRepository;
    private final PatientRepository patientRepository;
    private final PrescriptionRepository prescriptionRepository;

    public RoomController(RoomRepository roomRepository, PatientRepository patientRepository, PrescriptionRepository prescriptionRepository) {
        this.roomRepository = roomRepository;
        this.patientRepository = patientRepository;
        this.prescriptionRepository = prescriptionRepository;
    }

    @GetMapping
    public List<Room> getAll() {
        List<Room> rooms = roomRepository.findAll();
        rooms.forEach(this::applyDerivedStatus);
        return rooms;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Room> getById(@PathVariable Long id) {
        return roomRepository.findById(id)
                .map(r -> { applyDerivedStatus(r); return ResponseEntity.ok(r); })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Room create(@RequestBody Room room) {
        if (!"MAINTENANCE".equals(room.getStatus())) room.setStatus("AVAILABLE");
        Room saved = roomRepository.save(room);
        applyDerivedStatus(saved);
        return saved;
    }

    @PutMapping("/{id}")
    public ResponseEntity<Room> update(@PathVariable Long id, @RequestBody Room request) {
        return roomRepository.findById(id).map(room -> {
            room.setNumber(request.getNumber());
            room.setType(request.getType());
            room.setCapacity(request.getCapacity());
            room.setDescription(request.getDescription());
            // status is derived on read; only MAINTENANCE is persisted via /status endpoint
            Room saved = roomRepository.save(room);
            applyDerivedStatus(saved);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        if (!roomRepository.existsById(id)) return ResponseEntity.notFound().build();
        roomRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Quarto removido"));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Room> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return roomRepository.findById(id).map(room -> {
            String requested = body.get("status");
            // Only MAINTENANCE is a real persisted state; anything else clears it back to AVAILABLE
            room.setStatus("MAINTENANCE".equals(requested) ? "MAINTENANCE" : "AVAILABLE");
            Room saved = roomRepository.save(room);
            applyDerivedStatus(saved);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    private void applyDerivedStatus(Room room) {
        if ("MAINTENANCE".equals(room.getStatus())) return;
        long occupied = patientRepository.findByRoomId(room.getId()).size();
        int capacity = room.getCapacity() == null ? 0 : room.getCapacity();
        room.setStatus(capacity > 0 && occupied >= capacity ? "OCCUPIED" : "AVAILABLE");
    }

    @GetMapping("/{id}/daily")
    public ResponseEntity<List<Map<String, Object>>> getRoomDaily(@PathVariable Long id) {
        List<Patient> patients = patientRepository.findByRoomId(id);
        List<Map<String, Object>> result = new ArrayList<>();
        for (Patient p : patients) {
            List<PrescriptionItem> items = prescriptionRepository
                    .findFirstByPatientIdOrderByCreatedAtDesc(p.getId())
                    .map(presc -> presc.getItems())
                    .orElse(List.of());
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("patient", p);
            entry.put("items", items);
            result.add(entry);
        }
        return ResponseEntity.ok(result);
    }
}
