package com.satir.delivery.application;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Plain-text e-mail through the configured SMTP provider. When no provider is configured
 * ({@code spring.mail.host} unset) mail is reported as unavailable — never as a fake success.
 */
@Component
public class MailGateway {

    public enum Result { SENT, NOT_CONFIGURED, FAILED }

    public record Message(String to, String subject, String body, String messageKey) {
        @Override
        public String toString() {
            return "Message[subject=" + subject + "]";
        }
    }

    private static final Logger log = LoggerFactory.getLogger(MailGateway.class);

    private final Optional<JavaMailSender> sender;
    private final String from;

    MailGateway(ObjectProvider<JavaMailSender> sender, @Value("${satir.mail.from:}") String from) {
        this.sender = Optional.ofNullable(sender.getIfAvailable());
        this.from = from;
    }

    public boolean configured() {
        return sender.isPresent() && !from.isBlank();
    }

    public Result send(Message message) {
        if (!configured()) {
            return Result.NOT_CONFIGURED;
        }
        SimpleMailMessage mail = new SimpleMailMessage();
        mail.setFrom(from);
        mail.setTo(message.to());
        mail.setSubject(message.subject());
        mail.setText(message.body());
        try {
            sender.get().send(mail);
            return Result.SENT;
        } catch (MailException e) {
            // Recipient and body are not logged.
            log.warn("Mail delivery failed ({}): {}", message.messageKey(), e.getClass().getSimpleName());
            return Result.FAILED;
        }
    }
}
