package com.be.scamshield.dto.response;

public record ModeratorDashboardResponse(
        DecisionCounts reports, DecisionCounts disputes, DecisionCounts partnerSubmissions) {

    public record DecisionCounts(long accepted, long rejected, long total) {
        public DecisionCounts(long accepted, long rejected) {
            this(accepted, rejected, accepted + rejected);
        }
    }
}
