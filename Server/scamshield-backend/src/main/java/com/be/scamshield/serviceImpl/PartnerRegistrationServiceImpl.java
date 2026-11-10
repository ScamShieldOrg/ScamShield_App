package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.RoleEnum;
import com.be.scamshield.constant.UserStatus;
import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.request.PartnerRegistrationPrecheckRequest;
import com.be.scamshield.dto.request.PartnerDocumentUploadRequest;
import com.be.scamshield.dto.response.PartnerRegistrationResponse;
import com.be.scamshield.dto.response.PartnerRegistrationPrecheckResponse;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.RegistrationConflictException;
import com.be.scamshield.exception.PartnerBusinessVerificationException;
import com.be.scamshield.external.PartnerDocumentStorageService;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.Outcome;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.RoleRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.service.IPartnerRegistrationService;
import com.be.scamshield.util.VietnamPhoneNumbers;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.IDN;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.Clock;
import java.util.*;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
public class PartnerRegistrationServiceImpl implements IPartnerRegistrationService {
    private static final long MAX_FILE_SIZE = 25L * 1024 * 1024;
    private static final long MAX_TOTAL_SIZE = 75L * 1024 * 1024;
    private static final int MAX_FILES = 10;
    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};

    private final Clock applicationClock;
    private final PartnerProfileRepository profileRepository;
    private final PartnerDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final ContactVerificationService contactVerificationService;
    private final PartnerBusinessVerificationService businessVerificationService;
    private final TransactionTemplate transactionTemplate;
    private final ObjectMapper objectMapper;
    private final PartnerRegistrationDraftStore draftStore;
    private final PartnerDocumentStorageService documentStorage;

    @Override
    public PartnerRegistrationPrecheckResponse precheck(PartnerRegistrationPrecheckRequest precheckRequest) {
        RegisterPartnerRequest request = precheckRequest.registration();
        if (!request.isAgreeTerms()) {
            throw new BadRequestException("Bạn phải cam kết thông tin chính xác và thuộc quyền sở hữu hợp pháp");
        }
        String taxCode = request.getTaxCode().replace("-", "");
        if (profileRepository.existsByTaxCode(taxCode)) throw duplicateRegistration();
        normalizeSingleValue(request.getOfficialDomains(), this::normalizeDomain);
        normalizeSingleValue(request.getOfficialHotlines(), value -> normalizePhone(value, 6));
        normalizeSingleValue(request.getSmsBrandNames(), this::normalizeBrandName);
        String email = contactVerificationService.normalizeEmail(request.getCorporateEmail());
        String phone = VietnamPhoneNumbers.nationalMobile(request.getContactPhone());
        contactVerificationService.validateForRegistration(request.getVerificationToken(), phone);
        if (userRepository.existsByEmailIgnoreCase(email) || userRepository.findByPhoneNumber(phone).isPresent()) {
            throw new RegistrationConflictException("Email hoặc số điện thoại đã được dùng cho một tài khoản");
        }
        List<PartnerDocumentUploadRequest> manifest = validateManifest(precheckRequest.documents());
        var verification = businessVerificationService.precheck(request.getLegalName().trim(), taxCode);
        if (verification.outcome() != Outcome.MATCHED) throw new PartnerBusinessVerificationException(verification);

        String draftToken = UUID.randomUUID().toString();
        List<PartnerRegistrationPrecheckResponse.Upload> uploads = new ArrayList<>();
        for (int i = 0; i < manifest.size(); i++) {
            var file = manifest.get(i);
            var target = documentStorage.createUploadTarget(draftToken, file.fileName(), file.contentType());
            uploads.add(new PartnerRegistrationPrecheckResponse.Upload(i, target.uploadUrl(),
                    target.objectKey(), target.expiresInSeconds()));
        }
        LocalDateTime expiresAt = draftStore.save(draftToken, request, request.getVerificationToken(),
                manifest, verification, uploads);
        return new PartnerRegistrationPrecheckResponse(draftToken, expiresAt, verification, uploads);
    }

    @Override
    public PartnerRegistrationResponse finalizeRegistration(String draftToken) {
        PartnerRegistrationDraftStore.Draft draft = draftStore.find(draftToken)
                .orElseThrow(() -> new BadRequestException("Phiên tải tài liệu không hợp lệ hoặc đã hết hạn; vui lòng đăng ký lại"));
        if (!draftStore.claim(draftToken)) {
            throw new BadRequestException("Yêu cầu hoàn tất đăng ký này đang được xử lý");
        }
        try {
            return completeRegistration(draftToken, draft);
        } finally {
            draftStore.releaseClaim(draftToken);
        }
    }

    private PartnerRegistrationResponse completeRegistration(String draftToken,
                                                               PartnerRegistrationDraftStore.Draft draft) {
        RegisterPartnerRequest request = draft.registration();
        request.setVerificationToken(draft.verificationToken());
        String phone = VietnamPhoneNumbers.nationalMobile(request.getContactPhone());
        String email = contactVerificationService.normalizeEmail(request.getCorporateEmail());
        String taxCode = request.getTaxCode().replace("-", "");
        contactVerificationService.validateForRegistration(draft.verificationToken(), phone);
        if (profileRepository.existsByTaxCode(taxCode)) throw duplicateRegistration();
        if (userRepository.existsByEmailIgnoreCase(email) || userRepository.findByPhoneNumber(phone).isPresent()) {
            throw new RegistrationConflictException("Email hoặc số điện thoại đã được dùng cho một tài khoản");
        }

        LocalDateTime now = LocalDateTime.now(applicationClock);
        PartnerProfile profile = createProfile(request, taxCode, email, phone, now);
        List<PartnerDocument> documents = new ArrayList<>();
        List<String> pendingKeys = new ArrayList<>();
        List<String> promotedKeys = new ArrayList<>();
        try {
            for (int i = 0; i < draft.documents().size(); i++) {
                var metadata = draft.documents().get(i);
                var upload = draft.uploads().get(i);
                byte[] content = documentStorage.readUploadedDocument(upload.objectKey(),
                        metadata.fileSize(), metadata.contentType());
                validateDocumentBytes(metadata, content);
                pendingKeys.add(upload.objectKey());
                documents.add(PartnerDocument.builder().partner(profile).documentType(metadata.documentType())
                        .fileName(metadata.fileName()).contentType(metadata.contentType())
                        .fileSize(metadata.fileSize()).content(content).storageObjectKey(upload.objectKey())
                        .createdAt(now).build());
            }
            var verification = businessVerificationService.verifyDocuments(profile.getLegalName(), taxCode,
                    documents, draft.businessVerification());
            if (verification.outcome() != Outcome.MATCHED) throw new PartnerBusinessVerificationException(verification);
            profile.setBusinessVerificationResult(objectMapper.writeValueAsString(verification));
            documents.forEach(document -> document.setContent(null));
            Role partnerRole = roleRepository.findByName(RoleEnum.BUSINESS_PARTNER.name())
                    .orElseThrow(() -> new IllegalStateException("Chưa cấu hình role BUSINESS_PARTNER"));
            String passwordHash = passwordEncoder.encode(UUID.randomUUID().toString());
            PartnerRegistrationResponse response = transactionTemplate.execute(status ->
                    persistRegistration(request, profile, documents, partnerRole, passwordHash, verification, promotedKeys));
            draftStore.delete(draftToken);
            pendingKeys.forEach(documentStorage::deletePending);
            return response;
        } catch (RuntimeException ex) {
            promotedKeys.forEach(key -> safelyDeleteDocument(key));
            pendingKeys.forEach(key -> safelyDeletePending(key));
            draftStore.delete(draftToken);
            throw ex;
        } catch (Exception ex) {
            promotedKeys.forEach(key -> safelyDeleteDocument(key));
            pendingKeys.forEach(key -> safelyDeletePending(key));
            draftStore.delete(draftToken);
            throw new IllegalStateException("Không thể hoàn tất hồ sơ đối tác", ex);
        }
    }

    private List<PartnerDocumentUploadRequest> validateManifest(List<PartnerDocumentUploadRequest> requested) {
        if (requested == null || requested.isEmpty() || requested.size() > MAX_FILES) {
            throw new BadRequestException("Cần từ 1 đến 10 tài liệu cho hồ sơ");
        }
        long total = 0;
        boolean hasLicense = false;
        boolean hasOwnership = false;
        List<PartnerDocumentUploadRequest> result = new ArrayList<>();
        for (var file : requested) {
            String name = file.fileName().replace('\\', '/');
            name = name.substring(name.lastIndexOf('/') + 1);
            String type = file.documentType();
            if (!Set.of("BUSINESS_LICENSE", "OWNERSHIP_PROOF", "AUTHORIZATION").contains(type)
                    || name.isBlank() || name.length() > 255 || name.chars().anyMatch(Character::isISOControl)
                    || file.fileSize() <= 0 || file.fileSize() > MAX_FILE_SIZE
                    || !Set.of("application/pdf", "image/jpeg", "image/png").contains(file.contentType())) {
                throw new BadRequestException("Thông tin hoặc định dạng tài liệu không hợp lệ");
            }
            String extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
            boolean validExtension = switch (file.contentType()) {
                case "application/pdf" -> extension.equals("pdf");
                case "image/jpeg" -> extension.equals("jpg") || extension.equals("jpeg");
                case "image/png" -> extension.equals("png");
                default -> false;
            };
            if (!validExtension || ("BUSINESS_LICENSE".equals(type) && !"application/pdf".equals(file.contentType()))) {
                throw new BadRequestException("Giấy phép kinh doanh phải là PDF; tài liệu khác hỗ trợ PDF, JPG, PNG");
            }
            hasLicense |= "BUSINESS_LICENSE".equals(type);
            hasOwnership |= "OWNERSHIP_PROOF".equals(type);
            total += file.fileSize();
            result.add(new PartnerDocumentUploadRequest(type, name, file.contentType(), file.fileSize()));
        }
        if (!hasLicense || !hasOwnership || total > MAX_TOTAL_SIZE) {
            throw new BadRequestException("Cần giấy phép kinh doanh và tài liệu chứng minh quyền sở hữu; tổng dung lượng tối đa 75MB");
        }
        return result;
    }

    private void validateDocumentBytes(PartnerDocumentUploadRequest metadata, byte[] content) {
        String detected = detectContentType(content);
        if (!detected.equals(metadata.contentType())) {
            throw new BadRequestException("Chữ ký nội dung file không khớp MIME đã khai báo");
        }
    }

    private PartnerProfile createProfile(RegisterPartnerRequest request, String taxCode, String email,
                                         String phone, LocalDateTime now) {
        return PartnerProfile.builder().legalName(request.getLegalName().trim())
                .brandName(request.getLegalName().trim()).taxCode(taxCode).corporateEmail(email)
                .representativeNameAndTitle(request.getRepresentativeNameAndTitle().trim())
                .contactPhone(phone).verificationStatus(PartnerVerificationStatus.PENDING)
                .createdAt(now).updatedAt(now)
                .officialDomain(normalizeSingleValue(request.getOfficialDomains(), this::normalizeDomain))
                .officialHotline(normalizeSingleValue(request.getOfficialHotlines(), value -> normalizePhone(value, 6)))
                .smsBrandName(normalizeSingleValue(request.getSmsBrandNames(), this::normalizeBrandName)).build();
    }

    private void safelyDeletePending(String key) {
        try { documentStorage.deletePending(key); } catch (RuntimeException ignored) { }
    }

    private void safelyDeleteDocument(String key) {
        try { documentStorage.deleteDocument(key); } catch (RuntimeException ignored) { }
    }

    @Override
    public PartnerRegistrationResponse register(RegisterPartnerRequest request,
                                                List<MultipartFile> businessLicenseFiles,
                                                List<MultipartFile> ownershipProofFiles,
                                                List<MultipartFile> authorizationFiles) {
        if (!request.isAgreeTerms()) {
            throw new BadRequestException("Bạn phải cam kết thông tin chính xác và thuộc quyền sở hữu hợp pháp");
        }

        String taxCode = request.getTaxCode().replace("-", "");
        if (profileRepository.existsByTaxCode(taxCode)) {
            throw duplicateRegistration();
        }

        String domain = normalizeSingleValue(request.getOfficialDomains(), this::normalizeDomain);
        String hotline = normalizeSingleValue(request.getOfficialHotlines(), value -> normalizePhone(value, 6));
        String smsBrandName = normalizeSingleValue(request.getSmsBrandNames(), this::normalizeBrandName);
        String email = contactVerificationService.normalizeEmail(request.getCorporateEmail());

        requireFiles(businessLicenseFiles, "Cần giấy phép đăng ký kinh doanh / giấy phép hoạt động");
        requireFiles(ownershipProofFiles, "Cần tài liệu chứng minh quyền sở hữu domain / hotline / SMS Brandname");
        List<MultipartFile> allFiles = new ArrayList<>();
        allFiles.addAll(businessLicenseFiles);
        allFiles.addAll(ownershipProofFiles);
        if (authorizationFiles != null) {
            allFiles.addAll(authorizationFiles);
        }
        if (allFiles.size() > MAX_FILES) {
            throw new BadRequestException("Tối đa 10 tệp cho một hồ sơ");
        }
        long totalSize = 0;
        for (MultipartFile file : allFiles) {
            if (file == null || file.isEmpty() || file.getSize() > MAX_FILE_SIZE) {
                throw new BadRequestException("Tệp tài liệu phải có nội dung và không vượt quá 25MB/tệp");
            }
            totalSize += file.getSize();
        }
        if (totalSize > MAX_TOTAL_SIZE) {
            throw new BadRequestException("Tổng dung lượng tài liệu không vượt quá 75MB");
        }

        LocalDateTime now = LocalDateTime.now(applicationClock);
        PartnerProfile profile = PartnerProfile.builder()
                .legalName(request.getLegalName().trim())
                .brandName(request.getLegalName().trim())
                .taxCode(taxCode)
                .corporateEmail(email)
                .representativeNameAndTitle(request.getRepresentativeNameAndTitle().trim())
                .contactPhone(VietnamPhoneNumbers.nationalMobile(request.getContactPhone()))
                .verificationStatus(PartnerVerificationStatus.PENDING)
                .createdAt(now)
                .updatedAt(now)
                .officialDomain(domain)
                .officialHotline(hotline)
                .smsBrandName(smsBrandName)
                .build();

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new RegistrationConflictException("Email đã được dùng cho một tài khoản");
        }
        if (userRepository.findByPhoneNumber(profile.getContactPhone()).isPresent()) {
            throw new RegistrationConflictException("Số điện thoại liên hệ đã được dùng cho một tài khoản");
        }

        // Validate and read all evidence before the first database write.
        List<PartnerDocument> documents = new ArrayList<>();
        addDocuments(documents, businessLicenseFiles, "BUSINESS_LICENSE", profile, now);
        addDocuments(documents, ownershipProofFiles, "OWNERSHIP_PROOF", profile, now);
        addDocuments(documents, authorizationFiles, "AUTHORIZATION", profile, now);
        if (documents.stream().filter(document -> "BUSINESS_LICENSE".equals(document.getDocumentType()))
                .anyMatch(document -> !"application/pdf".equals(document.getContentType()))) {
            throw new BadRequestException("Giấy phép đăng ký kinh doanh phải là PDF; tài liệu khác vẫn hỗ trợ PDF, JPG, PNG");
        }
        contactVerificationService.validateForRegistration(request.getVerificationToken(), profile.getContactPhone());
        Role partnerRole = roleRepository.findByName(RoleEnum.BUSINESS_PARTNER.name())
                .orElseThrow(() -> new IllegalStateException("Chưa cấu hình role BUSINESS_PARTNER"));
        // External calls run before the write transaction and before consuming the phone token.
        PartnerBusinessVerificationResponse businessVerification = businessVerificationService.verify(
                profile.getLegalName(), taxCode, documents);
        if (businessVerification.outcome() != Outcome.MATCHED) {
            throw new PartnerBusinessVerificationException(businessVerification);
        }
        profile.setBusinessVerificationResult(objectMapper.writeValueAsString(businessVerification));
        String passwordHash = passwordEncoder.encode(UUID.randomUUID().toString());
        List<String> pendingKeys = new ArrayList<>();
        List<String> promotedKeys = new ArrayList<>();
        try {
            for (PartnerDocument document : documents) {
                String key = documentStorage.uploadPendingBytes(UUID.randomUUID().toString(), document.getFileName(),
                        document.getContentType(), document.getContent());
                pendingKeys.add(key);
                document.setStorageObjectKey(key);
                document.setContent(null);
            }
            PartnerRegistrationResponse response = transactionTemplate.execute(status ->
                    persistRegistration(request, profile, documents, partnerRole, passwordHash,
                            businessVerification, promotedKeys));
            pendingKeys.forEach(this::safelyDeletePending);
            return response;
        } catch (RuntimeException ex) {
            promotedKeys.forEach(this::safelyDeleteDocument);
            pendingKeys.forEach(this::safelyDeletePending);
            throw ex;
        }
    }

    private PartnerRegistrationResponse persistRegistration(RegisterPartnerRequest request, PartnerProfile profile,
                                                            List<PartnerDocument> documents, Role partnerRole,
                                                            String passwordHash, PartnerBusinessVerificationResponse businessVerification) {
        return persistRegistration(request, profile, documents, partnerRole, passwordHash, businessVerification,
                new ArrayList<>());
    }

    private PartnerRegistrationResponse persistRegistration(RegisterPartnerRequest request, PartnerProfile profile,
                                                            List<PartnerDocument> documents, Role partnerRole,
                                                            String passwordHash, PartnerBusinessVerificationResponse businessVerification,
                                                            List<String> promotedKeys) {
        LocalDateTime now = LocalDateTime.now(applicationClock);
        contactVerificationService.consume(request.getVerificationToken(), profile.getContactPhone());
        User user = User.builder()
                .fullName(profile.getRepresentativeNameAndTitle())
                .email(profile.getCorporateEmail())
                .phoneNumber(profile.getContactPhone())
                .isPhoneVerified(true)
                .role(partnerRole)
                .status(UserStatus.INACTIVE.name())
                .reputationPoints(0)
                .createdAt(now)
                .updatedAt(now)
                .passwordHash(passwordHash)
                .build();
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            if (isUniqueViolation(ex)) {
                throw new RegistrationConflictException("Email hoặc số điện thoại đã được dùng cho một tài khoản");
            }
            throw ex;
        }
        profile.setUser(user);
        try {
            profileRepository.saveAndFlush(profile);
        } catch (DataIntegrityViolationException ex) {
            // The unique tax code also protects against simultaneous submissions.
            if (isUniqueViolation(ex)) {
                throw duplicateRegistration();
            }
            throw ex;
        }
        for (PartnerDocument document : documents) {
            if (document.getStorageObjectKey() != null) {
                String permanentKey = documentStorage.promotePending(document.getStorageObjectKey(), profile.getId());
                promotedKeys.add(permanentKey);
                document.setStorageObjectKey(permanentKey);
            }
        }
        documentRepository.saveAll(documents);
        return new PartnerRegistrationResponse(profile.getId(), user.getId(), profile.getVerificationStatus(), now, businessVerification);
    }

    private boolean isUniqueViolation(DataIntegrityViolationException ex) {
        return ex.getMostSpecificCause() instanceof SQLException sql && "23505".equals(sql.getSQLState());
    }

    private RegistrationConflictException duplicateRegistration() {
        return new RegistrationConflictException("Mã số thuế / mã số doanh nghiệp đã có hồ sơ đăng ký");
    }

    private String normalizeSingleValue(String values, Function<String, String> normalizer) {
        if (values == null ) {
            throw new BadRequestException("Mỗi hồ sơ chỉ được đăng ký một tên miền, một hotline và một SMS Brandname");
        }
        return normalizer.apply(values);
    }

    private String normalizeDomain(String value) {
        String domain;
        try {
            domain = IDN.toASCII(value.trim(), IDN.USE_STD3_ASCII_RULES).toLowerCase(Locale.ROOT);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Tên miền không đúng định dạng; chỉ nhập hostname, không nhập URL");
        }
        if (domain.length() > 253 || !domain.matches("^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$")) {
            throw new BadRequestException("Tên miền không đúng định dạng; ví dụ: example.com.vn");
        }
        return domain;
    }

    private String normalizePhone(String value, int minDigits) {
        String phone = value.trim().replaceAll("[\\s().-]", "");
        if (!phone.matches("^\\+?[0-9]{" + minDigits + ",15}$")) {
            throw new BadRequestException("Số điện thoại / hotline không đúng định dạng");
        }
        if (phone.startsWith("+84")) {
            phone = "0" + phone.substring(3);
        }
        if (!phone.matches("^\\+?[0-9]{" + minDigits + ",15}$")) {
            throw new BadRequestException("Số điện thoại / hotline sau chuẩn hóa không đúng định dạng");
        }
        return phone;
    }

    private String normalizeBrandName(String value) {
        String brand = value.trim().toUpperCase(Locale.ROOT);
        if (brand.length() > 100 || !brand.matches("^[A-Z0-9][A-Z0-9 _-]*$")) {
            throw new BadRequestException("SMS Brandname chỉ gồm chữ cái Latin, số, khoảng trắng, dấu gạch nối hoặc gạch dưới");
        }
        return brand;
    }

    private void requireFiles(List<MultipartFile> files, String message) {
        if (files == null || files.isEmpty()) {
            throw new BadRequestException(message);
        }
    }

    private void addDocuments(List<PartnerDocument> documents, List<MultipartFile> files,
                              String type, PartnerProfile profile, LocalDateTime now) {
        if (files == null) {
            return;
        }
        for (MultipartFile file : files) {
            byte[] content;
            try {
                content = file.getBytes();
            } catch (IOException ex) {
                throw new BadRequestException("Không thể đọc tệp tài liệu; vui lòng gửi lại");
            }
            String name = file.getOriginalFilename();
            name = name == null ? "" : name.replace('\\', '/');
            name = name.substring(name.lastIndexOf('/') + 1);
            if (name.isBlank() || name.length() > 255 || name.chars().anyMatch(Character::isISOControl)) {
                throw new BadRequestException("Tên tệp không hợp lệ hoặc vượt quá 255 ký tự");
            }
            String extension = name.substring(name.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
            String contentType = detectContentType(content);
            boolean validExtension = switch (contentType) {
                case "application/pdf" -> extension.equals("pdf");
                case "image/jpeg" -> extension.equals("jpg") || extension.equals("jpeg");
                case "image/png" -> extension.equals("png");
                default -> false;
            };
            if (!validExtension || !contentType.equalsIgnoreCase(file.getContentType())) {
                throw new BadRequestException("Chỉ hỗ trợ PDF, JPG, PNG; phần mở rộng, MIME và chữ ký tệp phải khớp");
            }
            documents.add(PartnerDocument.builder()
                    .partner(profile).documentType(type).fileName(name)
                    .contentType(contentType).fileSize((long) content.length).content(content).createdAt(now).build());
        }
    }

    private String detectContentType(byte[] content) {
        if (content.length >= 5 && new String(content, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-")) {
            return "application/pdf";
        }
        if (content.length >= PNG_SIGNATURE.length && Arrays.equals(PNG_SIGNATURE, Arrays.copyOf(content, PNG_SIGNATURE.length))) {
            return "image/png";
        }
        if (content.length >= 3 && content[0] == (byte) 0xff && content[1] == (byte) 0xd8 && content[2] == (byte) 0xff) {
            return "image/jpeg";
        }
        return "unsupported";
    }
}
