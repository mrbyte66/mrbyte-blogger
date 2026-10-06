package com.satir.engagement.application;

import com.satir.editorial.application.PublicArticles;
import com.satir.engagement.infrastructure.EngagementRepository;
import com.satir.platform.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EngagementService {
    public record Actor(UUID id,boolean member){public String key(){return digest((member?"member:":"anonymous:")+id);}}
    public record Anonymous(UUID id,String secret){}
    private final EngagementRepository repository;
    private final PublicArticles articles;
    private final Clock clock;
    private final com.satir.identity.application.MemberWriteGuard guard;
    private final SecureRandom random=new SecureRandom();
    public EngagementService(EngagementRepository repository,PublicArticles articles,Clock clock,com.satir.identity.application.MemberWriteGuard guard){this.repository=repository;this.articles=articles;this.clock=clock;this.guard=guard;}
    public Optional<Actor> anonymous(String secret){if(secret==null||!secret.matches("[A-Za-z0-9_-]{43}"))return Optional.empty();return repository.anonymous(digest(secret),clock.instant()).map(id->new Actor(id,false));}
    @Transactional public Anonymous start(){byte[] bytes=new byte[32];random.nextBytes(bytes);String secret=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);return new Anonymous(repository.create(digest(secret),clock.instant().plusSeconds(180L*86400)),secret);}
    public Object state(UUID article,Actor actor){articles.require(article);return Map.of("clapped",actor!=null&&repository.clapped(article,actor.id(),actor.member()));}
    @Transactional public Object clap(UUID article,Actor actor,boolean target){if(actor.member())guard.acquire(actor.id());repository.lock(actor.key());if(!actor.member()&&!repository.active(actor.id(),clock.instant()))throw new ApiException(409,"ACTOR_EXPIRED");articles.requireForMutation(article);repository.clap(article,actor.id(),actor.member(),target,clock.instant());return Map.of("clapped",target,"claps",repository.claps(article));}
    public record Impression(UUID eventId,UUID articleId,String source,UUID pageViewId,Instant occurredAt){}
    @Transactional public Object impression(Actor actor,Impression event){
        Instant now=clock.instant();if(event.eventId()==null||event.articleId()==null||event.pageViewId()==null||event.occurredAt()==null||event.source()==null||!Set.of("card","permalink").contains(event.source())||event.occurredAt().isBefore(now.minusSeconds(86400))||event.occurredAt().isAfter(now.plusSeconds(300)))throw new ApiException(422,"INVALID_IMPRESSION");
        if(actor.member())guard.acquire(actor.id());repository.lock(actor.key());if(!actor.member()&&!repository.active(actor.id(),clock.instant()))throw new ApiException(409,"ACTOR_EXPIRED");articles.requireForMutation(event.articleId());String hash=digest(actor.key()+":"+event.articleId()+":"+event.source()+":"+event.pageViewId()+":"+event.occurredAt());
        var previous=repository.event(event.eventId());if(previous.isPresent()&&!previous.get().equals(hash))throw new ApiException(409,"EVENT_ID_CONFLICT");
        boolean counted=repository.receipt(event.eventId(),event.articleId(),actor.key(),event.source(),event.pageViewId(),event.occurredAt(),now,hash);
        // A different actor may have raced for the globally unique event ID.
        if(!repository.event(event.eventId()).orElseThrow().equals(hash))throw new ApiException(409,"EVENT_ID_CONFLICT");
        if(counted)articles.incrementViews(event.articleId());return Map.of("accepted",true,"counted",counted,"views",articles.views(event.articleId()));
    }
    public Object stats(UUID article){return articles.require(article).get("stats");}
    private static String digest(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException("SHA-256 unavailable");}}
}
