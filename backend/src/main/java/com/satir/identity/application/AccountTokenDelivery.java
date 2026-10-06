package com.satir.identity.application;

import com.satir.delivery.application.JobHandler;
import com.satir.delivery.application.MailGateway;
import com.satir.platform.SecretCipher;
import java.time.Clock;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AccountTokenDelivery implements JobHandler {
    private final com.satir.identity.infrastructure.MembershipRepository repository;private final MailGateway mail;private final SecretCipher cipher;private final Clock clock;private final String origin;
    public AccountTokenDelivery(com.satir.identity.infrastructure.MembershipRepository repository,MailGateway mail,SecretCipher cipher,Clock clock,@Value("${satir.public-origin}") String origin) {
        this.repository=repository;this.mail=mail;this.cipher=cipher;this.clock=clock;
        var uri=java.net.URI.create(origin);if(uri.getHost()==null||uri.getRawQuery()!=null||uri.getRawFragment()!=null||uri.getRawUserInfo()!=null||!java.util.Set.of("http","https").contains(uri.getScheme()))throw new IllegalStateException("Invalid public origin");
        this.origin=origin.replaceAll("/$","");
    }
    public String type(){return "ACCOUNT_TOKEN";}
    public boolean handle(UUID id,String deliveryId) {
        var data=repository.delivery(id);
        if(data.isEmpty()||!data.get().expiry().isAfter(clock.instant()))return false;
        var token=data.get();String path=token.purpose().equals("RESET")?"/sifre-sifirla":"/eposta-dogrula";
        // Fragment avoids reverse-proxy URL/query logs. GET never consumes this token.
        String url=origin+path+(token.purpose().equals("EMAIL_CHANGE")?"#purpose=EMAIL_CHANGE&token=":"#token=")+cipher.decrypt(token.secret(),id.toString());
        String recipient=token.targetEmail()==null?token.email():cipher.decrypt(token.targetEmail(),id+":email");
        mail.send(recipient,!token.purpose().equals("RESET")?"E-posta adresini doğrula":"Şifreni sıfırla", "İşlemi tamamlamak için bağlantıyı aç ve onayla:\n"+url,deliveryId);
        return true;
    }

}
