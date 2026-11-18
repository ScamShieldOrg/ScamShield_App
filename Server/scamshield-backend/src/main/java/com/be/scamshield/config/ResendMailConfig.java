package com.be.scamshield.config;

import jakarta.mail.Address;
import jakarta.mail.Message;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Configuration
public class ResendMailConfig {
    @Bean
    @Primary
    @ConditionalOnProperty(name = "app.mail.provider", havingValue = "resend")
    JavaMailSender resendMailSender(@Value("${app.mail.resend-api-key:}") String apiKey) {
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("RESEND_API_KEY is required when MAIL_PROVIDER=resend");
        }
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(5));
        requestFactory.setReadTimeout(Duration.ofSeconds(15));
        var client = RestClient.builder()
                .baseUrl("https://api.resend.com")
                .requestFactory(requestFactory)
                .defaultHeader("Authorization", "Bearer " + apiKey)
                .build();
        return new ResendMailSender(client);
    }

    static final class ResendMailSender extends JavaMailSenderImpl {
        private final RestClient client;

        ResendMailSender(RestClient client) {
            this.client = client;
        }

        @Override
        public void send(MimeMessage... messages) {
            for (var message : messages) {
                try {
                    message.saveChanges();
                    var body = new LinkedHashMap<String, Object>();
                    body.put("from", sender(message));
                    body.put("to", recipients(message));
                    body.put("subject", message.getSubject());
                    var content = new EmailContent();
                    collectContent(message, content);
                    if (content.html != null) body.put("html", content.html);
                    if (content.text != null) body.put("text", content.text);
                    if (content.html == null && content.text == null) {
                        throw new IllegalArgumentException("Email has no text or HTML body");
                    }
                    client.post().uri("/emails").body(body).retrieve().toBodilessEntity();
                } catch (Exception ex) {
                    throw new MailSendException("Resend email API request failed", ex);
                }
            }
        }

        private static String sender(MimeMessage message) throws Exception {
            Address[] addresses = message.getFrom();
            if (addresses == null || addresses.length != 1 || !(addresses[0] instanceof InternetAddress from)) {
                throw new IllegalArgumentException("Email must have one sender");
            }
            return StringUtils.hasText(from.getPersonal())
                    ? from.getPersonal() + " <" + from.getAddress() + ">" : from.getAddress();
        }

        private static List<String> recipients(MimeMessage message) throws Exception {
            Address[] addresses = message.getRecipients(Message.RecipientType.TO);
            if (addresses == null || addresses.length == 0) {
                throw new IllegalArgumentException("Email has no recipient");
            }
            List<String> recipients = new ArrayList<>();
            for (Address address : addresses) {
                recipients.add(((InternetAddress) address).getAddress());
            }
            return recipients;
        }

        private static void collectContent(Part part, EmailContent content) throws Exception {
            Object value = part.getContent();
            if (value instanceof Multipart multipart) {
                for (int i = 0; i < multipart.getCount(); i++) {
                    collectContent(multipart.getBodyPart(i), content);
                }
            } else if (part.isMimeType("text/html") && value instanceof String html) {
                content.html = html;
            } else if (part.isMimeType("text/plain") && value instanceof String text) {
                content.text = text;
            }
        }

        private static final class EmailContent {
            String html;
            String text;
        }
    }
}
