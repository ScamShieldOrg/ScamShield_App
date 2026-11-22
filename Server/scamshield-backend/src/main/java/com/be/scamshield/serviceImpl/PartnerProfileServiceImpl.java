package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.dto.partner.PartnerProfileResponse;
import com.be.scamshield.dto.partner.UpdatePartnerProfileRequest;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.RegistrationConflictException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IPartnerProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PartnerProfileServiceImpl implements IPartnerProfileService {
    private final PartnerProfileRepository profiles;
    private final UserRepository users;
    private final JwtTokenProvider tokens;
    private final PasswordEncoder passwordEncoder;
    private final Clock applicationClock;

    @Override
    @Transactional(readOnly = true)
    public PartnerProfileResponse getOwnProfile(UserPrincipal principal) {
        return toResponse(findOwnProfile(principal), null);
    }

    @Override
    @Transactional
    public PartnerProfileResponse updateOwnProfile(UserPrincipal principal, UpdatePartnerProfileRequest request) {
        PartnerProfile profile = findEditableProfile(principal);
        if (request.representativeNameAndTitle() == null && request.corporateEmail() == null) {
            throw new BadRequestException("Cần cung cấp thông tin cần cập nhật.");
        }

        String accessToken = null;
        if (request.corporateEmail() != null && (!request.corporateEmail().equalsIgnoreCase(profile.getCorporateEmail())
                || !request.corporateEmail().equals(profile.getUser().getEmail()))) {
            verifyCurrentPassword(profile, request.currentPassword());
            var account = profile.getUser();
            String email = request.corporateEmail();
            if (!email.equalsIgnoreCase(account.getEmail()) && users.existsByEmailIgnoreCase(email)) {
                throw new RegistrationConflictException("Email này đã được sử dụng cho một tài khoản khác.");
            }
            account.setEmail(email);
            try {
                users.flush();
            } catch (DataIntegrityViolationException ex) {
                throw new RegistrationConflictException("Email này đã được sử dụng cho một tài khoản khác.");
            }
            profile.setCorporateEmail(request.corporateEmail());
            accessToken = tokens.generateAccessTokenForUser(account.getId(), account.getUsername(), email, principal.getRole());
        }
        if (request.representativeNameAndTitle() != null) {
            profile.setRepresentativeNameAndTitle(request.representativeNameAndTitle());
        }
        profile.setUpdatedAt(LocalDateTime.now(applicationClock));
        return toResponse(profile, accessToken);
    }

    private void verifyCurrentPassword(PartnerProfile profile, String currentPassword) {
        if (currentPassword == null || currentPassword.isBlank()) {
            throw new BadRequestException("Nhập mật khẩu hiện tại để cập nhật email đăng nhập.");
        }
        if (!passwordEncoder.matches(currentPassword, profile.getUser().getPasswordHash())) {
            throw new BadRequestException("Mật khẩu hiện tại không chính xác.");
        }
    }

    private PartnerProfile findEditableProfile(UserPrincipal principal) {
        PartnerProfile profile = findOwnProfile(principal);
        if (profile.getVerificationStatus() != PartnerVerificationStatus.VERIFIED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chỉ hồ sơ đối tác đã xác thực mới có thể chỉnh sửa.");
        }

        return profile;
    }

    private PartnerProfile findOwnProfile(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để xem hồ sơ đối tác.");
        }
        return profiles.findByUserId(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đối tác của tài khoản này."));
    }

    private PartnerProfileResponse toResponse(PartnerProfile profile, String accessToken) {
        return new PartnerProfileResponse(
                profile.getLegalName(), profile.getBrandName(), profile.getTaxCode(),
                profile.getCorporateEmail(), profile.getContactPhone(), profile.getRepresentativeNameAndTitle(),
                profile.getLegalRepresentative(), profile.getOfficialDomain(), profile.getOfficialHotline(),
                profile.getSmsBrandName(), profile.getVerificationStatus(), profile.getVerifiedAt(), profile.getUpdatedAt(),
                accessToken
        );
    }
}
