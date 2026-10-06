package com.satir.editorial.application;

import com.satir.delivery.application.JobHandler;
import com.satir.delivery.application.MailGateway;
import com.satir.identity.application.AccountService;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component
public class PublicationDelivery implements JobHandler {
    private final ArticleService articles;private final AccountService accounts;private final MailGateway mail;private final String origin;
    public PublicationDelivery(ArticleService articles,AccountService accounts,MailGateway mail,@Value("${satir.public-origin}")String origin){this.articles=articles;this.accounts=accounts;this.mail=mail;this.origin=origin.replaceAll("/$","");}
    public String type(){return "PUBLICATION";}
    public boolean handle(UUID article,String deliveryId){
        var publication=articles.publication(article,deliveryId);if(publication.isEmpty())return false;
        var owner=accounts.require(publication.get().owner());if(!owner.active()||!owner.publicationEmail())return false;
        mail.send(owner.email(),"Yazınız yayınlandı",publication.get().title()+"\n"+origin+publication.get().path(),deliveryId);return true;
    }
    public boolean eligible(UUID article,String deliveryId){var publication=articles.publication(article,deliveryId);if(publication.isEmpty())return false;var owner=accounts.require(publication.get().owner());return owner.active()&&owner.publicationEmail();}
}
