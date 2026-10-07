package com.satir.identity.application;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.satir.delivery.application.MailGateway;

/**
 * Account e-mails. Sent only after the transaction that created the token commits, so a rolled-back
 * request never mails a dead link. Tokens exist only in the e-mail body — never in the database,
 * outbox payloads or logs. Links open a frontend page that confirms with an explicit POST, so a
 * mail scanner's GET never consumes the token.
 */
@Component
class AuthMailer {

    private final MailGateway mail;
    private final String origin;

    AuthMailer(MailGateway mail, @Value("${satir.site.public-origin}") String origin) {
        this.mail = mail;
        this.origin = origin.replaceAll("/+$", "");
    }

    void verification(String to, String name, String token) {
        send(to, "E-posta adresini doğrula", """
                Merhaba %s,

                Hesabını etkinleştirmek için bu bağlantıyı aç (24 saat geçerli):
                %s/eposta-dogrula?token=%s

                Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.
                """.formatted(name, origin, token));
    }

    void alreadyRegistered(String to, String name) {
        send(to, "Zaten bir hesabın var", """
                Merhaba %s,

                Bu e-posta adresiyle yeni bir üyelik isteği alındı, fakat zaten bir hesabın var.
                Giriş yapmak için: %s/giris
                Parolanı hatırlamıyorsan: %s/sifremi-unuttum
                """.formatted(name, origin, origin));
    }

    void passwordReset(String to, String name, String token) {
        send(to, "Parola sıfırlama", """
                Merhaba %s,

                Parolanı sıfırlamak için bu bağlantıyı aç (30 dakika geçerli):
                %s/sifre-sifirla?token=%s

                Bu isteği sen yapmadıysan parolan değişmez; e-postayı yok sayabilirsin.
                """.formatted(name, origin, token));
    }

    void emailChange(String to, String name, String token) {
        send(to, "Yeni e-posta adresini onayla", """
                Merhaba %s,

                Hesabının e-posta adresini bu adresle değiştirmek için bağlantıyı aç (24 saat geçerli):
                %s/eposta-dogrula?degisiklik=1&token=%s

                Bu isteği sen yapmadıysan e-postayı yok sayabilirsin; hesabın değişmez.
                """.formatted(name, origin, token));
    }

    private void send(String to, String subject, String body) {
        MailGateway.Message message = new MailGateway.Message(to, subject, body, "account-mail");
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    mail.send(message);
                }
            });
        } else {
            mail.send(message);
        }
    }
}
