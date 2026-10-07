package com.satir.support;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;

import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

/** Test SMTP double: records plain-text messages instead of sending them; can simulate outages. */
public class CapturingMailSender implements JavaMailSender {

    private final List<SimpleMailMessage> sent = new CopyOnWriteArrayList<>();
    private volatile boolean failing;

    public void reset() {
        sent.clear();
        failing = false;
    }

    public void failing(boolean value) {
        failing = value;
    }

    public List<SimpleMailMessage> sent() {
        return new ArrayList<>(sent);
    }

    public List<SimpleMailMessage> to(String address) {
        return sent.stream().filter(m -> m.getTo() != null && Arrays.asList(m.getTo()).contains(address)).toList();
    }

    /** Extracts {@code token=...} from the latest message to {@code address}. */
    public Optional<String> lastToken(String address) {
        List<SimpleMailMessage> messages = to(address);
        if (messages.isEmpty()) {
            return Optional.empty();
        }
        Matcher matcher = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(messages.getLast().getText());
        return matcher.find() ? Optional.of(matcher.group(1)) : Optional.empty();
    }

    @Override
    public void send(SimpleMailMessage... messages) throws MailException {
        if (failing) {
            throw new MailSendException("simulated outage");
        }
        sent.addAll(Arrays.asList(messages));
    }

    @Override
    public MimeMessage createMimeMessage() {
        return new MimeMessage((Session) null);
    }

    @Override
    public MimeMessage createMimeMessage(InputStream contentStream) {
        throw new UnsupportedOperationException();
    }

    @Override
    public void send(MimeMessage... mimeMessages) throws MailException {
        throw new UnsupportedOperationException("plain-text mail only");
    }
}
