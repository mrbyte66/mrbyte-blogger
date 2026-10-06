package com.satir.library.application;

import com.satir.editorial.application.PublicArticles;
import com.satir.library.infrastructure.LibraryRepository;
import com.satir.platform.ApiException;
import com.satir.platform.IdempotentCommands;
import java.time.Clock;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LibraryService {
    private final LibraryRepository repository;
    private final PublicArticles articles;
    private final IdempotentCommands commands;
    private final Clock clock;
    private final com.satir.reading.application.ReadingService reading;
    private final com.satir.identity.application.MemberWriteGuard guard;
    public LibraryService(LibraryRepository repository,PublicArticles articles,IdempotentCommands commands,Clock clock,com.satir.reading.application.ReadingService reading,com.satir.identity.application.MemberWriteGuard guard){this.repository=repository;this.articles=articles;this.commands=commands;this.clock=clock;this.reading=reading;this.guard=guard;}
    @Transactional public Object collections(UUID user){guard.acquire(user);repository.lock(user);repository.ensureDefault(user);return Map.of("items",repository.collections(user));}
    @Transactional public Object create(UUID user,String key,String name){guard.acquire(user);return commands.execute(user.toString(),"/me/collections",key,Map.of("name",name),()->{
        guard.acquire(user);repository.lock(user);repository.ensureDefault(user);String clean=name(name);UUID id=UUID.randomUUID();try{repository.create(user,id,clean,normalized(clean),false);}catch(org.springframework.dao.DuplicateKeyException e){throw new ApiException(409,"COLLECTION_EXISTS");}return require(user,id);
    });}
    @Transactional public Object rename(UUID user,UUID id,long version,String name){guard.acquire(user);repository.lock(user);var c=require(user,id);version(c,version);if(c.isDefault())throw new ApiException(409,"DEFAULT_COLLECTION_IMMUTABLE");String clean=name(name);try{repository.rename(user,id,clean,normalized(clean));}catch(org.springframework.dao.DuplicateKeyException e){throw new ApiException(409,"COLLECTION_EXISTS");}return require(user,id);}
    @Transactional public void delete(UUID user,UUID id,long version){guard.acquire(user);repository.lock(user);var found=repository.collection(user,id);if(found.isEmpty()){if(repository.collectionExists(id))throw new ApiException(404,"NOT_FOUND");return;}var c=found.get();version(c,version);if(c.isDefault())throw new ApiException(409,"DEFAULT_COLLECTION_IMMUTABLE");repository.delete(user,id,repository.ensureDefault(user).id());}
    @Transactional public LibraryRepository.Saved save(UUID user,UUID article,UUID collection){
        guard.acquire(user);repository.lock(user);var before=repository.saved(user,article);if(before.isEmpty())articles.requireForMutation(article);
        UUID target=collection==null?before.map(LibraryRepository.Saved::collectionId).orElseGet(()->repository.ensureDefault(user).id()):require(user,collection).id();
        if(before.isEmpty()){repository.save(user,article,target,clock.instant());}
        else if(!before.get().collectionId().equals(target))repository.move(user,article,target);
        return repository.saved(user,article).orElseThrow();
    }
    @Transactional public void remove(UUID user,UUID article){guard.acquire(user);repository.lock(user);repository.remove(user,article);}
    public Object list(UUID user,UUID collection,String q,int page,int size,String sort){
        bounds(page,size);if(!Set.of("saved_asc","saved_desc","date_desc","title_asc").contains(sort))throw new ApiException(422,"INVALID_SORT");if(collection!=null)require(user,collection);
        if(q!=null){q=q.trim();if(q.isEmpty()||q.length()>100)throw new ApiException(422,"INVALID_QUERY");}
        var filter=new LibraryRepository.Filter(user,collection,q,sort);long total=repository.count(filter);var items=repository.list(filter,page,size).stream().map(saved->{var m=new LinkedHashMap<String,Object>();m.put("articleId",saved.articleId());m.put("collectionId",saved.collectionId());m.put("savedAt",saved.savedAt());m.put("version",saved.version());var article=articles.find(saved.articleId());m.put("available",article.isPresent());m.put("article",article.orElse(null));return m;}).toList();return Map.of("items",items,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size,"sort",sort);
    }
    public Object state(UUID user,List<UUID> ids){if(ids.size()>50||new HashSet<>(ids).size()!=ids.size())throw new ApiException(422,"INVALID_IDS");return Map.of("items",ids.stream().map(id->{if(articles.find(id).isEmpty())return Map.<String,Object>of("articleId",id,"available",false);var m=new LinkedHashMap<String,Object>();m.put("articleId",id);m.put("available",true);m.put("bookmark",repository.saved(user,id).orElse(null));m.put("lastVisitedAt",reading.lastVisit(user,id).orElse(null));return m;}).toList());}
    private LibraryRepository.Collection require(UUID user,UUID id){return repository.collection(user,id).orElseThrow(()->new ApiException(404,"NOT_FOUND"));}
    private void version(LibraryRepository.Collection c,long version){if(c.version()!=version)throw new ApiException(412,"STALE_VERSION");}
    private String name(String name){if(name==null)throw new ApiException(422,"INVALID_COLLECTION_NAME");String clean=name.strip().replaceAll("\\s+"," ");if(clean.isEmpty()||clean.length()>60)throw new ApiException(422,"INVALID_COLLECTION_NAME");return clean;}
    private String normalized(String name){return java.text.Normalizer.normalize(name,java.text.Normalizer.Form.NFKC).toLowerCase(java.util.Locale.forLanguageTag("tr"));}
    private void bounds(int page,int size){if(page<0||page>1000||size<1||size>50)throw new ApiException(422,"INVALID_PAGINATION");}
}
