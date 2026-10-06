package com.satir.media.application;

import com.satir.media.infrastructure.*;
import com.satir.platform.ApiException;
import com.satir.platform.AssetReferences;
import com.satir.platform.IdempotentCommands;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class MediaService {
    private final tools.jackson.databind.ObjectMapper mapper;
    private final MediaRepository repository;
    private final LocalAssetStorage storage;
    private final ImageSanitizer sanitizer;
    private final List<AssetReferences> references;
    private final IdempotentCommands commands;
    private final Clock clock;
    private final com.satir.platform.ContentWriteGuard guard;
    public MediaService(MediaRepository repository,LocalAssetStorage storage,ImageSanitizer sanitizer,List<AssetReferences> references,IdempotentCommands commands,Clock clock,com.satir.platform.ContentWriteGuard guard,tools.jackson.databind.ObjectMapper mapper){this.mapper=mapper;this.guard=guard;this.repository=repository;this.storage=storage;this.sanitizer=sanitizer;this.references=references;this.commands=commands;this.clock=clock;}
    public void validateArchiveImage(byte[] bytes){sanitizer.archive(bytes);}
    public Object importImage(UUID owner,String key,byte[] bytes){return store(owner,key,bytes,sanitizer.archive(bytes));}
    public Object upload(UUID owner,String key,byte[] bytes){return store(owner,key,bytes,sanitizer.sanitize(bytes));}
    private Object store(UUID owner,String key,byte[] bytes,ImageSanitizer.Image image){return commands.execute(owner.toString(),"/studio/media",key,Map.of("sha256",hash(bytes)),()->{
        UUID id=UUID.randomUUID();String storageKey=id+".png";storage.write(storageKey,image.bytes());
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){public void afterCompletion(int status){if(status!=STATUS_COMMITTED)storage.delete(storageKey);}});
        repository.create(new MediaRepository.Asset(id,owner,storageKey,"READY","image/png",image.bytes().length,image.width(),image.height(),hash(image.bytes())),clock.instant());return Map.of("id",id,"state","READY");
    });}
    public Object ownerDetails(UUID id){var asset=require(id);var m=new LinkedHashMap<String,Object>();m.put("id",id);m.put("state",asset.state());m.put("size",asset.size());m.put("mime",asset.mime());m.put("width",asset.width());m.put("height",asset.height());m.put("attribution",attribution(id));m.put("errorCode",null);return m;}
    public record File(Path path,String mime,long size){}
    public File read(UUID id,boolean owner){var asset=require(id);if(!owner&&references.stream().noneMatch(r->r.publiclyReferenced(id)))throw new ApiException(404,"NOT_FOUND");return new File(storage.read(asset.storageKey()),asset.mime(),asset.size());}
    @Transactional public void delete(UUID id){guard.acquire();var found=repository.find(id);if(found.isEmpty())return;if(references.stream().anyMatch(r->r.referenced(id)))throw new ApiException(409,"MEDIA_IN_USE");repository.delete(id);TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){public void afterCommit(){try{storage.delete(found.get().storageKey());}catch(ApiException e){org.slf4j.LoggerFactory.getLogger(MediaService.class).warn("MEDIA_ORPHAN_CLEANUP_REQUIRED");}}});}
    @Transactional public boolean deleteUnreferencedCandidate(UUID id) {
        guard.acquire();
        if (references.stream().anyMatch(r -> r.referenced(id))) return false;
        delete(id);
        return true;
    }
    public void validate(Set<UUID> ids,UUID article,boolean publicTarget){for(UUID id:ids){require(id);if(publicTarget&&references.stream().anyMatch(r->r.privateElsewhere(id,article))||!publicTarget&&references.stream().anyMatch(r->r.publicElsewhere(id,article)))throw new ApiException(409,"PRIVATE_ASSET_CONFLICT");}}
    public Object publicProjection(UUID id){var asset=require(id);var m=new LinkedHashMap<String,Object>();m.put("id",id);m.put("url","/api/v1/media/"+id);m.put("mime",asset.mime());m.put("width",asset.width());m.put("height",asset.height());m.put("attribution",attribution(id));return m;}
    private Object attribution(UUID id){return repository.attribution(id).map(json->mapper.readTree(json)).orElse(null);}
    @Transactional public void setAttribution(UUID id,Object value){require(id);repository.attribution(id,mapper.writeValueAsString(value));}
    private MediaRepository.Asset require(UUID id){return repository.find(id).filter(a->a.state().equals("READY")).orElseThrow(()->new ApiException(404,"NOT_FOUND"));}
    private String hash(byte[] bytes){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException("SHA-256 unavailable");}}
}
