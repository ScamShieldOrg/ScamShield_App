package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.RoleEnum;
import com.be.scamshield.constant.UserStatus;
import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.response.PartnerRegistrationResponse;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.RegistrationConflictException;
import com.be.scamshield.exception.PartnerBusinessVerificationException;
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

    @Override
    public PartnerRegistrationResponse register(RegisterPartnerRequest request,
                                                List<MultipartFile> businessLicenseFiles,
                                                List<MultipartFile> ownershipProofFiles,
                                                List<MultipartFile> authorizationFiles) {
        if (!request.isAgreeTerms()) {
            throw new BadRequestException("Bạn phải cam kết thông tin chính xác và thuộc quyền sở hữu hợp pháp");
        }
        if (request.getLegalRepresentative() == null) {
            throw new BadRequestException("Cần xác định người đăng ký có phải đại diện pháp luật không");
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
        if (!request.getLegalRepresentative()) {
            requireFiles(authorizationFiles, "Người đăng ký không phải đại diện pháp luật phải cung cấp giấy ủy quyền");
        }
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
                .partnerType("BUSINESS")
                .taxCode(taxCode)
                .corporateEmail(email)
                .representativeNameAndTitle(request.getRepresentativeNameAndTitle().trim())
                .contactPhone(VietnamPhoneNumbers.nationalMobile(request.getContactPhone()))
                .legalRepresentative(request.getLegalRepresentative())
                .termsAcceptedAt(now)
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
        return transactionTemplate.execute(status -> persistRegistration(request, profile, documents,
                partnerRole, passwordHash, businessVerification));
    }

    private PartnerRegistrationResponse persistRegistration(RegisterPartnerRequest request, PartnerProfile profile,
                                                            List<PartnerDocument> documents, Role partnerRole,
                                                            String passwordHash, PartnerBusinessVerificationResponse businessVerification) {
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
