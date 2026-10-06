package com.satir.delivery.infrastructure;

import com.satir.delivery.application.MailGateway;
import com.satir.platform.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

@Component
public class SmtpMailGateway implements MailGateway {
    private final JavaMailSenderImpl sender=new JavaMailSenderImpl(); private final String from; private final boolean enabled;
    public SmtpMailGateway(@Value("${MAIL_HOST:}") String host,@Value("${MAIL_PORT:587}") int port,@Value("${MAIL_FROM:}") String from,
                          @Value("${MAIL_USERNAME:}") String username,@Value("${MAIL_PASSWORD:}") String password,
                          @Value("${MAIL_TLS_REQUIRED:true}") boolean tls) {
        this.from=from;this.enabled=!host.isBlank()&&!from.isBlank(); sender.setHost(host);sender.setPort(port);sender.setUsername(username);sender.setPassword(password);
        var p=sender.getJavaMailProperties(); p.setProperty("mail.smtp.auth",Boolean.toString(!username.isBlank()));
        p.setProperty("mail.smtp.starttls.enable",Boolean.toString(tls));p.setProperty("mail.smtp.starttls.required",Boolean.toString(tls));
        p.setProperty("mail.smtp.connectiontimeout","5000");p.setProperty("mail.smtp.timeout","10000");p.setProperty("mail.smtp.writetimeout","10000");
    }
    public boolean configured() { return enabled; }
    public void send(String recipient,String subject,String text,String deliveryId) {
        if(!enabled) throw new ApiException(503,"MAIL_NOT_CONFIGURED");
        try {
            var message=sender.createMimeMessage();var helper=new org.springframework.mail.javamail.MimeMessageHelper(message,false,"UTF-8");
            helper.setFrom(from);helper.setTo(recipient);helper.setSubject(subject);helper.setText(text,false);
            message.setHeader("X-Satir-Delivery-ID",deliveryId); sender.send(message);
        } catch(jakarta.mail.MessagingException|org.springframework.mail.MailException e) { throw new ApiException(503,"MAIL_DELIVERY_FAILED"); }
    }
}
