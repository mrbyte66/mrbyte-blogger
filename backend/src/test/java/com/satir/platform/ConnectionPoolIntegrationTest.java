package com.satir.platform;

import static com.satir.support.Fixtures.article;
import static com.satir.support.Fixtures.publish;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.IntFunction;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.support.TransactionTemplate;

import com.satir.platform.ratelimit.RateLimiter;
import com.satir.support.ApiClient;
import com.satir.support.IntegrationTest;
import com.zaxxer.hikari.HikariDataSource;

/**
 * Rate-limited endpoints must not need a second pooled connection while holding one: with more simultaneous
 * requests than connections every request would wait for the pool until it times out (#28).
 */
class ConnectionPoolIntegrationTest extends IntegrationTest {

    private static final Map<String, String> BROWSER = Map.of("User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36");

    @Autowired
    private HikariDataSource dataSource;

    @Autowired
    private RateLimiter rateLimiter;

    @Autowired
    private TransactionTemplate transactions;

    private String articleId;

    @BeforeEach
    void content() {
        createOwner();
        articleId = publish(ownerClient(), article("Kalabalık", "kalabalik", "Metin.")).text("id");
    }

    private int requests() {
        return dataSource.getMaximumPoolSize() * 2;
    }

    /** Starts every request at the same moment and returns the status codes. */
    private List<Integer> simultaneously(int count, IntFunction<Callable<Integer>> request) throws Exception {
        ExecutorService threads = Executors.newFixedThreadPool(count);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                Callable<Integer> call = request.apply(i);
                futures.add(threads.submit(() -> {
                    start.await();
                    return call.call();
                }));
            }
            start.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) {
                statuses.add(future.get(20, TimeUnit.SECONDS));
            }
            return statuses;
        } finally {
            threads.shutdownNow();
        }
    }

    private ApiClient visitor() {
        ApiClient api = client();
        api.refreshCsrf();
        return api;
    }

    @Test
    void rateLimiterRefusesToRunInsideATransaction() {
        RateLimiter.Limit limit = new RateLimiter.Limit("pool-test", 1, Duration.ofMinutes(1));
        assertThatThrownBy(() -> transactions.executeWithoutResult(status -> rateLimiter.blockedFor(limit, "x")))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> transactions.executeWithoutResult(status -> rateLimiter.record(limit, "x")))
                .isInstanceOf(IllegalStateException.class);
        rateLimiter.record(limit, "x");
        assertThat(rateLimiter.blockedFor(limit, "x")).isPresent();
    }

    @Test
    void simultaneousClapsDoNotExhaustThePool() throws Exception {
        List<ApiClient> visitors = new ArrayList<>();
        for (int i = 0; i < requests(); i++) {
            ApiClient visitor = visitor();
            visitor.post("/api/v1/engagement/session", null, Map.of());
            visitors.add(visitor);
        }
        List<Integer> statuses = simultaneously(requests(), i -> () -> visitors.get(i)
                .put("/api/v1/articles/" + articleId + "/clap", Map.of("clapped", true), BROWSER).status());
        assertThat(statuses).containsOnly(200);
        assertThat(jdbc.sql("SELECT count(*) FROM article_clap").query(Long.class).single()).isEqualTo(requests());
    }

    @Test
    void simultaneousViewsDoNotExhaustThePool() throws Exception {
        ApiClient visitor = visitor();
        List<Integer> statuses = simultaneously(requests(), i -> () -> visitor.post("/api/v1/impressions",
                Map.of("eventId", UUID.randomUUID().toString(), "articleId", articleId, "source", "card",
                        "pageViewId", UUID.randomUUID().toString(), "occurredAt", clock.instant().toString()),
                BROWSER).status());
        assertThat(statuses).containsOnly(200);
    }

    @Test
    void simultaneousAccountMailRequestsDoNotExhaustThePool() throws Exception {
        ApiClient anonymous = visitor();
        List<Integer> statuses = simultaneously(requests(), i -> () -> anonymous.post("/api/v1/auth/password/forgot",
                Map.of("email", "kalabalik" + i + "@example.test")).status());
        assertThat(statuses).containsOnly(202);
    }
}
