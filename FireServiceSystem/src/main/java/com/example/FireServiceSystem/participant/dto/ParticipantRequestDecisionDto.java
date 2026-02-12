package com.example.FireServiceSystem.participant.dto;

public class ParticipantRequestDecisionDto {
    private String status;
    private Long decidedBy;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getDecidedBy() {
        return decidedBy;
    }

    public void setDecidedBy(Long decidedBy) {
        this.decidedBy = decidedBy;
    }
}
