package com.be.scamshield.controller;

import com.be.scamshield.constant.EvidenceAnalysisStatus;
import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.serviceImpl.EvidenceAnalysisQueueService;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/moderator/reports")
@PreAuthorize("hasAnyRole('MODERATOR','ADMINISTRATOR')")
@RequiredArgsConstructor
@Tag(name = "Evidence analysis", description = "Phân tích pHash và nội dung OCR của minh chứng")
@SecurityRequirement(name = "bearerAuth")
public class ModeratorEvidenceAnalysisController {
    private final EvidenceAnalysisQueueService queue;

    @PostMapping("/{reportId}/evidence/{evidenceId}/analysis")
    @Operation(summary = "Đưa minh chứng vào hàng đợi phân tích hoặc phân tích lại")
    public ResponseEntity<BaseResponse<EvidenceAnalysisStatus>> enqueue(@PathVariable Long reportId, @PathVariable Long evidenceId) {
        return ResponseEntity.accepted().body(new BaseResponse<>(true, "Minh chứng đã được đưa vào hàng đợi phân tích", queue.enqueue(reportId, evidenceId)));
    }
}
