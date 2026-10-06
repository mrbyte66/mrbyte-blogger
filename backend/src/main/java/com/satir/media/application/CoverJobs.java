package com.satir.media.application;
import com.satir.media.infrastructure.CoverJobRepository;
import com.satir.delivery.application.*;
import com.satir.platform.*;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
@Service
public class CoverJobs implements JobHandler {
 private final CoverProvider provider;private final CoverJobRepository repository;private final MediaService media;private final JobQueue queue;private final ObjectMapper mapper;private final Clock clock;
 public CoverJobs(CoverProvider provider,CoverJobRepository repository,MediaService media,JobQueue queue,ObjectMapper mapper,Clock clock){this.provider=provider;this.repository=repository;this.media=media;this.queue=queue;this.mapper=mapper;this.clock=clock;}
 public boolean configured(){return provider.configured();}
 public Object create(UUID owner,String type,UUID resource,long version,String query){if(!configured())throw new ApiException(503,"COVER_PROVIDER_UNAVAILABLE");UUID id=UUID.randomUUID();repository.create(id,owner,type,resource,version,query,clock.instant());queue.enqueue(type(),id,"cover:"+id);return Map.of("id",id,"state","PENDING");}
 public Object get(UUID owner,UUID id){var job=repository.find(id).filter(j->j.owner().equals(owner)&&j.expiresAt().isAfter(clock.instant())).orElseThrow(()->new ApiException(404,"NOT_FOUND"));var result=new LinkedHashMap<String,Object>();result.put("id",id);result.put("state",job.state());result.put("candidates",mapper.readTree(job.candidates()));result.put("errorCode",job.errorCode());return result;}
 public String type(){return "COVER_SEARCH";}
 public boolean handle(UUID id,String deliveryId){var job=repository.find(id).orElse(null);if(job==null||!job.expiresAt().isAfter(clock.instant()))return false;if(job.state().equals("READY")||job.state().equals("FAILED"))return true;
 var uploadedAssets=new ArrayList<UUID>();
 try {
 var candidates=new ArrayList<Object>();for(var photo:provider.search(job.query())){String key=UUID.nameUUIDFromBytes((id+":"+photo.providerId()).getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();var uploaded=mapper.valueToTree(media.upload(job.owner(),key,photo.image()));UUID asset=UUID.fromString(uploaded.get("id").asText());uploadedAssets.add(asset);var attribution=Map.of("provider","pexels","providerId",photo.providerId(),"sourceUrl",photo.sourceUrl(),"photographer",photo.photographer(),"licenseUrl",photo.licenseUrl(),"fetchedAt",clock.instant().toString());media.setAttribution(asset,attribution);candidates.add(Map.of("assetId",asset,"thumbnailUrl","/api/v1/media/"+asset,"sourceUrl",photo.sourceUrl(),"photographer",photo.photographer(),"licenseUrl",photo.licenseUrl()));}
 if(!job.expiresAt().isAfter(clock.instant())||repository.find(id).isEmpty()){for(UUID asset:uploadedAssets)media.deleteUnreferencedCandidate(asset);return false;}
 repository.ready(id,mapper.writeValueAsString(candidates));return true;
 }catch(RuntimeException e){for(UUID asset:uploadedAssets)try{media.deleteUnreferencedCandidate(asset);}catch(RuntimeException cleanup){org.slf4j.LoggerFactory.getLogger(CoverJobs.class).warn("COVER_CLEANUP_REQUIRED job={}",id);}repository.failed(id);return true;}
 }
}
