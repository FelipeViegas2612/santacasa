package com.ufcspa.santa_rita_dashboard_service.domain.routine;

import jakarta.persistence.*;

@Entity
@Table(name = "routine_activities")
public class RoutineActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_id", nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String description;

    private String frequency;

    @Column(columnDefinition = "TEXT")
    private String times;

    @Column(columnDefinition = "TEXT")
    private String details;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }
    public String getTimes() { return times; }
    public void setTimes(String times) { this.times = times; }
    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }
}
