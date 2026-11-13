package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.request.DisputeVerdictRequest;
import com.be.scamshield.dto.request.ModeratorDisputeFilterRequest;
import com.be.scamshield.dto.response.ModeratorDisputeQueueResponse;
import com.be.scamshield.dto.response.ModeratorDisputeResponse;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IModeratorDisputeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.Duration;
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/moderator/disputes")
@RequiredArgsConstructor
@Tag(name = "Moderator Dispute Queue", description = "API quản lý hàng chờ khiếu nại và ra phán quyết dành cho kiểm duyệt viên (MODERATOR)")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('MODERATOR', 'ADMINISTRATOR')")
public class ModeratorDisputeController {

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of(
            "id",
            "createdAt",
            "updatedAt",
            "status",
            "priority"
    );

    private final IModeratorDisputeService moderatorDisputeService;

    @GetMapping
    @Operation(
            summary = "Lấy danh sách hàng chờ khiếu nại (Dispute Queue)",
            description = "Trả về danh sách hồ sơ khiếu nại trong hàng chờ kiểm duyệt kèm số lượng ca đang chờ xem xét (pendingCount). " +
                    "Hỗ trợ tìm kiếm theo mã AP-2024-XXXX, số điện thoại, tên miền, người gửi, danh mục; lọc theo trạng thái và phân trang."
    )
    public ResponseEntity<BaseResponse<ModeratorDisputeQueueResponse>> getDisputes(
            @Valid @ModelAttribute @ParameterObject ModeratorDisputeFilterRequest filter
    ) {
        Pageable pageable = createPageable(filter);
        ModeratorDisputeQueueResponse response = moderatorDisputeService.getDisputeQueue(filter, pageable);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách hàng chờ khiếu nại thành công", response));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Lấy thông tin chi tiết một ca khiếu nại theo ID hoặc mã hồ sơ",
            description = "Trả về chi tiết một hồ sơ khiếu nại bao gồm lý do khiếu nại, quyết định gốc, đối tượng bị báo cáo và danh sách tệp bằng chứng phản bác."
    )
    public ResponseEntity<BaseResponse<ModeratorDisputeResponse>> getDisputeById(
            @Parameter(description = "ID hoặc mã hiển thị của hồ sơ khiếu nại (ví dụ: 41 hoặc AP-2024-0041)")
            @PathVariable String id
    ) {
        ModeratorDisputeResponse response = moderatorDisputeService.getDisputeById(id);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy chi tiết hồ sơ khiếu nại thành công", response));
    }

    @GetMapping("/{id}/evidence/{evidenceId}/download")
    @Operation(summary = "Tải bằng chứng khiếu nại", description = "Tải bằng chứng khiếu nại qua backend để bảo toàn chính sách CORS đối với dữ liệu cũ.")
    public ResponseEntity<byte[]> downloadEvidence(
            @PathVariable String id,
            @PathVariable Long evidenceId
    ) {
        String downloadUrl = moderatorDisputeService.getEvidenceDownloadUrl(id, evidenceId);
        try {
            java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder()
                    .followRedirects(java.net.http.HttpClient.Redirect.NEVER)
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(URI.create(downloadUrl))
                    .timeout(Duration.ofSeconds(30))
                    .GET()
                    .build();
            java.net.http.HttpResponse<byte[]> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 200 && response.statusCode() < 300
                    && "https".equalsIgnoreCase(response.uri().getScheme())) {
                HttpHeaders headers = new HttpHeaders();
                response.headers().firstValue("Content-Type").ifPresent(ct -> headers.set(HttpHeaders.CONTENT_TYPE, ct));
                response.headers().firstValue("Content-Disposition").ifPresent(cd -> headers.set(HttpHeaders.CONTENT_DISPOSITION, cd));
                if (headers.get(HttpHeaders.CONTENT_DISPOSITION) == null) {
                    headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment");
                }
                return new ResponseEntity<>(response.body(), headers, HttpStatus.OK);
            }
        } catch (Exception ex) {
            log.warn("Không thể proxy tải tệp bằng chứng cho hồ sơ {} evidence {}", id, evidenceId, ex);
        }
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
    }

    @PutMapping(value = {"/{id}/decision", "/{id}"})
    @Operation(
            summary = "Kiểm duyệt viên đưa ra phán quyết kháng nghị",
            description = "Thực hiện phán quyết cho hồ sơ kháng nghị: " +
                    "RETRACT (Thu hồi chỉ số: xóa khỏi blacklist nếu bằng chứng thuyết phục) hoặc " +
                    "UPHOLD (Duy trì quyết định gốc: từ chối kháng nghị). " +
                    "Yêu cầu nhập lý do bắt buộc tối thiểu 20 ký tự."
    )
    public ResponseEntity<BaseResponse<ModeratorDisputeResponse>> makeDecision(
            @Parameter(description = "ID hoặc mã hiển thị của hồ sơ khiếu nại (ví dụ: 41 hoặc AP-2024-0041)")
            @PathVariable String id,
            @Valid @RequestBody DisputeVerdictRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String moderatorUsername = currentUser != null ? currentUser.getUsername() : null;
        ModeratorDisputeResponse response = moderatorDisputeService.makeDecision(id, request, moderatorUsername);
        String actionText = "RETRACT".equalsIgnoreCase(request.getVerdict())
                ? "Thu hồi chỉ số lừa đảo thành công"
                : "Duy trì quyết định gốc, từ chối kháng nghị thành công";
        return ResponseEntity.ok(new BaseResponse<>(true, actionText, response));
    }

    private Pageable createPageable(ModeratorDisputeFilterRequest filter) {
        if (filter.getPage() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page index must not be less than zero");
        }
        if (filter.getSize() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page size must not be less than one");
        }
        int cappedSize = Math.min(filter.getSize(), 100);

        String sort = filter.getSort();
        if (sort == null || sort.trim().isEmpty()) {
            sort = "createdAt,desc";
        }

        String[] sortParams = sort.split(",");
        Sort.Direction direction = (sortParams.length > 1 && "asc".equalsIgnoreCase(sortParams[1].trim()))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        String sortProperty = sortParams[0].trim();
        if (!ALLOWED_SORT_PROPERTIES.contains(sortProperty)) {
            sortProperty = "createdAt";
        }

        return PageRequest.of(filter.getPage(), cappedSize, Sort.by(direction, sortProperty));
    }
}
