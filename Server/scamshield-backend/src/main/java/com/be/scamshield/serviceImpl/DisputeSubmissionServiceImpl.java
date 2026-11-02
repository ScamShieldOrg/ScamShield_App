package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.SupabaseStorageService;

import com.be.scamshield.constant.EvidenceVerificationStatus;
import com.be.scamshield.constant.DisputeIndicatorType;
import com.be.scamshield.constant.DisputePriority;
import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.SaveDisputeDraftRequest;
import com.be.scamshield.dto.request.SubmitDisputeRequest;
import com.be.scamshield.dto.response.DisputeFormResponse;
import com.be.scamshield.dto.response.DisputeListItemResponse.Attachment;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Dispute;
import com.be.scamshield.entity.DisputeEvidence;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.DisputeConflictException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.repository.ConfirmedIndicatorRepository;
import com.be.scamshield.repository.DisputeEvidenceRepository;
import com.be.scamshield.repository.DisputeRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.service.IDisputeSubmissionService;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DisputeSubmissionServiceImpl implements IDisputeSubmissionService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final int MAX_FILES = 10;
    private static final byte[] PNG_SIGNATURE = {(byte) 137, 80, 78, 71, 13, 10, 26, 10};
    private static final List<DisputeStatus> OPEN_STATUSES = List.of(
            DisputeStatus.PENDING, DisputeStatus.IN_REVIEW, DisputeStatus.NEEDS_MORE_INFO);
    private final DisputeRepository disputeRepository;
    private final DisputeEvidenceRepository evidenceRepository;
    private final ConfirmedIndicatorRepository confirmedRepository;
    private final UserRepository userRepository;
    private final SupabaseStorageService storage;
    private final Validator validator;
    private final Clock clock;

    @Override
    public DisputeFormResponse submit(Long userId, SubmitDisputeRequest request, List<MultipartFile> files) {
        validate(request);
        User owner = requireUser(userId);
        rejectRemovalOnCreate(request.getRemovedEvidenceIds());
        List<ValidatedFile> validated = validateFiles(files);
        requireFileCount(validated.size(), true);
        ConfirmedIndicator confirmed = requireActiveIndicator(request.getIndicatorType(), request.getIndicatorValue());
        requireNoOpenDispute(userId, confirmed.getId());
        LocalDateTime now = now();
        Dispute dispute = newDispute(owner, now);
        applySubmission(dispute, request, confirmed, now);
        disputeRepository.saveAndFlush(dispute);
        List<DisputeEvidence> evidence = new ArrayList<>();
        persistFiles(dispute, evidence, validated, List.of(), now);
        return toResponse(dispute, evidence);
    }

    @Override
    public DisputeFormResponse createDraft(Long userId, SaveDisputeDraftRequest request, List<MultipartFile> files) {
        validate(request);
        User owner = requireUser(userId);
        rejectRemovalOnCreate(request.getRemovedEvidenceIds());
        List<ValidatedFile> validated = validateFiles(files);
        requireFileCount(validated.size(), false);
        LocalDateTime now = now();
        Dispute draft = newDispute(owner, now);
        applyDraft(draft, request);
        disputeRepository.saveAndFlush(draft);
        List<DisputeEvidence> evidence = new ArrayList<>();
        persistFiles(draft, evidence, validated, List.of(), now);
        return toResponse(draft, evidence);
    }

    @Override
    public DisputeFormResponse updateDraft(Long userId, Long draftId, SaveDisputeDraftRequest request, List<MultipartFile> files) {
        validate(request);
        requireUser(userId);
        Dispute draft = requireOwnedDraftForUpdate(userId, draftId);
        List<ValidatedFile> validated = validateFiles(files);
        List<DisputeEvidence> evidence = evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(draftId);
        List<DisputeEvidence> removed = selectRemoved(evidence, request.getRemovedEvidenceIds());
        requireFileCount(evidence.size() - removed.size() + validated.size(), false);
        applyDraft(draft, request);
        persistFiles(draft, evidence, validated, removed, now());
        disputeRepository.flush();
        return toResponse(draft, evidence);
    }

    @Override
    @Transactional(readOnly = true)
    public DisputeFormResponse getDraft(Long userId, Long draftId) {
        requireUser(userId);
        Dispute draft = disputeRepository.findByIdAndSubmittedByUserIdAndStatus(draftId, userId, DisputeStatus.DRAFT)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ nháp của bạn"));
        return toResponse(draft, evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(draftId));
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponse<DisputeFormResponse> getDrafts(Long userId, int page, int size) {
        requireUser(userId);
        if (page < 0 || page > 100000 || size < 1 || size > 50) {
            throw new BadRequestException("Trang phải từ 0 đến 100000; mỗi trang từ 1 đến 50 hồ sơ");
        }
        var drafts = disputeRepository.findBySubmittedByUserIdAndStatus(userId, DisputeStatus.DRAFT,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.desc("id"))));
        Map<Long, List<Attachment>> attachments = new HashMap<>();
        if (!drafts.isEmpty()) {
            for (var file : evidenceRepository.findFilesForDisputes(drafts.stream().map(Dispute::getId).toList())) {
                attachments.computeIfAbsent(file.getDisputeId(), key -> new ArrayList<>()).add(new Attachment(file.getId(),
                        file.getEvidenceType(), file.getFileName(), downloadUrl(file.getFileUrl(), file.getStorageObjectKey()),
                        file.getFileSize(), file.getContentType(), file.getDescription(), EvidenceVerificationStatus.fromStoredValue(file.getVerificationStatus()), file.getCreatedAt()));
            }
        }
        return PaginatedResponse.buildPaginatedResponse(drafts.map(draft -> formResponse(draft,
                attachments.getOrDefault(draft.getId(), List.of()))));
    }

    @Override
    public DisputeFormResponse submitDraft(Long userId, Long draftId, SubmitDisputeRequest request, List<MultipartFile> files) {
        validate(request);
        requireUser(userId);
        Dispute draft = requireOwnedDraftForUpdate(userId, draftId);
        List<ValidatedFile> validated = validateFiles(files);
        List<DisputeEvidence> evidence = evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(draftId);
        List<DisputeEvidence> removed = selectRemoved(evidence, request.getRemovedEvidenceIds());
        requireFileCount(evidence.size() - removed.size() + validated.size(), true);
        ConfirmedIndicator confirmed = requireActiveIndicator(request.getIndicatorType(), request.getIndicatorValue());
        requireNoOpenDispute(userId, confirmed.getId());
        LocalDateTime now = now();
        applySubmission(draft, request, confirmed, now);
        // The submitted list and resolution durations begin when the draft is actually submitted.
        draft.setCreatedAt(now);
        persistFiles(draft, evidence, validated, removed, now);
        disputeRepository.flush();
        return toResponse(draft, evidence);
    }

    private Dispute newDispute(User owner, LocalDateTime now) {
        return Dispute.builder().submittedByUser(owner).submitterName(owner.getFullName()).submitterContact(owner.getEmail())
                .status(DisputeStatus.DRAFT).priority(DisputePriority.NORMAL).createdAt(now).updatedAt(now).build();
    }

    private void applyDraft(Dispute draft, SaveDisputeDraftRequest request) {
        draft.setDraftIndicatorType(request.getIndicatorType());
        draft.setDraftIndicatorValue(trimToNull(request.getIndicatorValue()));
        draft.setLegalRelationship(request.getLegalRelationship());
        draft.setReason(trimToNull(request.getReason()));
        draft.setDeclarationAcceptedAt(null);
        draft.setUpdatedAt(now());
    }

    private void applySubmission(Dispute dispute, SubmitDisputeRequest request, ConfirmedIndicator confirmed, LocalDateTime now) {
        dispute.setConfirmedIndicator(confirmed);
        dispute.setDraftIndicatorType(null);
        dispute.setDraftIndicatorValue(null);
        dispute.setLegalRelationship(request.getLegalRelationship());
        dispute.setReason(request.getReason().trim());
        dispute.setStatus(DisputeStatus.PENDING);
        dispute.setDeclarationAcceptedAt(now);
        dispute.setUpdatedAt(now);
        dispute.setProgressMessage("Đã tiếp nhận hồ sơ khiếu nại, chờ thẩm định.");
    }

    private Dispute requireOwnedDraftForUpdate(Long userId, Long draftId) {
        Dispute draft = disputeRepository.findOwnedForUpdate(draftId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ nháp của bạn"));
        if (draft.getStatus() != DisputeStatus.DRAFT) {
            throw new DisputeConflictException("Hồ sơ đã nộp; không thể chỉnh sửa hoặc gửi lại như bản nháp");
        }
        return draft;
    }

    private ConfirmedIndicator requireActiveIndicator(DisputeIndicatorType type, String value) {
        Collection<String> types = type == DisputeIndicatorType.URL ? List.of("URL", "WEBSITE") : List.of(type.name());
        List<ConfirmedIndicator> matches = confirmedRepository.findForDispute(types, indicatorCandidates(type, value));
        if (matches.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy xác thực blacklist cho chỉ số này");
        }
        String exactValue = value.trim();
        List<ConfirmedIndicator> exactMatches = matches.stream()
                .filter(c -> c.getIndicator().getNormalizedValue().equals(exactValue)).toList();
        if (!exactMatches.isEmpty()) matches = exactMatches;
        if (matches.size() > 1) {
            throw new BadRequestException("Giá trị chỉ số khớp nhiều bản ghi; vui lòng nhập đúng giá trị cần khiếu nại");
        }
        ConfirmedIndicator confirmed = matches.getFirst();
        if ("RETRACTED".equals(confirmed.getStatus())) {
            throw new DisputeConflictException("Chỉ số này đã được giải tỏa; không cần gửi thêm khiếu nại gỡ nhãn");
        }
        if (!"ACTIVE".equals(confirmed.getStatus())) {
            throw new DisputeConflictException("Xác thực blacklist của chỉ số này không còn hiệu lực");
        }
        return confirmed;
    }

    private Collection<String> indicatorCandidates(DisputeIndicatorType type, String value) {
        String input = value.trim();
        Set<String> candidates = new LinkedHashSet<>();
        candidates.add(input);
        candidates.add(input.toLowerCase(Locale.ROOT));
        switch (type) {
            case PHONE -> {
                if (!input.matches("[+0-9\\s().-]+")) throw new BadRequestException("Số điện thoại khiếu nại không hợp lệ");
                String phone = input.replaceAll("[\\s().-]", "");
                if (!phone.matches("\\+?[0-9]{6,15}")) throw new BadRequestException("Số điện thoại phải có từ 6 đến 15 chữ số");
                candidates.add(phone);
                if (phone.startsWith("+84")) candidates.add("0" + phone.substring(3));
                else if (phone.startsWith("0")) candidates.add("+84" + phone.substring(1));
            }
            case URL -> {
                try {
                    URI uri = URI.create(input.contains("://") ? input : "https://" + input);
                    if (uri.getHost() == null || uri.getUserInfo() != null
                            || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
                        throw new IllegalArgumentException();
                    }
                    String hostAndPath = uri.getHost().toLowerCase(Locale.ROOT)
                            + (uri.getPort() < 0 ? "" : ":" + uri.getPort())
                            + (uri.getRawPath() == null ? "" : uri.getRawPath())
                            + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());
                    candidates.add(hostAndPath);
                    candidates.add(uri.getScheme().toLowerCase(Locale.ROOT) + "://" + hostAndPath);
                    if ((uri.getRawPath() == null || uri.getRawPath().isEmpty() || "/".equals(uri.getRawPath()))
                            && uri.getRawQuery() == null && uri.getPort() < 0) candidates.add(uri.getHost().toLowerCase(Locale.ROOT));
                } catch (IllegalArgumentException ex) {
                    throw new BadRequestException("Website khiếu nại phải là tên miền hoặc URL HTTP/HTTPS hợp lệ");
                }
            }
            case BANK_ACCOUNT -> {
                String account = input.replaceAll("\\s+", "");
                if (!account.matches("[A-Za-z0-9_-]{1,64}")) throw new BadRequestException("Số tài khoản khiếu nại không hợp lệ");
                candidates.add(account);
                candidates.add(account.toLowerCase(Locale.ROOT));
                candidates.add(account.toUpperCase(Locale.ROOT));
            }
            case BRANDNAME -> {
                if (!input.matches("[A-Za-z0-9_.-]{1,100}")) throw new BadRequestException("Brandname khiếu nại không hợp lệ");
                candidates.add(input.toUpperCase(Locale.ROOT));
            }
        }
        return candidates;
    }

    private void requireNoOpenDispute(Long userId, Long confirmedId) {
        // The confirmed-indicator row stays locked until commit, serializing concurrent submissions.
        if (disputeRepository.existsBySubmittedByUserIdAndConfirmedIndicatorIdAndStatusIn(userId, confirmedId, OPEN_STATUSES)) {
            throw new DisputeConflictException("Bạn đã có khiếu nại đang xử lý cho chỉ số này");
        }
    }

    private List<ValidatedFile> validateFiles(List<MultipartFile> files) {
        if (files == null) return List.of();
        requireFileCount(files.size(), false);
        List<ValidatedFile> result = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) throw new BadRequestException("Tài liệu đính kèm không được rỗng");
            if (file.getSize() > MAX_FILE_SIZE) throw new BadRequestException("Mỗi tài liệu không được vượt quá 5MB");
            String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().replace('\\', '/');
            name = name.substring(name.lastIndexOf('/') + 1);
            if (name.isBlank() || name.length() > 255 || name.chars().anyMatch(Character::isISOControl)) {
                throw new BadRequestException("Tên tài liệu không hợp lệ hoặc vượt quá 255 ký tự");
            }
            byte[] bytes;
            try (var stream = file.getInputStream()) {
                bytes = stream.readNBytes((int) MAX_FILE_SIZE + 1);
            } catch (IOException ex) {
                throw new BadRequestException("Không thể đọc tài liệu; vui lòng gửi lại");
            }
            if (bytes.length == 0 || bytes.length > MAX_FILE_SIZE) throw new BadRequestException("Tài liệu phải có dung lượng từ 1 byte đến 5MB");
            String contentType = detectType(bytes);
            String extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
            boolean extensionMatches = switch (contentType) {
                case "application/pdf" -> extension.equals("pdf");
                case "image/jpeg" -> extension.equals("jpg") || extension.equals("jpeg");
                case "image/png" -> extension.equals("png");
                default -> false;
            };
            if (!extensionMatches || !contentType.equalsIgnoreCase(file.getContentType())) {
                throw new BadRequestException("Chỉ hỗ trợ PDF, JPG, PNG; phần mở rộng, MIME và nội dung tệp phải khớp");
            }
            result.add(new ValidatedFile(file, name, contentType, bytes.length));
        }
        return result;
    }

    private String detectType(byte[] content) {
        if (content.length >= 5 && new String(content, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-")) return "application/pdf";
        if (content.length >= PNG_SIGNATURE.length && Arrays.equals(PNG_SIGNATURE, Arrays.copyOf(content, PNG_SIGNATURE.length))) return "image/png";
        if (content.length >= 3 && content[0] == (byte) 255 && content[1] == (byte) 216 && content[2] == (byte) 255) return "image/jpeg";
        return "unsupported";
    }

    private List<DisputeEvidence> selectRemoved(List<DisputeEvidence> evidence, List<Long> ids) {
        if (ids == null || ids.isEmpty()) return List.of();
        Set<Long> selected = new LinkedHashSet<>(ids);
        List<DisputeEvidence> removed = evidence.stream().filter(e -> selected.contains(e.getId())).toList();
        if (removed.size() != selected.size()) throw new BadRequestException("Tệp yêu cầu xóa không thuộc hồ sơ nháp này");
        return removed;
    }

    private void persistFiles(Dispute dispute, List<DisputeEvidence> evidence, List<ValidatedFile> files,
                              List<DisputeEvidence> removed, LocalDateTime now) {
        List<String> uploadedKeys = new ArrayList<>();
        List<String> removedKeys = removed.stream().map(DisputeEvidence::getStorageObjectKey).filter(k -> k != null && !k.isBlank()).toList();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                List<String> toDelete = status == STATUS_COMMITTED ? removedKeys : uploadedKeys;
                for (String key : toDelete) {
                    try {
                        storage.deleteDisputeFile(key);
                    } catch (RuntimeException ex) {
                        log.warn("Không thể dọn tài liệu khiếu nại sau transaction", ex);
                    }
                }
            }
        });
        evidenceRepository.deleteAll(removed);
        evidence.removeAll(removed);
        for (ValidatedFile file : files) {
            var uploaded = storage.uploadDisputeFile(file.file());
            uploadedKeys.add(uploaded.objectKey());
            DisputeEvidence attachment = DisputeEvidence.builder().dispute(dispute)
                    .evidenceType("application/pdf".equals(file.contentType()) ? "DOCUMENT" : "IMAGE")
                    .fileName(file.name()).fileUrl(uploaded.fileUrl()).fileHash(uploaded.fileHash())
                    .storageObjectKey(uploaded.objectKey()).fileSize(file.size()).contentType(file.contentType())
                    .verificationStatus(EvidenceVerificationStatus.PENDING.name()).createdAt(now).build();
            evidence.add(evidenceRepository.save(attachment));
        }
        evidenceRepository.flush();
    }

    private DisputeFormResponse toResponse(Dispute dispute, List<DisputeEvidence> evidence) {
        List<Attachment> attachments = evidence.stream().map(e -> new Attachment(e.getId(), e.getEvidenceType(), e.getFileName(),
                downloadUrl(e.getFileUrl(), e.getStorageObjectKey()), e.getFileSize(), e.getContentType(), e.getDescription(),
                EvidenceVerificationStatus.fromStoredValue(e.getVerificationStatus()), e.getCreatedAt())).toList();
        return formResponse(dispute, attachments);
    }

    private DisputeFormResponse formResponse(Dispute dispute, List<Attachment> attachments) {
        DisputeIndicatorType type = dispute.getDraftIndicatorType();
        String value = dispute.getDraftIndicatorValue();
        if (dispute.getConfirmedIndicator() != null) {
            var indicator = dispute.getConfirmedIndicator().getIndicator();
            type = "WEBSITE".equals(indicator.getType()) ? DisputeIndicatorType.URL : DisputeIndicatorType.valueOf(indicator.getType());
            value = indicator.getNormalizedValue();
        }
        return new DisputeFormResponse(dispute.getId(), "DSP-" + dispute.getId(), dispute.getStatus(), type, value,
                dispute.getLegalRelationship(), dispute.getReason(), dispute.getDeclarationAcceptedAt(),
                dispute.getCreatedAt(), dispute.getUpdatedAt(), List.copyOf(attachments));
    }

    private String downloadUrl(String url, String key) {
        return key == null || key.isBlank() ? url : storage.createDisputeDownloadUrl(key);
    }

    private void requireFileCount(int count, boolean submitted) {
        if (count > MAX_FILES) throw new BadRequestException("Mỗi hồ sơ tối đa 10 tài liệu đính kèm");
        if (submitted && count == 0) throw new BadRequestException("Cần ít nhất một tài liệu xác minh chính chủ");
    }

    private void rejectRemovalOnCreate(List<Long> ids) {
        if (ids != null && !ids.isEmpty()) throw new BadRequestException("Hồ sơ mới chưa có tài liệu để xóa");
    }

    private User requireUser(Long userId) {
        if (userId == null || userId <= 0) throw new UnauthorizedException("Vui lòng đăng nhập để gửi khiếu nại");
        return userRepository.findById(userId).orElseThrow(() -> new UnauthorizedException("Không tìm thấy tài khoản đang đăng nhập"));
    }

    private <T> void validate(T request) {
        if (request == null) throw new BadRequestException("Thiếu thông tin hồ sơ");
        var violations = validator.validate(request);
        if (!violations.isEmpty()) throw new ConstraintViolationException(violations);
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock.withZone(VIETNAM));
    }

    private record ValidatedFile(MultipartFile file, String name, String contentType, long size) {
    }
}
