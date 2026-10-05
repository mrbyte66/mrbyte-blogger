package com.satir.editorial.application;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.satir.editorial.infrastructure.ArticleRepository;

/**
 * Publishes due scheduled articles every 15 seconds (target ≤ 60 s). Each article is published in
 * its own transaction under a row lock, so a cancel/reschedule that wins the lock makes this a
 * no-op, and restarts simply pick up anything overdue.
 */
@Component
@ConditionalOnProperty(name = "satir.jobs.enabled", havingValue = "true", matchIfMissing = true)
public class PublicationScheduler {

    private static final Logger log = LoggerFactory.getLogger(PublicationScheduler.class);

    private final ArticleRepository articles;
    private final ArticleCommands commands;
    private final Clock clock;

    PublicationScheduler(ArticleRepository articles, ArticleCommands commands, Clock clock) {
        this.articles = articles;
        this.commands = commands;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${satir.jobs.schedule-interval:PT15S}", initialDelayString = "${satir.jobs.initial-delay:PT5S}")
    public void tick() {
        runOnce();
    }

    public int runOnce() {
        int published = 0;
        List<UUID> due = articles.dueScheduled(clock.instant(), 50);
        for (UUID id : due) {
            try {
                if (commands.publishDue(id)) {
                    published++;
                }
            } catch (RuntimeException e) {
                log.warn("Scheduled publication of {} failed: {}", id, e.getClass().getSimpleName());
            }
        }
        return published;
    }
}
