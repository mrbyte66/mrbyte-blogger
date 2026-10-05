package com.satir.editorial.application;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import com.satir.delivery.application.JobHandler;
import com.satir.delivery.application.MailGateway;
import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.editorial.infrastructure.EditorialRows.ArticleRow;
import com.satir.identity.application.ProfileQuery;
import com.satir.identity.application.ProfileQuery.ProfileView;

/**
 * "Yazınız yayınlandı" mail. Eligibility is re-checked on every attempt: the account-wide
 * preference, a verified address, the article still public, and the same publication generation.
 * A later preference change never resends old events. SMTP has no exactly-once guarantee: a crash
 * after hand-off can resend (documented in the architecture).
 */
@Component
class PublicationEmailHandler implements JobHandler {

    private final ArticleRepository articles;
    private final ProfileQuery profiles;
    private final MailGateway mail;
    private final TransactionTemplate transactions;
    private final String publicOrigin;

    PublicationEmailHandler(ArticleRepository articles, ProfileQuery profiles, MailGateway mail,
            TransactionTemplate transactions, @Value("${satir.site.public-origin}") String publicOrigin) {
        this.articles = articles;
        this.profiles = profiles;
        this.mail = mail;
        this.transactions = transactions;
        this.publicOrigin = publicOrigin.replaceAll("/+$", "");
    }

    @Override
    public String type() {
        return ArticleCommands.PUBLICATION_EMAIL_JOB;
    }

    @Override
    public Outcome handle(Job job) {
        record Eligible(ArticleRow article, ProfileView owner) {
        }
        Optional<Eligible> eligible = transactions.execute(status -> articles.find(job.aggregateId())
                .filter(ArticleRow::isPublic)
                .filter(article -> article.publicationGeneration() == job.generation())
                .flatMap(article -> profiles.ownProfile(article.ownerId())
                        .filter(ProfileView::publicationEmail)
                        .filter(ProfileView::verified)
                        .map(owner -> new Eligible(article, owner))));
        if (eligible.isEmpty()) {
            return new Outcome.Skipped("NOT_ELIGIBLE");
        }
        ArticleRow article = eligible.get().article();
        String body = """
                Merhaba %s,

                "%s" yazın yayımlandı.
                %s%s

                Bu e-postayı Hesap → Bildirimler bölümünden kapatabilirsin.
                """.formatted(eligible.get().owner().name(), article.title(), publicOrigin,
                EditorialAssembler.articlePath(article.slug()));
        MailGateway.Result result = mail.send(new MailGateway.Message(eligible.get().owner().email(),
                "Yazın yayımlandı: " + article.title(), body, job.dedupeKey()));
        return switch (result) {
            case SENT -> new Outcome.Done();
            case NOT_CONFIGURED -> new Outcome.Retry("MAIL_NOT_CONFIGURED");
            case FAILED -> new Outcome.Retry("MAIL_SEND_FAILED");
        };
    }
}
