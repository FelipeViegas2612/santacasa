package com.ufcspa.santa_rita_dashboard_service.domain.prescription;

import jakarta.persistence.*;

@Entity
@Table(name = "prescription_items")
public class PrescriptionItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "prescription_id", nullable = false)
    private Long prescriptionId;

    @Column(name = "medication_id")
    private Long medicationId;

    @Column(name = "item_type", nullable = false)
    private String itemType;

    @Column(nullable = false)
    private String name;

    private String frequency;
    private String quantity;

    @Column(name = "morning_times")
    private String morningTimes;

    @Column(name = "afternoon_times")
    private String afternoonTimes;

    @Column(name = "night_times")
    private String nightTimes;

    @Column(columnDefinition = "TEXT")
    private String observation;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPrescriptionId() { return prescriptionId; }
    public void setPrescriptionId(Long prescriptionId) { this.prescriptionId = prescriptionId; }
    public Long getMedicationId() { return medicationId; }
    public void setMedicationId(Long medicationId) { this.medicationId = medicationId; }
    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public String getQuantity() { return quantity; }
    public void setQuantity(String quantity) { this.quantity = quantity; }
    public String getMorningTimes() { return morningTimes; }
    public void setMorningTimes(String morningTimes) { this.morningTimes = morningTimes; }
    public String getAfternoonTimes() { return afternoonTimes; }
    public void setAfternoonTimes(String afternoonTimes) { this.afternoonTimes = afternoonTimes; }
    public String getNightTimes() { return nightTimes; }
    public void setNightTimes(String nightTimes) { this.nightTimes = nightTimes; }
    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
