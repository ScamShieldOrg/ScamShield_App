package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.SupabaseStorageService;

import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.dto.request.DisputeVerdictRequest;
import com.be.scamshield.dto.request.ModeratorDisputeFilterRequest;
import com.be.scamshield.dto.response.ModeratorDisputeQueueResponse;
import com.be.scamshield.dto.response.ModeratorDisputeResponse;
import com.be.scamshield.entity.*;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ModeratorDisputeServiceImplTest {

    @Mock
    private DisputeRepository disputeRepository;

    @Mock
    private DisputeEvidenceRepository evidenceRepository;

    @Mock
    private ConfirmedIndicatorRepository confirmedIndicatorRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private SupabaseStorageService storageService;

    @InjectMocks
    private ModeratorDisputeServiceImpl service;

    private Dispute sampleDispute;
    private ConfirmedIndicator confirmedIndicator;
    private Indicator indicator;
    private ScamCategory category;
    private User submitter;
    private User moderator;
    private Report sourceReport;

    @BeforeEach
    void setUp() {
        submitter = User.builder()
                .id(10L)
                .fullName("Lê Hoàng Tùng")
                .email("lehoangtung_biz@gmail.com")
                .build();

        moderator = User.builder()
                .id(2L)
                .fullName("VCB Security Sentinel")
                .email("moderator@scamshield.vn")
                .build();

        indicator = Indicator.builder()
                .id(100L)
                .type("PHONE")
                .normalizedValue("0383456789")
                .displayValue("0383 456 789")
                .build();

        category = ScamCategory.builder()
                .id(1L)
                .code("VIEC_LAM")
                .name("Lừa đảo việc làm lương cao")
                .build();

        sourceReport = Report.builder()
                .id(1820L)
                .createdAt(LocalDateTime.of(2024, 1, 10, 10, 0))
                .build();

        confirmedIndicator = ConfirmedIndicator.builder()
                .id(50L)
                .indicator(indicator)
                .category(category)
                .status("ACTIVE")
                .sourceReport(sourceReport)
                .confirmedByUser(moderator)
                .confirmedAt(LocalDateTime.of(2024, 1, 10, 12, 0))
                .build();

        sampleDispute = Dispute.builder()
                .id(41L)
                .confirmedIndicator(confirmedIndicator)
                .submittedByUser(submitter)
                .submitterName("lehoangtung_biz")
                .submitterContact("contact@tungbiz.vn")
                .reason("Đây là số điện thoại của công ty tuyển dụng hợp pháp tại Hà Nội.")
                .status(DisputeStatus.PENDING)
                .createdAt(LocalDateTime.of(2024, 1, 14, 16, 45))
                .build();
    }

    @Test
    @DisplayName("getDisputeQueue returns expected items and pending count matching UI")
    void getDisputeQueue_ReturnsValidResponse() {
        Pageable pageable = PageRequest.of(0, 10);
        when(disputeRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(sampleDispute), pageable, 1));
        when(disputeRepository.countByStatusIn(any())).thenReturn(2L);

        DisputeEvidence ev1 = DisputeEvidence.builder()
                .id(1L)
                .dispute(sampleDispute)
                .fileName("business_registration.pdf")
                .evidenceType("DOCUMENT")
                .fileUrl("https://storage.example/doc1.pdf")
                .build();
        when(evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(41L)).thenReturn(List.of(ev1));

        ModeratorDisputeFilterRequest filter = new ModeratorDisputeFilterRequest();
        ModeratorDisputeQueueResponse response = service.getDisputeQueue(filter, pageable);

        assertThat(response).isNotNull();
        assertThat(response.getPendingCount()).isEqualTo(2L);
        assertThat(response.getItems()).hasSize(1);

        ModeratorDisputeResponse item = response.getItems().get(0);
        assertThat(item.getId()).isEqualTo("AP-2024-0041");
        assertThat(item.getOriginalReportId()).isEqualTo("CS-2024-1820");
        assertThat(item.getTargetIdentifier()).isEqualTo("0383 456 789");
        assertThat(item.getCategory()).isEqualTo("Lừa đảo việc làm lương cao");
        assertThat(item.getDisputedBy()).isEqualTo("lehoangtung_biz");
        assertThat(item.getDisputedAt()).isEqualTo("14/01 16:45");
        assertThat(item.getStatus()).isEqualTo("Đang xét");
        assertThat(item.getOriginalDecision()).isEqualTo("Approved");
        assertThat(item.getEvidences()).hasSize(1);
        assertThat(item.getEvidences().get(0).getType()).isEqualTo("pdf");
    }

    @Test
    @DisplayName("getDisputeById accepts formatted dispute code e.g. AP-2024-0041")
    void getDisputeById_FormattedCode_Success() {
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));
        when(evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(41L)).thenReturn(Collections.emptyList());

        ModeratorDisputeResponse response = service.getDisputeById("AP-2024-0041");

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo("AP-2024-0041");
        assertThat(response.getRawId()).isEqualTo(41L);
        assertThat(response.getTargetIdentifier()).isEqualTo("0383 456 789");
    }

    @Test
    @DisplayName("getDisputeById accepts raw numeric string e.g. 41")
    void getDisputeById_NumericId_Success() {
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));
        when(evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(41L)).thenReturn(Collections.emptyList());

        ModeratorDisputeResponse response = service.getDisputeById("41");

        assertThat(response).isNotNull();
        assertThat(response.getRawId()).isEqualTo(41L);
    }

    @Test
    @DisplayName("getDisputeById throws ResourceNotFoundException if dispute does not exist")
    void getDisputeById_NotFound_ThrowsException() {
        when(disputeRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDisputeById("999"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    @DisplayName("makeDecision with RETRACT verdict approves dispute and retracts confirmed indicator")
    void makeDecision_Retract_Success() {
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));
        when(userRepository.findByEmailOrPhoneNumber("moderator@scamshield.vn")).thenReturn(Optional.of(moderator));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("RETRACT")
                .reason("Bằng chứng giấy phép kinh doanh và chứng từ thuế hợp lệ, xác minh số tổng đài chính thức.")
                .build();

        ModeratorDisputeResponse response = service.makeDecision("AP-2024-0041", request, "moderator@scamshield.vn");

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("Chấp nhận");
        assertThat(sampleDispute.getStatus()).isEqualTo(DisputeStatus.APPROVED);
        assertThat(confirmedIndicator.getStatus()).isEqualTo("RETRACTED");
        assertThat(confirmedIndicator.getRetractedAt()).isNotNull();
        assertThat(confirmedIndicator.getRetractionReason()).isEqualTo(request.getReason());

        verify(confirmedIndicatorRepository).save(confirmedIndicator);
        verify(disputeRepository).save(sampleDispute);
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("makeDecision with UPHOLD verdict rejects dispute and preserves confirmed indicator")
    void makeDecision_Uphold_Success() {
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));
        when(userRepository.findByEmailOrPhoneNumber("moderator@scamshield.vn")).thenReturn(Optional.of(moderator));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("UPHOLD")
                .reason("Bằng chứng cung cấp chưa đủ cơ sở chứng minh quyền sở hữu hợp pháp; giữ nguyên quyết định.")
                .build();

        ModeratorDisputeResponse response = service.makeDecision("41", request, "moderator@scamshield.vn");

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("Từ chối");
        assertThat(sampleDispute.getStatus()).isEqualTo(DisputeStatus.REJECTED);
        assertThat(confirmedIndicator.getStatus()).isEqualTo("ACTIVE");

        verify(confirmedIndicatorRepository, never()).save(any());
        verify(disputeRepository).save(sampleDispute);
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("makeDecision throws BadRequestException for unsupported verdict value")
    void makeDecision_InvalidVerdict_ThrowsBadRequestException() {
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));

        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("MAYBE_PENDING")
                .reason("Không rõ lý do gì cả nhưng phải viết đủ 20 ký tự...")
                .build();

        assertThatThrownBy(() -> service.makeDecision("41", request, "moderator@scamshield.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Phán quyết không hợp lệ");
    }

    @Test
    @DisplayName("makeDecision throws BadRequestException when dispute is already APPROVED")
    void makeDecision_DisputeAlreadyApproved_ThrowsBadRequestException() {
        sampleDispute.setStatus(DisputeStatus.APPROVED);
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));

        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("RETRACT")
                .reason("Bằng chứng đã xử lý xong trước đó và đầy đủ 20 ký tự...")
                .build();

        assertThatThrownBy(() -> service.makeDecision("41", request, "moderator@scamshield.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể ra phán quyết cho hồ sơ khiếu nại có trạng thái: APPROVED");

        verify(disputeRepository, never()).save(any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("makeDecision throws BadRequestException when dispute is already REJECTED")
    void makeDecision_DisputeAlreadyRejected_ThrowsBadRequestException() {
        sampleDispute.setStatus(DisputeStatus.REJECTED);
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));

        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("UPHOLD")
                .reason("Bằng chứng đã xử lý xong trước đó và đầy đủ 20 ký tự...")
                .build();

        assertThatThrownBy(() -> service.makeDecision("41", request, "moderator@scamshield.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể ra phán quyết cho hồ sơ khiếu nại có trạng thái: REJECTED");

        verify(disputeRepository, never()).save(any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("makeDecision throws BadRequestException when dispute is in DRAFT status")
    void makeDecision_DisputeDraft_ThrowsBadRequestException() {
        sampleDispute.setStatus(DisputeStatus.DRAFT);
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));

        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("RETRACT")
                .reason("Bằng chứng cho bản nháp chưa gửi đi đủ 20 ký tự...")
                .build();

        assertThatThrownBy(() -> service.makeDecision("41", request, "moderator@scamshield.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể ra phán quyết cho hồ sơ khiếu nại có trạng thái: DRAFT");

        verify(disputeRepository, never()).save(any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("makeDecision throws ResourceNotFoundException when specified moderator user is not found")
    void makeDecision_ModeratorNotFound_ThrowsResourceNotFoundException() {
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));
        when(userRepository.findByEmailOrPhoneNumber("nonexistent@scamshield.vn")).thenReturn(Optional.empty());

        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("RETRACT")
                .reason("Bằng chứng hợp lệ đủ 20 ký tự cần xử lý thẩm định...")
                .build();

        assertThatThrownBy(() -> service.makeDecision("41", request, "nonexistent@scamshield.vn"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy thông tin tài khoản kiểm duyệt viên: nonexistent@scamshield.vn");

        verify(disputeRepository, never()).save(any());
        verify(auditLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("makeDecision preserves existing behavior when moderator username is blank")
    void makeDecision_BlankModeratorUsername_PreservesExistingBehavior() {
        when(disputeRepository.findById(41L)).thenReturn(Optional.of(sampleDispute));
        when(disputeRepository.save(any(Dispute.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("UPHOLD")
                .reason("Bằng chứng không hợp lệ đầy đủ tối thiểu 20 ký tự...")
                .build();

        ModeratorDisputeResponse response = service.makeDecision("41", request, null);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("Từ chối");
        assertThat(sampleDispute.getResolvedByUser()).isNull();
        verify(userRepository, never()).findByEmailOrPhoneNumber(any());
        verify(disputeRepository).save(sampleDispute);
    }
}
