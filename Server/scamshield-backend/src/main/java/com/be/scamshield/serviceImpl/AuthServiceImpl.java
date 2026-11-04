package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.OtpType;
import com.be.scamshield.constant.RoleEnum;
import com.be.scamshield.constant.UserStatus;
import com.be.scamshield.dto.AuthResponse;
import com.be.scamshield.dto.ChangePasswordRequest;
import com.be.scamshield.dto.LoginRequest;
import com.be.scamshield.dto.UserDto;
import com.be.scamshield.dto.request.LoginGoogleRequest;
import com.be.scamshield.dto.request.RegisterGoogleRequest;
import com.be.scamshield.dto.request.RegisterPersonalRequest;
import com.be.scamshield.entity.RefreshToken;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.*;
import com.be.scamshield.repository.RefreshTokenRepository;
import com.be.scamshield.repository.RoleRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.security.GoogleTokenVerifier;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IAuthService;
import com.be.scamshield.service.IOtpService;
import com.be.scamshield.service.IUserAlertSubscriptionService;
import com.be.scamshield.util.VietnamPhoneNumbers;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements IAuthService {

    private final Clock applicationClock;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final IUserAlertSubscriptionService subscriptionService;
    private final IOtpService otpService;
    private final ContactVerificationService contactVerificationService;
    private final GoogleTokenVerifier googleTokenVerifier;

    @Override
    @Transactional
    public void registerPersonal(RegisterPersonalRequest request) {
        if (!request.isAgreeTerms()) {
            throw new BadRequestException("Bạn phải đồng ý với điều khoản sử dụng");
        }
        String email = contactVerificationService.normalizeEmail(request.getEmail());
        String phone = VietnamPhoneNumbers.nationalMobile(request.getPhoneNumber());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new RegistrationConflictException("Email đã được dùng cho một tài khoản");
        }
        if (userRepository.findByPhoneNumber(phone).isPresent()) {
            throw new RegistrationConflictException("Số điện thoại đã được dùng cho một tài khoản");
        }
        if (request.getPassword() == null || request.getPassword().isBlank() || request.getPassword().length() < 6
                || request.getPassword().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("Mật khẩu phải có ít nhất 6 ký tự và không vượt quá 72 byte UTF-8");
        }
        
        Role userRole = roleRepository.findByName(RoleEnum.REGISTERED_USER.name())
                .orElseThrow(() -> new IllegalStateException("Chưa cấu hình role REGISTERED_USER"));

        contactVerificationService.consume(request.getVerificationToken(), phone);

        User newUser = User.builder()
                .fullName(request.getFullName())
                .phoneNumber(phone)
                .isPhoneVerified(true)
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(userRole)
                .status(UserStatus.ACTIVE.name())
                .reputationPoints(0)
                .createdAt(LocalDateTime.now(applicationClock))
                .updatedAt(LocalDateTime.now(applicationClock))
                .build();

        User savedUser;
        try {
            savedUser = userRepository.saveAndFlush(newUser);
        } catch (DataIntegrityViolationException ex) {
            if (ex.getMostSpecificCause() instanceof SQLException sql && "23505".equals(sql.getSQLState())) {
                throw new RegistrationConflictException("Email hoặc số điện thoại đã được dùng cho một tài khoản");
            }
            throw ex;
        }

        if (request.isReceiveAlerts()) {
            subscriptionService.subscribeAllCategories(savedUser);
        }
    }

    @Override
    @Transactional
    public AuthResponse registerGoogle(RegisterGoogleRequest request, HttpServletResponse response) {
        if (!request.isAgreeTerms()) {
            throw new BadRequestException("Bạn phải đồng ý với điều khoản sử dụng");
        }

        String phone = VietnamPhoneNumbers.nationalMobile(request.getPhoneNumber());

        // Kiểm tra xem số điện thoại đã tồn tại chưa
        if (userRepository.findByPhoneNumber(phone).isPresent()) {
            throw new RegistrationConflictException("Số điện thoại đã được dùng cho một tài khoản");
        }

        GoogleIdToken.Payload payload = googleTokenVerifier.verify(request.getIdToken());
        if (payload == null) {
            throw new BadRequestException("Google ID Token không hợp lệ hoặc đã hết hạn");
        }

        // Trích xuất thông tin từ token Google
        String email = payload.getEmail();
        if (!StringUtils.hasText(email)) {
            throw new BadRequestException("Không thể lấy email từ Google ID Token");
        }
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new BadRequestException("Email từ tài khoản Google chưa được xác thực");
        }
        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);

        // Kiểm tra email đã tồn tại trong hệ thống chưa
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new RegistrationConflictException("Email đã được dùng cho một tài khoản. Vui lòng đăng nhập.");
        }

        String name = (String) payload.get("name");
        if (!StringUtils.hasText(name)) {
            name = normalizedEmail.split("@")[0];
        }

        // Xác thực số điện thoại qua verificationToken hoặc phoneOtp
        if (StringUtils.hasText(request.getVerificationToken())) {
            contactVerificationService.consume(request.getVerificationToken(), phone);
        } else if (StringUtils.hasText(request.getPhoneOtp())) {
            otpService.verifyOtp(phone, request.getPhoneOtp(), OtpType.PHONE);
        } else {
            throw new BadRequestException("Cần xác thực số điện thoại trước khi đăng ký (thiếu verificationToken hoặc phoneOtp)");
        }

        // Gán quyền REGISTERED_USER
        Role userRole = roleRepository.findByName(RoleEnum.REGISTERED_USER.name())
                .orElseThrow(() -> new IllegalStateException("Chưa cấu hình role REGISTERED_USER"));

        // Tạo mật khẩu ngẫu nhiên (vì user đăng ký qua Google)
        String randomPassword = UUID.randomUUID().toString();
        LocalDateTime now = applicationClock != null ? LocalDateTime.now(applicationClock) : LocalDateTime.now();

        User user = User.builder()
                .fullName(name)
                .phoneNumber(phone)
                .isPhoneVerified(true)
                .email(normalizedEmail)
                .passwordHash(passwordEncoder.encode(randomPassword))
                .role(userRole)
                .status(UserStatus.ACTIVE.name())
                .reputationPoints(0)
                .createdAt(now)
                .updatedAt(now)
                .lastLoginAt(now)
                .build();

        User savedUser;
        try {
            savedUser = userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            if (ex.getMostSpecificCause() instanceof SQLException sql && "23505".equals(sql.getSQLState())) {
                throw new RegistrationConflictException("Email hoặc số điện thoại đã được dùng cho một tài khoản");
            }
            throw ex;
        }

        if (request.isReceiveAlerts()) {
            subscriptionService.subscribeAllCategories(savedUser);
        }

        UserPrincipal userPrincipal = UserPrincipal.create(savedUser);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String roleName = savedUser.getRole() != null ? savedUser.getRole().getName() : RoleEnum.REGISTERED_USER.name();
        String accessToken = tokenProvider.generateAccessTokenForUser(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                roleName
        );
        String refreshToken = tokenProvider.generateRefreshToken();

        refreshTokenRepository.deleteByUser(savedUser);
        saveRefreshToken(savedUser, refreshToken);

        if (response != null) {
            setRefreshTokenCookie(response, refreshToken);
        }

        log.info("User registered and logged in successfully via Google: {}", savedUser.getEmail());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .build();
    }

    @Override
    @Transactional
    public AuthResponse loginGoogle(LoginGoogleRequest request, HttpServletResponse response) {
        GoogleIdToken.Payload payload = googleTokenVerifier.verify(request.getIdToken());
        if (payload == null) {
            throw new BadRequestException("Google ID Token không hợp lệ hoặc đã hết hạn");
        }

        String email = payload.getEmail();
        if (!StringUtils.hasText(email)) {
            throw new BadRequestException("Không thể lấy email từ Google ID Token");
        }
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new BadRequestException("Email từ tài khoản Google chưa được xác thực");
        }

        String normalizedEmail = email.trim().toLowerCase();

        User user = userRepository.findByEmail(normalizedEmail)
                .or(() -> userRepository.findByEmail(email.trim()))
                .orElseThrow(() -> new ResourceNotFoundException("Tài khoản với email '" + email + "' chưa được đăng ký trong hệ thống. Vui lòng đăng ký trước."));

        if (UserStatus.BANNED.name().equalsIgnoreCase(user.getStatus()) ||
            UserStatus.INACTIVE.name().equalsIgnoreCase(user.getStatus()) ||
            UserStatus.SUSPENDED.name().equalsIgnoreCase(user.getStatus())) {
            throw new UnauthorizedException("Your account is " + user.getStatus().toLowerCase() + ". Please contact support.");
        }

        user.setLastLoginAt(applicationClock != null ? LocalDateTime.now(applicationClock) : LocalDateTime.now());
        userRepository.save(user);

        UserPrincipal userPrincipal = UserPrincipal.create(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String roleName = user.getRole() != null ? user.getRole().getName() : RoleEnum.REGISTERED_USER.name();
        String accessToken = tokenProvider.generateAccessTokenForUser(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                roleName
        );
        String refreshToken = tokenProvider.generateRefreshToken();

        refreshTokenRepository.deleteByUser(user);
        saveRefreshToken(user, refreshToken);

        setRefreshTokenCookie(response, refreshToken);

        log.info("User logged in successfully via Google: {}", user.getEmail());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .build();
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletResponse response) {
        // Authenticate using email, phone number, or username
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsernameOrPhoneNumber(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));

        // Check account status constraint using UserStatus enum
        if (UserStatus.BANNED.name().equalsIgnoreCase(user.getStatus()) ||
            UserStatus.INACTIVE.name().equalsIgnoreCase(user.getStatus()) ||
            UserStatus.SUSPENDED.name().equalsIgnoreCase(user.getStatus())) {
            throw new UnauthorizedException("Your account is " + user.getStatus().toLowerCase() + ". Please contact support.");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String accessToken = tokenProvider.generateAccessToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken();

        refreshTokenRepository.deleteByUser(user);
        saveRefreshToken(user, refreshToken);

        // Set refresh token in HttpOnly Cookie
        setRefreshTokenCookie(response, refreshToken);

        log.info("User logged in successfully: {}", user.getUsername());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .build();
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(String refreshTokenStr, HttpServletResponse response) {
        if (refreshTokenStr == null || refreshTokenStr.isBlank()) {
            throw new UnauthorizedException("Refresh token is missing");
        }

        String tokenHash = hashToken(refreshTokenStr);

        RefreshToken refreshTokenEntity = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Invalid or revoked refresh token"));

        if (refreshTokenEntity.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(refreshTokenEntity);
            clearRefreshTokenCookie(response);
            throw new UnauthorizedException("Refresh token has expired. Please login again.");
        }

        User user = refreshTokenEntity.getUser();

        // Check account status constraint using UserStatus enum
        if (UserStatus.BANNED.name().equalsIgnoreCase(user.getStatus()) ||
            UserStatus.INACTIVE.name().equalsIgnoreCase(user.getStatus()) ||
            UserStatus.SUSPENDED.name().equalsIgnoreCase(user.getStatus())) {
            clearRefreshTokenCookie(response);
            throw new UnauthorizedException("Your account is " + user.getStatus().toLowerCase() + ". Please contact support.");
        }

        String roleName = user.getRole() != null ? user.getRole().getName() : RoleEnum.REGISTERED_USER.name();
        String newAccessToken = tokenProvider.generateAccessTokenForUser(user.getId(), user.getUsername(), user.getEmail(), roleName);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .build();
    }

    @Override
    @Transactional
    public void changePassword(String currentUsername, ChangePasswordRequest request) {
        User user = findUserByUsernameOrEmailOrPhone(currentUsername);

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password does not match!");
        }

        if (request.getOldPassword().equals(request.getNewPassword())) {
            throw new BadRequestException("New password cannot be the same as the current password!");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        refreshTokenRepository.deleteByUser(user);
        log.info("Password successfully updated for user: {}", currentUsername);
    }

    @Override
    @Transactional
    public void logout(String refreshTokenStr, String currentUsername, HttpServletResponse response) {
        if (refreshTokenStr != null && !refreshTokenStr.isBlank()) {
            String tokenHash = hashToken(refreshTokenStr);
            refreshTokenRepository.deleteByTokenHash(tokenHash);
        }

        if (currentUsername != null && !currentUsername.isBlank()) {
            userRepository.findByEmailOrPhoneNumber(currentUsername)
                    .ifPresent(refreshTokenRepository::deleteByUser);
        }

        clearRefreshTokenCookie(response);
        SecurityContextHolder.clearContext();
        log.info("User logged out successfully");
    }

    @Override
    @Transactional(readOnly = true)
    public UserDto getCurrentUserProfile(String currentUsername) {
        User user = findUserByUsernameOrEmailOrPhone(currentUsername);
        return mapToUserDto(user);
    }

    private User findUserByUsernameOrEmailOrPhone(String identifier) {
        return userRepository.findByEmailOrPhoneNumber(identifier)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + identifier));
    }

    private void saveRefreshToken(User user, String refreshTokenStr) {
        String tokenHash = hashToken(refreshTokenStr);
        LocalDateTime expiresAt = LocalDateTime.now().plus(Duration.ofMillis(tokenProvider.getRefreshExpirationInMs()));

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .createdAt(LocalDateTime.now())
                .expiresAt(expiresAt)
                .build();

        refreshTokenRepository.save(refreshToken);
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        if (response == null) return;
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(false) // Can be set to true in HTTPS production
                .path("/")
                .maxAge(tokenProvider.getRefreshExpirationInMs() / 1000)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        if (response == null) return;
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return token;
        }
    }

    private UserDto mapToUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .isPhoneVerified(user.getIsPhoneVerified() != null ? user.getIsPhoneVerified() : false)
                .role(user.getRole() != null ? user.getRole().getName() : RoleEnum.REGISTERED_USER.name())
                .status(user.getStatus())
                .reputationPoints(user.getReputationPoints())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
