package com.satir.reading.application;

import com.satir.editorial.application.PublicArticles;
import com.satir.editorial.application.SeriesService;
import com.satir.identity.application.MemberWriteGuard;
import com.satir.platform.ApiException;
import com.satir.platform.IdempotentCommands;
import com.satir.platform.Preconditions;
import com.satir.reading.domain.AnnotationInput;
import com.satir.reading.infrastructure.ReadingRepository;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class ReadingService {
    private final ReadingRepository repository;
    private final PublicArticles articles;
    private final SeriesService series;
    private final MemberWriteGuard guard;
    private final IdempotentCommands commands;
    private final ObjectMapper mapper;
    private final Clock clock;
    public ReadingService(ReadingRepository repository,PublicArticles articles,SeriesService series,MemberWriteGuard guard,IdempotentCommands commands,ObjectMapper mapper,Clock clock){this.repository=repository;this.articles=articles;this.series=series;this.guard=guard;this.commands=commands;this.mapper=mapper;this.clock=clock;}
    public Object annotations(UUID user,UUID article){
        var marks=repository.marks(user,article);
        if(articles.find(article).isEmpty())return Map.of("articleId",article,"available",false,"items",marks.stream().map(m->Map.of("id",m.id(),"available",false)).toList());
        return Map.of("articleId",article,"revisionId",articles.currentRevision(article),"items",marks.stream().map(this::projection).toList());
    }
    public record PutResult(boolean created,Object mark){}
    @Transactional public PutResult put(UUID user,UUID article,UUID id,String ifNoneMatch,String ifMatch,AnnotationInput input){
        guard.acquire(user);articles.requireForMutation(article);validate(article,input);var before=repository.mark(user,article,id);
        if(before.isEmpty()){
            if(!"*".equals(ifNoneMatch))throw new ApiException(428,"CREATE_PRECONDITION_REQUIRED");if(ifMatch!=null)throw new ApiException(412,"STALE_VERSION");
            if(repository.marks(user,article).size()>=200)throw new ApiException(409,"ANNOTATION_LIMIT");create(user,article,id,input);
        }else{
            if(ifNoneMatch!=null)throw new ApiException(412,"ANNOTATION_EXISTS");long version=Preconditions.version(ifMatch);if(version!=before.get().version())throw new ApiException(412,"STALE_VERSION");
            repository.update(user,article,id,input.kind(),input.revisionId(),mapper.writeValueAsString(input.fragments()),input.note());
        }
        return new PutResult(before.isEmpty(),projection(repository.mark(user,article,id).orElseThrow()));
    }
    @Transactional public void remove(UUID user,UUID article,UUID id){guard.acquire(user);if(repository.mark(user,article,id).isEmpty()&&repository.otherMark(user,article,id))throw new ApiException(404,"NOT_FOUND");repository.delete(user,article,id);}
    public record ImportItem(UUID articleId,UUID id,AnnotationInput annotation){}
    public record Import(UUID clientImportId,List<ImportItem> items){}
    @Transactional public Object importMarks(UUID user,Import input){
        guard.acquire(user);
        if(input.clientImportId()==null||input.items()==null||input.items().size()>200)throw new ApiException(422,"INVALID_IMPORT");
        return commands.execute(user.toString(),"/me/imports/annotations",input.clientImportId().toString(),input,()->{
            guard.acquire(user);var accepted=new ArrayList<UUID>();var rejected=new ArrayList<Object>();
            for(var item:input.items()){
                if(item==null||item.articleId()==null||item.id()==null){rejected.add(Map.of("code","INVALID_ANNOTATION"));continue;}
                try{
                    articles.requireForMutation(item.articleId());validate(item.articleId(),item.annotation());
                    if(repository.mark(user,item.articleId(),item.id()).isPresent())throw new ApiException(409,"ANNOTATION_EXISTS");if(repository.marks(user,item.articleId()).size()>=200)throw new ApiException(409,"ANNOTATION_LIMIT");
                    create(user,item.articleId(),item.id(),item.annotation());accepted.add(item.id());
                }catch(ApiException e){rejected.add(Map.of("id",item.id(),"code",e.code()));}
            }
            return Map.of("accepted",accepted,"rejected",rejected);
        });
    }
    private void create(UUID user,UUID article,UUID id,AnnotationInput input){repository.create(user,article,id,input.kind(),input.revisionId(),mapper.writeValueAsString(input.fragments()),input.note(),clock.instant());}
    private void validate(UUID article,AnnotationInput input){
        if(input==null||input.revisionId()==null)throw new ApiException(422,"INVALID_ANNOTATION");var revision=articles.revision(article,input.revisionId(),mapper);var text=new HashMap<String,String>();text.put("abstract",revision.abstractText());
        for(var block:revision.document().blocks()){
            // Text anchors are plain text, never markup; caption/table anchors are added by the renderer adapter.
            if(block.get("text") instanceof String value)text.put(block.get("id").toString(),value);
            else if(block.get("type").equals("image"))text.put(block.get("id").toString(),String.valueOf(block.get("caption")));
            else if(block.get("type").equals("table")){
                var rows=new ArrayList<String>();rows.add(((List<?>)block.get("columns")).stream().map(Object::toString).collect(java.util.stream.Collectors.joining("\t")));
                for(var row:(List<?>)block.get("rows"))rows.add(((List<?>)row).stream().map(Object::toString).collect(java.util.stream.Collectors.joining("\t")));text.put(block.get("id").toString(),String.join("\n",rows));
            }
        }
        input.validate(text::get);
    }
    private Object projection(ReadingRepository.Mark m){return Map.of("id",m.id(),"kind",m.kind(),"revisionId",m.revisionId(),"fragments",mapper.readTree(m.fragments()),"note",m.note(),"createdAt",m.createdAt(),"version",m.version());}
    public record VisitInput(UUID eventId,UUID articleId,UUID revisionId,Instant visitedAt){}
    @Transactional public void visit(UUID user,VisitInput input){
        guard.acquire(user);if(input.eventId()==null||input.articleId()==null||input.revisionId()==null||input.visitedAt()==null||input.visitedAt().isBefore(clock.instant().minusSeconds(86400))||input.visitedAt().isAfter(clock.instant().plusSeconds(300)))throw new ApiException(422,"INVALID_VISIT");
        articles.requireForMutation(input.articleId());articles.revision(input.articleId(),input.revisionId(),mapper);
        String hash=com.satir.identity.application.MembershipService.hash(mapper.writeValueAsString(input));var previous=repository.receipt(user,input.eventId());if(previous.isPresent()){if(!previous.get().equals(hash))throw new ApiException(409,"EVENT_ID_CONFLICT");return;}
        repository.visit(user,input.articleId(),input.eventId(),hash,input.visitedAt().isAfter(clock.instant())?clock.instant():input.visitedAt(),clock.instant());
    }
    public Object history(UUID user,int page,int size){if(page<0||page>1000||size<1||size>50)throw new ApiException(422,"INVALID_PAGINATION");long total=repository.count(user);var items=repository.history(user,page,size).stream().map(v->{var m=new LinkedHashMap<String,Object>();m.put("articleId",v.articleId());m.put("lastVisitedAt",v.lastVisitedAt());var article=articles.find(v.articleId());m.put("available",article.isPresent());m.put("article",article.orElse(null));return m;}).toList();return Map.of("items",items,"page",page,"size",size,"totalElements",total,"totalPages",(total+size-1)/size,"sort","visited_desc");}
    public Object seriesHistory(UUID user,UUID id){return Map.of("items",series.publicChapterIds(id).stream().filter(article->repository.lastVisit(user,article).isPresent()).map(article->Map.of("articleId",article,"lastVisitedAt",repository.lastVisit(user,article).orElseThrow())).toList());}
    public Optional<Instant> lastVisit(UUID user,UUID article){return repository.lastVisit(user,article);}
    @Transactional public void clearHistory(UUID user){guard.acquire(user);repository.clearHistory(user);}
}
