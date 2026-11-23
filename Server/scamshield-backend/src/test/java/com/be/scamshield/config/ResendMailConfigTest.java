package com.be.scamshield.config;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.POST;

class ResendMailConfigTest {
    @Test
    void sendsMimeMessageThroughHttpsApi() throws Exception {
        var builder = RestClient.builder().baseUrl("https://api.resend.com")
                .defaultHeader("Authorization", "Bearer test-key");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.resend.com/emails"))
                .andExpect(method(POST))
                .andExpect(header("Authorization", "Bearer test-key"))
                .andExpect(jsonPath("$.from").value("ScamShield <no-reply@example.com>"))
                .andExpect(jsonPath("$.to[0]").value("partner@example.com"))
                .andExpect(jsonPath("$.subject").value("Set password"))
                .andExpect(jsonPath("$.text").value("Plain text"))
                .andExpect(jsonPath("$.html").value("<p>HTML</p>"))
                .andRespond(withSuccess("{\"id\":\"email-1\"}", MediaType.APPLICATION_JSON));

        var sender = new ResendMailConfig.ResendMailSender(builder.build());
        sender.send(message());
        server.verify();
    }

    @Test
    void reportsProviderRejectionToExistingDeliveryStatusHandling() throws Exception {
        var builder = RestClient.builder().baseUrl("https://api.resend.com");
        var server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://api.resend.com/emails"))
                .andRespond(withBadRequest().body("invalid sender"));

        var sender = new ResendMailConfig.ResendMailSender(builder.build());
        assertThatThrownBy(() -> sender.send(message())).isInstanceOf(MailSendException.class);
        server.verify();
    }

    private MimeMessage message() throws Exception {
        var message = new MimeMessage(Session.getInstance(new Properties()));
        var helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom("no-reply@example.com", "ScamShield");
        helper.setTo("partner@example.com");
        helper.setSubject("Set password");
        helper.setText("Plain text", "<p>HTML</p>");
        return message;
    }
}
