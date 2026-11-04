package com.be.scamshield.service;

import com.be.scamshield.dto.request.DisputeVerdictRequest;
import com.be.scamshield.dto.request.ModeratorDisputeFilterRequest;
import com.be.scamshield.dto.response.ModeratorDisputeQueueResponse;
import com.be.scamshield.dto.response.ModeratorDisputeResponse;
import org.springframework.data.domain.Pageable;

public interface IModeratorDisputeService {

    ModeratorDisputeQueueResponse getDisputeQueue(ModeratorDisputeFilterRequest filter, Pageable pageable);

    ModeratorDisputeResponse getDisputeById(String idOrCode);

    String getEvidenceDownloadUrl(String idOrCode, Long evidenceId);

    ModeratorDisputeResponse makeDecision(String idOrCode, DisputeVerdictRequest request, String currentModeratorUsername);

}
