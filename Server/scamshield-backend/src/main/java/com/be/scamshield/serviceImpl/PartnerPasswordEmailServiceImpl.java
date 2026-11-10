package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerPasswordEmailStatus;
import com.be.scamshield.service.PartnerPasswordEmailService;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.PartnerPasswordLinkRepository;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StreamUtils;
import org.springframework.web.util.HtmlUtils;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerPasswordEmailServiceImpl implements PartnerPasswordEmailService {
    private final JavaMailSender mailSender;
    private final PartnerProfileRepository profiles;
    private final PartnerPasswordLinkRepository links;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${spring.mail.display-name:ScamShield}")
    private String mailDisplayName;

    private String getHtmlTemplate() throws IOException {
        var resource = new ClassPathResource("templates/partner-password-email.html");
        return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Override
    public void send(Long partnerId, String email, String link, String tokenHash) {
        PartnerPasswordEmailStatus status = PartnerPasswordEmailStatus.SENT;
        try {
            var message = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, mailDisplayName);
            helper.setTo(email);
            helper.setSubject("Tài khoản đối tác ScamShield đã được kích hoạt");
            String html = getHtmlTemplate().replace("{{RESET_PASSWORD_URL}}", HtmlUtils.htmlEscape(link));
            String plain = "Tài khoản đối tác ScamShield của bạn đã được kích hoạt. "
                    + "Đặt mật khẩu trong vòng 10 phút tại: " + link
                    + "\nNếu bạn không đăng ký tài khoản đối tác, vui lòng bỏ qua email này.";
            helper.setText(plain, html);
            mailSender.send(message);
            log.info("Đã gửi link đặt mật khẩu cho hồ sơ {} thành công!", partnerId);
        } catch (Exception ex) {
            status = PartnerPasswordEmailStatus.FAILED;
            log.error("Không thể gửi link đặt mật khẩu cho hồ sơ {}", partnerId, ex);
        }
        final PartnerPasswordEmailStatus deliveryStatus = status;
        profiles.findById(partnerId).ifPresent(profile -> {
            // A newer resend may already have changed the delivery state.
            boolean currentLink = links.findByTokenHash(tokenHash)
                    .map(token -> token.getConsumedAt() == null).orElse(false);
            if (currentLink && profile.getPasswordLinkEmailStatus() == PartnerPasswordEmailStatus.PENDING) {
                profile.setPasswordLinkEmailStatus(deliveryStatus);
            }
        });
    }
}
