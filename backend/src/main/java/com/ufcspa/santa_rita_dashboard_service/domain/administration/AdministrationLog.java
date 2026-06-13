package com.ufcspa.santa_rita_dashboard_service.domain.administration;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "administration_logs")
public class AdministrationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prescription_item_id", nullable = false)
    private Long prescriptionItemId;

    @Column(name = "administered_at", nullable = false)
    private LocalDateTime administeredAt = LocalDateTime.now();

    @Column(name = "scheduled_time", nullable = false)
    private String scheduledTime;

    @Column(name = "administered_by")
    private String administeredBy;

    private String notes;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPrescriptionItemId() { return prescriptionItemId; }
    public void setPrescriptionItemId(Long prescriptionItemId) { this.prescriptionItemId = prescriptionItemId; }
    public LocalDateTime getAdministeredAt() { return administeredAt; }
    public void setAdministeredAt(LocalDateTime administeredAt) { this.administeredAt = administeredAt; }
    public String getScheduledTime() { return scheduledTime; }
    public void setScheduledTime(String scheduledTime) { this.scheduledTime = scheduledTime; }
    public String getAdministeredBy() { return administeredBy; }
    public void setAdministeredBy(String administeredBy) { this.administeredBy = administeredBy; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
