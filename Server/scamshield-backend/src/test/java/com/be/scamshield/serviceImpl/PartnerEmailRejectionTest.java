package com.be.scamshield.serviceImpl;

import com.be.scamshield.repository.PartnerPasswordLinkRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import jakarta.mail.Session;
import jakarta.mail.Part;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PartnerEmailRejectionTest {
    private final JavaMailSender sender = mock(JavaMailSender.class);
    private final PartnerProfileRepository profiles = mock(PartnerProfileRepository.class);
    private final PartnerPasswordLinkRepository links = mock(PartnerPasswordLinkRepository.class);

    @Test
    void sendsReasonToRegisteredBusinessAddressWithoutRenderingUserHtml() throws Exception {
        var service = new PartnerEmailServiceImpl(sender, profiles, links);
        ReflectionTestUtils.setField(service, "fromEmail", "no-reply@example.com");
        ReflectionTestUtils.setField(service, "mailDisplayName", "ScamShield");
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));

        service.sendRejection(10L, "partner@example.com", "Company <A>", "Missing <script>alert(1)</script>\nLicense");

        ArgumentCaptor<MimeMessage> sent = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(sent.capture());
        MimeMessage message = sent.getValue();
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("partner@example.com");
        assertThat(message.getSubject()).contains("đăng ký đối tác ScamShield");
        String content = collectText(message);
        assertThat(content).contains("Company &lt;A&gt;", "Missing &lt;script&gt;alert(1)&lt;/script&gt;<br>License")
                .doesNotContain("{{PARTNER_NAME}}", "{{REJECTION_REASON}}");
    }

    @Test
    void mailFailureDoesNotUndoCompletedReview() {
        var service = new PartnerEmailServiceImpl(sender, profiles, links);
        ReflectionTestUtils.setField(service, "fromEmail", "no-reply@example.com");
        ReflectionTestUtils.setField(service, "mailDisplayName", "ScamShield");
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("SMTP unavailable")).when(sender).send(any(MimeMessage.class));

        service.sendRejection(10L, "partner@example.com", "Công ty A", "Thiếu giấy phép");

        verify(sender).send(any(MimeMessage.class));
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
