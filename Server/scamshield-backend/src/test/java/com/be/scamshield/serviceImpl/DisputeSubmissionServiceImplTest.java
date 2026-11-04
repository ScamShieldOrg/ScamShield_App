package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.DisputeIndicatorType;
import com.be.scamshield.constant.DisputeLegalRelationship;
import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.dto.request.SaveDisputeDraftRequest;
import com.be.scamshield.dto.request.SubmitDisputeRequest;
import com.be.scamshield.dto.response.DisputeFormResponse;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Dispute;
import com.be.scamshield.entity.DisputeEvidence;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.DisputeConflictException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.repository.ConfirmedIndicatorRepository;
import com.be.scamshield.repository.DisputeEvidenceRepository;
import com.be.scamshield.repository.DisputeRepository;
import com.be.scamshield.repository.UserRepository;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit Test Suite for DisputeSubmissionServiceImpl (WF-03 Submitter Flow).
 * Pattern: AAA (Arrange - Act - Assert).
 */
@ExtendWith(MockitoExtension.class)
class DisputeSubmissionServiceImplTest {

        @Mock
        private DisputeRepository disputeRepository;

        @Mock
        private DisputeEvidenceRepository evidenceRepository;

        @Mock
        private ConfirmedIndicatorRepository confirmedRepository;

        @Mock
        private UserRepository userRepository;

        @Mock
        private SupabaseStorageService storage;

        @Mock
        private Validator validator;

        @Mock
        private Clock clock;

        @InjectMocks
        private DisputeSubmissionServiceImpl service;

        private User sampleUser;
        private Indicator sampleIndicator;
        private ConfirmedIndicator sampleConfirmedIndicator;
        private SubmitDisputeRequest sampleSubmitRequest;
        private MockMultipartFile validPdfFile;
        private MockMultipartFile validPngFile;
        private MockMultipartFile validJpegFile;

        private static final byte[] PDF_BYTES = "%PDF-1.4 valid test content".getBytes(StandardCharsets.US_ASCII);
        private static final byte[] PNG_BYTES = new byte[] { (byte) 137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0 };
        private static final byte[] JPEG_BYTES = new byte[] { (byte) 255, (byte) 216, (byte) 255, 0, 1, 2 };

        @BeforeEach
        void setUp() {
                if (!TransactionSynchronizationManager.isSynchronizationActive()) {
                        TransactionSynchronizationManager.initSynchronization();
                }

                Clock fixedClock = Clock.fixed(Instant.parse("2026-10-15T10:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
                lenient().when(clock.getZone()).thenReturn(fixedClock.getZone());
                lenient().when(clock.instant()).thenReturn(fixedClock.instant());
                lenient().when(clock.withZone(any())).thenReturn(fixedClock);

                sampleUser = User.builder()
                                .id(10L)
                                .fullName("Nguyễn Văn A")
                                .email("submitter@example.com")
                                .build();

                sampleIndicator = Indicator.builder()
                                .id(100L)
                                .type("PHONE")
                                .normalizedValue("0912345678")
                                .displayValue("0912 345 678")
                                .build();

                sampleConfirmedIndicator = ConfirmedIndicator.builder()
                                .id(50L)
                                .indicator(sampleIndicator)
                                .status("ACTIVE")
                                .build();

                sampleSubmitRequest = new SubmitDisputeRequest();
                sampleSubmitRequest.setIndicatorType(DisputeIndicatorType.PHONE);
                sampleSubmitRequest.setIndicatorValue("0912345678");
                sampleSubmitRequest.setLegalRelationship(DisputeLegalRelationship.LEGAL_REPRESENTATIVE);
                sampleSubmitRequest.setReason(
                                "Số điện thoại thuộc quyền sở hữu hợp pháp của công ty, đề nghị kiểm tra lại.");
                sampleSubmitRequest.setAgreeTerms(true);

                validPdfFile = new MockMultipartFile(
                                "files", "giay_phep_kinh_doanh.pdf", "application/pdf", PDF_BYTES);
                validPngFile = new MockMultipartFile(
                                "files", "chung_tu_so_huu.png", "image/png", PNG_BYTES);
                validJpegFile = new MockMultipartFile(
                                "files", "hop_dong_mang.jpg", "image/jpeg", JPEG_BYTES);

                lenient().when(validator.validate(any())).thenReturn(Collections.emptySet());
                lenient().when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
        }

        @AfterEach
        void tearDown() {
                if (TransactionSynchronizationManager.isSynchronizationActive()) {
                        TransactionSynchronizationManager.clearSynchronization();
                }
        }

        // =========================================================================
        // 1. HAPPY PATH CASES
        // =========================================================================

        @Test
        @DisplayName("submit: Submits dispute with valid PHONE indicator and proof file successfully")
        void submit_ValidPhoneDispute_Success() {
                // Arrange
                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(List.of(sampleConfirmedIndicator));
                when(disputeRepository.existsBySubmittedByUserIdAndConfirmedIndicatorIdAndStatusIn(eq(10L), eq(50L),
                                any()))
                                .thenReturn(false);
                when(disputeRepository.saveAndFlush(any(Dispute.class))).thenAnswer(invocation -> {
                        Dispute d = invocation.getArgument(0);
                        d.setId(101L);
                        return d;
                });
                when(storage.uploadDisputeFile(any(MultipartFile.class)))
                                .thenReturn(new SupabaseStorageService.UploadResult("https://storage/pdf1", "hash1",
                                                "disputes/key1.pdf", "giay_phep_kinh_doanh.pdf"));
                when(evidenceRepository.save(any(DisputeEvidence.class))).thenAnswer(invocation -> {
                        DisputeEvidence e = invocation.getArgument(0);
                        e.setId(1L);
                        return e;
                });

                // Act
                DisputeFormResponse response = service.submit(10L, sampleSubmitRequest, List.of(validPdfFile));

                // Assert
                assertThat(response).isNotNull();
                assertThat(response.status()).isEqualTo(DisputeStatus.PENDING);
                assertThat(response.indicatorType()).isEqualTo(DisputeIndicatorType.PHONE);
                assertThat(response.indicatorValue()).isEqualTo("0912345678");
                assertThat(response.attachments()).hasSize(1);
                assertThat(response.attachments().getFirst().fileName()).isEqualTo("giay_phep_kinh_doanh.pdf");

                verify(disputeRepository).saveAndFlush(any(Dispute.class));
                verify(storage).uploadDisputeFile(validPdfFile);
                verify(evidenceRepository).save(any(DisputeEvidence.class));
        }

        @Test
        @DisplayName("submit: Submits dispute with valid URL indicator successfully")
        void submit_ValidUrlDispute_Success() {
                // Arrange
                Indicator urlIndicator = Indicator.builder()
                                .id(102L)
                                .type("URL")
                                .normalizedValue("legit-shop.vn")
                                .displayValue("legit-shop.vn")
                                .build();
                ConfirmedIndicator urlConfirmed = ConfirmedIndicator.builder()
                                .id(52L)
                                .indicator(urlIndicator)
                                .status("ACTIVE")
                                .build();

                sampleSubmitRequest.setIndicatorType(DisputeIndicatorType.URL);
                sampleSubmitRequest.setIndicatorValue("https://legit-shop.vn/about");

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(List.of(urlConfirmed));
                when(disputeRepository.existsBySubmittedByUserIdAndConfirmedIndicatorIdAndStatusIn(eq(10L), eq(52L),
                                any()))
                                .thenReturn(false);
                when(disputeRepository.saveAndFlush(any(Dispute.class))).thenAnswer(invocation -> {
                        Dispute d = invocation.getArgument(0);
                        d.setId(102L);
                        return d;
                });
                when(storage.uploadDisputeFile(any(MultipartFile.class)))
                                .thenReturn(new SupabaseStorageService.UploadResult("https://storage/png1", "hash2",
                                                "disputes/key2.png", "chung_tu_so_huu.png"));
                when(evidenceRepository.save(any(DisputeEvidence.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // Act
                DisputeFormResponse response = service.submit(10L, sampleSubmitRequest, List.of(validPngFile));

                // Assert
                assertThat(response).isNotNull();
                assertThat(response.status()).isEqualTo(DisputeStatus.PENDING);
                assertThat(response.indicatorType()).isEqualTo(DisputeIndicatorType.URL);
                verify(disputeRepository).saveAndFlush(any(Dispute.class));
                verify(storage).uploadDisputeFile(validPngFile);
        }

        @Test
        @DisplayName("submit: Submits dispute with valid BANK_ACCOUNT indicator successfully")
        void submit_ValidBankAccountDispute_Success() {
                // Arrange
                Indicator bankIndicator = Indicator.builder()
                                .id(103L)
                                .type("BANK_ACCOUNT")
                                .normalizedValue("190384729102")
                                .displayValue("190384729102")
                                .build();
                ConfirmedIndicator bankConfirmed = ConfirmedIndicator.builder()
                                .id(53L)
                                .indicator(bankIndicator)
                                .status("ACTIVE")
                                .build();

                sampleSubmitRequest.setIndicatorType(DisputeIndicatorType.BANK_ACCOUNT);
                sampleSubmitRequest.setIndicatorValue("190384729102");

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(List.of(bankConfirmed));
                when(disputeRepository.existsBySubmittedByUserIdAndConfirmedIndicatorIdAndStatusIn(eq(10L), eq(53L),
                                any()))
                                .thenReturn(false);
                when(disputeRepository.saveAndFlush(any(Dispute.class))).thenAnswer(invocation -> {
                        Dispute d = invocation.getArgument(0);
                        d.setId(103L);
                        return d;
                });
                when(storage.uploadDisputeFile(any(MultipartFile.class)))
                                .thenReturn(new SupabaseStorageService.UploadResult("https://storage/jpg1", "hash3",
                                                "disputes/key3.jpg", "hop_dong_mang.jpg"));
                when(evidenceRepository.save(any(DisputeEvidence.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // Act
                DisputeFormResponse response = service.submit(10L, sampleSubmitRequest, List.of(validJpegFile));

                // Assert
                assertThat(response).isNotNull();
                assertThat(response.status()).isEqualTo(DisputeStatus.PENDING);
                verify(disputeRepository).saveAndFlush(any(Dispute.class));
        }

        @Test
        @DisplayName("createDraft: Saves new dispute draft without requiring proof files")
        void createDraft_ValidRequest_Success() {
                // Arrange
                SaveDisputeDraftRequest draftRequest = new SaveDisputeDraftRequest();
                draftRequest.setIndicatorType(DisputeIndicatorType.PHONE);
                draftRequest.setIndicatorValue("0912345678");
                draftRequest.setReason("Bản nháp lý do giải trình ban đầu...");

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(disputeRepository.saveAndFlush(any(Dispute.class))).thenAnswer(invocation -> {
                        Dispute d = invocation.getArgument(0);
                        d.setId(201L);
                        return d;
                });

                // Act
                DisputeFormResponse response = service.createDraft(10L, draftRequest, null);

                // Assert
                assertThat(response).isNotNull();
                assertThat(response.status()).isEqualTo(DisputeStatus.DRAFT);
                assertThat(response.reason()).isEqualTo("Bản nháp lý do giải trình ban đầu...");
                verify(disputeRepository).saveAndFlush(any(Dispute.class));
                verify(storage, never()).uploadDisputeFile(any());
        }

        @Test
        @DisplayName("submitDraft: Transitions existing DRAFT dispute to PENDING status")
        void submitDraft_ValidDraft_TransitionsToPending() {
                // Arrange
                Dispute draftDispute = Dispute.builder()
                                .id(201L)
                                .submittedByUser(sampleUser)
                                .status(DisputeStatus.DRAFT)
                                .build();

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(disputeRepository.findOwnedForUpdate(201L, 10L)).thenReturn(Optional.of(draftDispute));
                when(evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(201L)).thenReturn(new ArrayList<>());
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(List.of(sampleConfirmedIndicator));
                when(disputeRepository.existsBySubmittedByUserIdAndConfirmedIndicatorIdAndStatusIn(eq(10L), eq(50L),
                                any()))
                                .thenReturn(false);
                when(storage.uploadDisputeFile(any(MultipartFile.class)))
                                .thenReturn(new SupabaseStorageService.UploadResult("https://storage/pdf1", "hash1",
                                                "disputes/key1.pdf", "giay_phep_kinh_doanh.pdf"));
                when(evidenceRepository.save(any(DisputeEvidence.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // Act
                DisputeFormResponse response = service.submitDraft(10L, 201L, sampleSubmitRequest,
                                List.of(validPdfFile));

                // Assert
                assertThat(response).isNotNull();
                assertThat(draftDispute.getStatus()).isEqualTo(DisputeStatus.PENDING);
                assertThat(draftDispute.getConfirmedIndicator()).isEqualTo(sampleConfirmedIndicator);
                verify(disputeRepository).flush();
        }

        @Test
        @DisplayName("getDraft: Retrieves existing draft owned by authenticated user")
        void getDraft_OwnedDraft_Success() {
                // Arrange
                Dispute draftDispute = Dispute.builder()
                                .id(201L)
                                .submittedByUser(sampleUser)
                                .status(DisputeStatus.DRAFT)
                                .draftIndicatorType(DisputeIndicatorType.PHONE)
                                .draftIndicatorValue("0912345678")
                                .reason("Nội dung nháp lưu tạm")
                                .build();

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(disputeRepository.findByIdAndSubmittedByUserIdAndStatus(201L, 10L, DisputeStatus.DRAFT))
                                .thenReturn(Optional.of(draftDispute));
                when(evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(201L))
                                .thenReturn(Collections.emptyList());

                // Act
                DisputeFormResponse response = service.getDraft(10L, 201L);

                // Assert
                assertThat(response).isNotNull();
                assertThat(response.id()).isEqualTo(201L);
                assertThat(response.status()).isEqualTo(DisputeStatus.DRAFT);
                assertThat(response.reason()).isEqualTo("Nội dung nháp lưu tạm");
        }

        // =========================================================================
        // 2. EDGE CASES & BOUNDARY VALUES
        // =========================================================================

        @Test
        @DisplayName("submit: Boundary test - Exactly 10 files (maximum allowed limit) succeeds")
        void submit_MaximumBoundary_10Files_Success() {
                // Arrange
                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(List.of(sampleConfirmedIndicator));
                when(disputeRepository.existsBySubmittedByUserIdAndConfirmedIndicatorIdAndStatusIn(any(), any(), any()))
                                .thenReturn(false);
                when(disputeRepository.saveAndFlush(any(Dispute.class))).thenAnswer(invocation -> {
                        Dispute d = invocation.getArgument(0);
                        d.setId(301L);
                        return d;
                });
                when(storage.uploadDisputeFile(any(MultipartFile.class)))
                                .thenReturn(new SupabaseStorageService.UploadResult("https://storage/f", "h", "k",
                                                "file.pdf"));
                when(evidenceRepository.save(any(DisputeEvidence.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                List<MultipartFile> tenFiles = new ArrayList<>();
                for (int i = 1; i <= 10; i++) {
                        tenFiles.add(new MockMultipartFile("files", "file" + i + ".pdf", "application/pdf", PDF_BYTES));
                }

                // Act
                DisputeFormResponse response = service.submit(10L, sampleSubmitRequest, tenFiles);

                // Assert
                assertThat(response).isNotNull();
                assertThat(response.attachments()).hasSize(10);
                verify(storage, times(10)).uploadDisputeFile(any());
                verify(evidenceRepository, times(10)).save(any());
        }

        @Test
        @DisplayName("submit: Boundary test - File at exactly 5MB (maximum allowed size) succeeds")
        void submit_Boundary_FileAtExact5MB_Success() {
                // Arrange
                byte[] fiveMbPdf = new byte[5 * 1024 * 1024];
                System.arraycopy(PDF_BYTES, 0, fiveMbPdf, 0, PDF_BYTES.length);
                MockMultipartFile file5Mb = new MockMultipartFile("files", "large_proof.pdf", "application/pdf",
                                fiveMbPdf);

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(List.of(sampleConfirmedIndicator));
                when(disputeRepository.existsBySubmittedByUserIdAndConfirmedIndicatorIdAndStatusIn(any(), any(), any()))
                                .thenReturn(false);
                when(disputeRepository.saveAndFlush(any(Dispute.class))).thenAnswer(invocation -> {
                        Dispute d = invocation.getArgument(0);
                        d.setId(302L);
                        return d;
                });
                when(storage.uploadDisputeFile(any(MultipartFile.class)))
                                .thenReturn(new SupabaseStorageService.UploadResult("https://storage/5mb", "h5", "k5",
                                                "large_proof.pdf"));
                when(evidenceRepository.save(any(DisputeEvidence.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                // Act
                DisputeFormResponse response = service.submit(10L, sampleSubmitRequest, List.of(file5Mb));

                // Assert
                assertThat(response).isNotNull();
                verify(storage).uploadDisputeFile(file5Mb);
        }

        @Test
        @DisplayName("submit: Normalization - Phone with +84 country code matches local 0 prefix candidate")
        void submit_PhoneCandidateNormalization_MatchesCandidate() {
                // Arrange
                sampleSubmitRequest.setIndicatorValue("+84912345678");

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(eq(List.of("PHONE")), anyCollection()))
                                .thenReturn(List.of(sampleConfirmedIndicator));
                when(disputeRepository.existsBySubmittedByUserIdAndConfirmedIndicatorIdAndStatusIn(any(), any(), any()))
                                .thenReturn(false);
                when(disputeRepository.saveAndFlush(any(Dispute.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));
                when(storage.uploadDisputeFile(any()))
                                .thenReturn(new SupabaseStorageService.UploadResult("u", "h", "k", "f.pdf"));
                when(evidenceRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

                // Act
                DisputeFormResponse response = service.submit(10L, sampleSubmitRequest, List.of(validPdfFile));

                // Assert
                assertThat(response).isNotNull();
                verify(confirmedRepository).findForDispute(eq(List.of("PHONE")),
                                argThat(candidates -> candidates.contains("0912345678")
                                                && candidates.contains("+84912345678")));
        }

        // =========================================================================
        // 3. ERROR CASES & EXCEPTIONS
        // =========================================================================

        @Test
        @DisplayName("submit: Throws UnauthorizedException when userId is null or non-positive")
        void submit_NullUserId_ThrowsUnauthorizedException() {
                // Act & Assert
                assertThatThrownBy(() -> service.submit(null, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(UnauthorizedException.class)
                                .hasMessageContaining("Vui lòng đăng nhập để gửi khiếu nại");

                assertThatThrownBy(() -> service.submit(0L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(UnauthorizedException.class)
                                .hasMessageContaining("Vui lòng đăng nhập để gửi khiếu nại");
        }

        @Test
        @DisplayName("submit: Throws UnauthorizedException when user does not exist in database")
        void submit_UserNotFound_ThrowsUnauthorizedException() {
                // Arrange
                when(userRepository.findById(999L)).thenReturn(Optional.empty());

                // Act & Assert
                assertThatThrownBy(() -> service.submit(999L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(UnauthorizedException.class)
                                .hasMessageContaining("Không tìm thấy tài khoản đang đăng nhập");
        }

        @Test
        @DisplayName("submit: Throws BadRequestException when request object is null")
        void submit_NullRequest_ThrowsBadRequestException() {
                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, null, List.of(validPdfFile)))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Thiếu thông tin hồ sơ");
        }

        @Test
        @DisplayName("submit: Throws BadRequestException when no proof files are provided on submission")
        void submit_ZeroFiles_ThrowsBadRequestException() {
                // Arrange
                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, Collections.emptyList()))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Cần ít nhất một tài liệu xác minh chính chủ");
        }

        @Test
        @DisplayName("submit: Throws BadRequestException when attached files exceed maximum limit of 10")
        void submit_Exceeds10Files_ThrowsBadRequestException() {
                // Arrange
                List<MultipartFile> elevenFiles = new ArrayList<>();
                for (int i = 1; i <= 11; i++) {
                        elevenFiles.add(new MockMultipartFile("files", "file" + i + ".pdf", "application/pdf",
                                        PDF_BYTES));
                }

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, elevenFiles))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Mỗi hồ sơ tối đa 10 tài liệu đính kèm");
        }

        @Test
        @DisplayName("submit: Throws BadRequestException when file size exceeds 5MB limit")
        void submit_FileExceeds5MB_ThrowsBadRequestException() {
                // Arrange
                byte[] oversizedBytes = new byte[5 * 1024 * 1024 + 1];
                System.arraycopy(PDF_BYTES, 0, oversizedBytes, 0, PDF_BYTES.length);
                MockMultipartFile oversizedFile = new MockMultipartFile("files", "large.pdf", "application/pdf",
                                oversizedBytes);

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(oversizedFile)))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Mỗi tài liệu không được vượt quá 5MB");
        }

        @Test
        @DisplayName("submit: Throws BadRequestException when attached file is empty")
        void submit_EmptyFile_ThrowsBadRequestException() {
                // Arrange
                MockMultipartFile emptyFile = new MockMultipartFile("files", "empty.pdf", "application/pdf",
                                new byte[0]);

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(emptyFile)))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Tài liệu đính kèm không được rỗng");
        }

        @Test
        @DisplayName("submit: Throws BadRequestException when file content does not match MIME/signature")
        void submit_MismatchedSignature_ThrowsBadRequestException() {
                // Arrange: Claimed to be PDF but contains plain text without %PDF- magic bytes
                byte[] fakePdfBytes = "Plain text pretending to be PDF".getBytes(StandardCharsets.UTF_8);
                MockMultipartFile fakePdf = new MockMultipartFile("files", "fake.pdf", "application/pdf", fakePdfBytes);

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(fakePdf)))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining(
                                                "Chỉ hỗ trợ PDF, JPG, PNG; phần mở rộng, MIME và nội dung tệp phải khớp");
        }

        @Test
        @DisplayName("submit: Throws ResourceNotFoundException when indicator is not found on blacklist")
        void submit_IndicatorNotFound_ThrowsResourceNotFoundException() {
                // Arrange
                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(Collections.emptyList());

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(ResourceNotFoundException.class)
                                .hasMessageContaining("Không tìm thấy xác thực blacklist cho chỉ số này");
        }

        @Test
        @DisplayName("submit: Throws DisputeConflictException when confirmed indicator has already been RETRACTED")
        void submit_IndicatorAlreadyRetracted_ThrowsDisputeConflictException() {
                // Arrange
                sampleConfirmedIndicator.setStatus("RETRACTED");

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(List.of(sampleConfirmedIndicator));

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(DisputeConflictException.class)
                                .hasMessageContaining(
                                                "Chỉ số này đã được giải tỏa; không cần gửi thêm khiếu nại gỡ nhãn");
        }

        @Test
        @DisplayName("submit: Throws DisputeConflictException when confirmed indicator status is not ACTIVE")
        void submit_IndicatorNotActive_ThrowsDisputeConflictException() {
                // Arrange
                sampleConfirmedIndicator.setStatus("PENDING");

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(List.of(sampleConfirmedIndicator));

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(DisputeConflictException.class)
                                .hasMessageContaining("Xác thực blacklist của chỉ số này không còn hiệu lực");
        }

        @Test
        @DisplayName("submit: Throws DisputeConflictException when user already has an open dispute for this indicator")
        void submit_DuplicateOpenDispute_ThrowsDisputeConflictException() {
                // Arrange
                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(confirmedRepository.findForDispute(any(), any())).thenReturn(List.of(sampleConfirmedIndicator));
                when(disputeRepository.existsBySubmittedByUserIdAndConfirmedIndicatorIdAndStatusIn(eq(10L), eq(50L),
                                any()))
                                .thenReturn(true);

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(DisputeConflictException.class)
                                .hasMessageContaining("Bạn đã có khiếu nại đang xử lý cho chỉ số này");
        }

        @Test
        @DisplayName("submit: Throws BadRequestException when removedEvidenceIds is provided on new submission")
        void submit_RemovedEvidenceOnCreate_ThrowsBadRequestException() {
                // Arrange
                sampleSubmitRequest.setRemovedEvidenceIds(List.of(1L, 2L));
                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Hồ sơ mới chưa có tài liệu để xóa");
        }

        @Test
        @DisplayName("submit: Throws BadRequestException when phone indicator contains invalid characters")
        void submit_InvalidPhoneFormat_ThrowsBadRequestException() {
                // Arrange
                sampleSubmitRequest.setIndicatorValue("0912-invalid-phone");
                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Số điện thoại khiếu nại không hợp lệ");
        }

        @Test
        @DisplayName("submit: Throws BadRequestException when URL indicator is malformed")
        void submit_InvalidUrlFormat_ThrowsBadRequestException() {
                // Arrange
                sampleSubmitRequest.setIndicatorType(DisputeIndicatorType.URL);
                sampleSubmitRequest.setIndicatorValue("ftp://illegal-protocol.com");
                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));

                // Act & Assert
                assertThatThrownBy(() -> service.submit(10L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("Website khiếu nại phải là tên miền hoặc URL HTTP/HTTPS hợp lệ");
        }

        @Test
        @DisplayName("submitDraft: Throws ResourceNotFoundException when draft dispute is not found or not owned")
        void submitDraft_DraftNotFound_ThrowsResourceNotFoundException() {
                // Arrange
                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(disputeRepository.findOwnedForUpdate(999L, 10L)).thenReturn(Optional.empty());

                // Act & Assert
                assertThatThrownBy(() -> service.submitDraft(10L, 999L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(ResourceNotFoundException.class)
                                .hasMessageContaining("Không tìm thấy hồ sơ nháp của bạn");
        }

        @Test
        @DisplayName("submitDraft: Throws DisputeConflictException when target dispute is not in DRAFT status")
        void submitDraft_DisputeAlreadySubmitted_ThrowsDisputeConflictException() {
                // Arrange
                Dispute alreadyPendingDispute = Dispute.builder()
                                .id(202L)
                                .submittedByUser(sampleUser)
                                .status(DisputeStatus.PENDING)
                                .build();

                when(userRepository.findById(10L)).thenReturn(Optional.of(sampleUser));
                when(disputeRepository.findOwnedForUpdate(202L, 10L)).thenReturn(Optional.of(alreadyPendingDispute));

                // Act & Assert
                assertThatThrownBy(() -> service.submitDraft(10L, 202L, sampleSubmitRequest, List.of(validPdfFile)))
                                .isInstanceOf(DisputeConflictException.class)
                                .hasMessageContaining("Hồ sơ đã nộp; không thể chỉnh sửa hoặc gửi lại như bản nháp");
        }
}
