package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerPasswordEmailStatus;
import com.be.scamshield.entity.PartnerPasswordLink;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.repository.PartnerPasswordLinkRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import jakarta.mail.Session;
import jakarta.mail.Part;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.internet.MimeMessage;
import java.util.Optional;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PartnerEmailPasswordTest {
    @Mock private JavaMailSender sender;
    @Mock private PartnerProfileRepository profiles;
    @Mock private PartnerPasswordLinkRepository links;

    @Test
    void failedDeliveryIsVisibleToAdministrator() {
        var profile = PartnerProfile.builder().id(10L).passwordLinkEmailStatus(PartnerPasswordEmailStatus.PENDING).build();
        var token = PartnerPasswordLink.builder().partner(profile).build();
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("SMTP unavailable")).when(sender).send(any(MimeMessage.class));
        when(profiles.findById(10L)).thenReturn(Optional.of(profile));
        when(links.findByTokenHash("hash")).thenReturn(Optional.of(token));
        var service = new PartnerEmailServiceImpl(sender, profiles, links);
        ReflectionTestUtils.setField(service, "fromEmail", "no-reply@example.com");
        ReflectionTestUtils.setField(service, "mailDisplayName", "ScamShield");

        service.sendPassword(10L, "partner@example.com", "https://example.com/reset-password?token=abc", "hash");

        assertThat(profile.getPasswordLinkEmailStatus()).isEqualTo(PartnerPasswordEmailStatus.FAILED);
    }

    @Test
    void successfulDeliveryUsesHtmlTemplateAndDisplayName() throws Exception {
        var profile = PartnerProfile.builder().id(10L).passwordLinkEmailStatus(PartnerPasswordEmailStatus.PENDING).build();
        var token = PartnerPasswordLink.builder().partner(profile).build();
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        when(profiles.findById(10L)).thenReturn(Optional.of(profile));
        when(links.findByTokenHash("hash")).thenReturn(Optional.of(token));
        var service = new PartnerEmailServiceImpl(sender, profiles, links);
        ReflectionTestUtils.setField(service, "fromEmail", "no-reply@example.com");
        ReflectionTestUtils.setField(service, "mailDisplayName", "ScamShield");
        String link = "https://example.com/reset-password?token=abc";

        service.sendPassword(10L, "partner@example.com", link, "hash");

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(sent.capture());
        MimeMessage message = sent.getValue();
        assertThat(message.getFrom()[0].toString()).contains("ScamShield");
        String content = collectText(message);
        assertThat(content)
                .contains("Tài khoản đối tác đã được kích hoạt", link, "10 phút")
                .doesNotContain("{{RESET_PASSWORD_URL}}");
        assertThat(profile.getPasswordLinkEmailStatus()).isEqualTo(PartnerPasswordEmailStatus.SENT);
    }

    private String collectText(Part part) throws Exception {
        Object content = part.getContent();
        if (content instanceof MimeMultipart multipart) {
            StringBuilder text = new StringBuilder();
            for (int index = 0; index < multipart.getCount(); index++) {
                text.append(collectText(multipart.getBodyPart(index)));
            }
            return text.toString();
        }
        return content.toString();
    }
}
