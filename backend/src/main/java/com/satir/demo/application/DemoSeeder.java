package com.satir.demo.application;

import java.awt.Color;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.satir.editorial.application.ArticleCommands;
import com.satir.editorial.application.ArticleCommands.VersionRef;
import com.satir.editorial.application.CategoryCommands;
import com.satir.editorial.application.EditorialViews.ArticleEdit;
import com.satir.editorial.application.EditorialViews.SeriesEdit;
import com.satir.editorial.application.SeriesCommands;
import com.satir.editorial.application.StudioContentQuery;
import com.satir.editorial.domain.ArticleDocument;
import com.satir.editorial.domain.Block;
import com.satir.editorial.domain.EditorialValues.ArticlePresentation;
import com.satir.editorial.domain.EditorialValues.Cover;
import com.satir.editorial.domain.EditorialValues.CoverMode;
import com.satir.editorial.domain.EditorialValues.Seo;
import com.satir.editorial.domain.EditorialValues.SeriesPresentation;
import com.satir.engagement.application.EngagementService;
import com.satir.engagement.domain.EngagementRules.Actor;
import com.satir.identity.application.DemoAccounts;
import com.satir.library.application.LibraryService;
import com.satir.media.application.MediaService;
import com.satir.platform.api.PageResponse;
import com.satir.reading.application.HistoryService;

import tools.jackson.databind.json.JsonMapper;

/**
 * Loads {@code seed/demo.json} through the same application services the API uses (revisions, slugs,
 * lifecycle), so demo content obeys every editorial rule. Only for local development: refuses unless
 * {@code satir.seed.enabled}. Idempotent: anything whose slug or e-mail already exists is left untouched.
 */
@Service
public class DemoSeeder {

    static final String RESOURCE = "/seed/demo.json";
    private static final String ZONE = "Europe/Istanbul";

    @JsonIgnoreProperties("_comment")
    record SeedFile(List<CategorySpec> categories, List<SeriesSpec> series, List<ArticleSpec> articles,
            List<MemberSpec> members) {
    }

    record CategorySpec(String slug, String name) {
    }

    record SeriesSpec(String slug, String title, String summary, boolean ongoing, boolean cover) {
    }

    record ArticleSpec(String slug, String title, List<String> categories, LocalDate displayDate, String eyebrow,
            @JsonProperty("abstract") String abstractText, String status, boolean cover, List<BlockSpec> blocks,
            String series, Integer scheduleInDays, @JsonProperty("private") Boolean privateArticle) {

        boolean locked() {
            return Boolean.TRUE.equals(privateArticle);
        }
    }

    record BlockSpec(String type, String text, Integer level, String attribution, String language) {
    }

    record MemberSpec(String email, String name, String password, String collection, List<String> bookmarks,
            List<String> inCollection, List<String> visits, List<String> claps) {
    }

    /** What one run created; everything else already existed. */
    public record Report(int categories, int articles, int series, int members) {
    }

    private final DemoAccounts accounts;
    private final CategoryCommands categories;
    private final ArticleCommands articles;
    private final SeriesCommands series;
    private final StudioContentQuery studio;
    private final MediaService media;
    private final LibraryService library;
    private final HistoryService history;
    private final EngagementService engagement;
    private final JsonMapper json;
    private final Clock clock;
    private final boolean enabled;

    DemoSeeder(DemoAccounts accounts, CategoryCommands categories, ArticleCommands articles, SeriesCommands series,
            StudioContentQuery studio, MediaService media, LibraryService library, HistoryService history,
            EngagementService engagement, JsonMapper json, Clock clock, @Value("${satir.seed.enabled:false}") boolean enabled) {
        this.accounts = accounts;
        this.categories = categories;
        this.articles = articles;
        this.series = series;
        this.studio = studio;
        this.media = media;
        this.library = library;
        this.history = history;
        this.engagement = engagement;
        this.json = json;
        this.clock = clock;
        this.enabled = enabled;
    }

    public Report seed() {
        if (!enabled) {
            throw new IllegalStateException("seed-demo yalnız dev ortamında çalışır (satir.seed.enabled)");
        }
        UUID owner = accounts.ownerId()
                .orElseThrow(() -> new IllegalStateException("Önce bootstrap-owner ile site sahibini oluştur"));
        SeedFile file = load();

        Map<String, UUID> categoryIds = new HashMap<>();
        studio.categories().forEach(category -> categoryIds.put(category.slug(), category.id()));
        int newCategories = 0;
        for (CategorySpec spec : file.categories()) {
            if (!categoryIds.containsKey(spec.slug())) {
                categoryIds.put(spec.slug(), categories.create(spec.name(), spec.slug()));
                newCategories++;
            }
        }

        Map<String, ArticleEdit> bySlug = existingArticles();
        int newArticles = 0;
        for (ArticleSpec spec : file.articles()) {
            if (!bySlug.containsKey(spec.slug())) {
                bySlug.put(spec.slug(), createArticle(owner, spec, categoryIds));
                newArticles++;
            }
        }

        Map<String, SeriesEdit> seriesBySlug = existingSeries();
        int newSeries = 0;
        for (SeriesSpec spec : file.series()) {
            if (!seriesBySlug.containsKey(spec.slug())) {
                createSeries(owner, spec, file.articles(), bySlug);
                newSeries++;
            }
        }

        int newMembers = 0;
        for (MemberSpec spec : file.members()) {
            DemoAccounts.Member member = accounts.ensureVerifiedMember(spec.email(), spec.name(), spec.password().toCharArray());
            if (member.created()) {
                addMemberActivity(member.id(), spec, existingArticles());
                newMembers++;
            }
        }
        return new Report(newCategories, newArticles, newSeries, newMembers);
    }

    // ---------------------------------------------------------------- content

    private ArticleEdit createArticle(UUID owner, ArticleSpec spec, Map<String, UUID> categoryIds) {
        List<UUID> ids = spec.categories().stream().map(slug -> {
            UUID id = categoryIds.get(slug);
            if (id == null) {
                throw new IllegalStateException("Bilinmeyen kategori: " + slug);
            }
            return id;
        }).toList();
        Cover cover = spec.cover() ? new Cover(CoverMode.MANUAL, image(owner, spec.slug())) : Cover.none();
        ArticleCommands.ArticleInput input = new ArticleCommands.ArticleInput(spec.title(), spec.slug(), spec.eyebrow(),
                spec.abstractText(), spec.displayDate(), ids, document(spec.blocks()), ArticlePresentation.defaults(),
                Seo.defaults(), cover, null, List.of());
        UUID id = articles.create(owner, input, spec.locked());
        switch (spec.status()) {
            case "published" -> act(owner, id, new ArticleCommands.ActionInput("publish", null, null, false, null));
            case "scheduled" -> act(owner, id, new ArticleCommands.ActionInput("schedule",
                    clock.instant().plus(Duration.ofDays(spec.scheduleInDays())), ZONE, false, null));
            case "draft" -> { }
            default -> throw new IllegalStateException("Bilinmeyen durum: " + spec.status());
        }
        return article(id);
    }

    private void act(UUID owner, UUID id, ArticleCommands.ActionInput action) {
        articles.act(owner, id, article(id).version(), action);
    }

    private void createSeries(UUID owner, SeriesSpec spec, List<ArticleSpec> all, Map<String, ArticleEdit> bySlug) {
        List<VersionRef> versions = new ArrayList<>();
        List<UUID> chapters = new ArrayList<>();
        for (ArticleSpec article : all) {
            if (spec.slug().equals(article.series())) {
                ArticleEdit current = article(bySlug.get(article.slug()).id());
                chapters.add(current.id());
                versions.add(new VersionRef(current.id(), current.version()));
            }
        }
        Cover cover = spec.cover() ? new Cover(CoverMode.MANUAL, image(owner, spec.slug())) : Cover.none();
        UUID id = series.create(owner, new SeriesCommands.SeriesInput(spec.title(), spec.slug(), spec.summary(),
                spec.ongoing(), cover, SeriesPresentation.defaults(), Seo.defaults(), chapters, versions));
        series.act(owner, id, studio.seriesById(id).orElseThrow().version(), "publish");
    }

    private static ArticleDocument document(List<BlockSpec> blocks) {
        List<Block> body = blocks.stream().map(block -> switch (block.type()) {
            case "paragraph" -> (Block) new Block.Paragraph(UUID.randomUUID(), block.text());
            case "heading" -> new Block.Heading(UUID.randomUUID(), block.text(), block.level());
            case "quote" -> new Block.Quote(UUID.randomUUID(), block.text(), block.attribution());
            case "code" -> new Block.Code(UUID.randomUUID(), block.text(), block.language(), null);
            default -> throw new IllegalStateException("Bilinmeyen blok: " + block.type());
        }).toList();
        return new ArticleDocument(1, body);
    }

    /** Abstract gradient cover (no text, so no fonts are needed on a headless server). */
    private UUID image(UUID owner, String seed) {
        Random random = new Random(seed.hashCode());
        BufferedImage image = new BufferedImage(1200, 675, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setPaint(new GradientPaint(0, 0, Color.getHSBColor(random.nextFloat(), 0.35f, 0.9f),
                1200, 675, Color.getHSBColor(random.nextFloat(), 0.55f, 0.45f)));
        g.fillRect(0, 0, 1200, 675);
        for (int i = 0; i < 6; i++) {
            g.setColor(new Color(255, 255, 255, 30 + random.nextInt(50)));
            int size = 120 + random.nextInt(360);
            g.fillOval(random.nextInt(1200) - size / 2, random.nextInt(675) - size / 2, size, size);
        }
        g.dispose();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            ImageIO.write(image, "png", out);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return media.store(out.toByteArray(), MediaService.Provenance.UPLOAD, owner).id();
    }

    // ---------------------------------------------------------------- members

    private void addMemberActivity(UUID member, MemberSpec spec, Map<String, ArticleEdit> bySlug) {
        UUID collection = spec.collection() == null ? null : library.createCollection(member, spec.collection()).id();
        for (String slug : spec.bookmarks()) {
            UUID target = spec.inCollection().contains(slug) ? collection : null;
            library.save(member, published(bySlug, slug).id(), target);
        }
        Instant now = clock.instant();
        List<String> visits = spec.visits();
        for (int i = 0; i < visits.size(); i++) {
            ArticleEdit article = published(bySlug, visits.get(i));
            history.recordVisit(member, UUID.randomUUID(), article.id(), article.revisionId(),
                    now.minus(Duration.ofMinutes(10L * (visits.size() - i))));
        }
        for (String slug : spec.claps()) {
            engagement.setClap(published(bySlug, slug).id(), new Actor.Member(member), true);
        }
    }

    private static ArticleEdit published(Map<String, ArticleEdit> bySlug, String slug) {
        ArticleEdit article = bySlug.get(slug);
        if (article == null || !"published".equals(article.status())) {
            throw new IllegalStateException("Üye verisi yayımlanmış bir yazı ister: " + slug);
        }
        return article;
    }

    // ---------------------------------------------------------------- lookups

    private ArticleEdit article(UUID id) {
        return studio.article(id).orElseThrow();
    }

    private Map<String, ArticleEdit> existingArticles() {
        Map<String, ArticleEdit> bySlug = new LinkedHashMap<>();
        int page = 0;
        PageResponse<ArticleEdit> result;
        do {
            result = studio.articles(null, null, null, null, null, page++, PageResponse.MAX_SIZE);
            result.items().forEach(article -> bySlug.put(article.slug(), article));
        } while (page < result.totalPages());
        return bySlug;
    }

    private Map<String, SeriesEdit> existingSeries() {
        Map<String, SeriesEdit> bySlug = new LinkedHashMap<>();
        int page = 0;
        PageResponse<SeriesEdit> result;
        do {
            result = studio.series(null, null, page++, PageResponse.MAX_SIZE);
            result.items().forEach(item -> bySlug.put(item.slug(), item));
        } while (page < result.totalPages());
        return bySlug;
    }

    private SeedFile load() {
        try (InputStream in = DemoSeeder.class.getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException(RESOURCE + " bulunamadı");
            }
            return json.readValue(in, SeedFile.class);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
