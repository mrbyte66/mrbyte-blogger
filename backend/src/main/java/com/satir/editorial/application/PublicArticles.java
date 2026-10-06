package com.satir.editorial.application;

import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.platform.ApiException;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Public-only application boundary for reading, library and engagement modules. */
@Service
public class PublicArticles {
    private final ArticleRepository repository;
    private final ArticleService articles;
    private final com.satir.editorial.infrastructure.EditorialWriteLock writeLock;
    public PublicArticles(ArticleRepository repository,ArticleService articles,com.satir.editorial.infrastructure.EditorialWriteLock writeLock){this.repository=repository;this.articles=articles;this.writeLock=writeLock;}
    public Optional<Map<String,Object>> find(UUID id){return repository.publicById(id).map(articles::summary);}
    @org.springframework.transaction.annotation.Transactional(propagation=org.springframework.transaction.annotation.Propagation.MANDATORY)
    public Map<String,Object> requireForMutation(UUID id){writeLock.acquire();return require(id);}
    public record Revision(UUID currentRevisionId,String abstractText,com.satir.editorial.domain.ContentDocument document){}
    public Revision revision(UUID article,UUID revision,tools.jackson.databind.ObjectMapper mapper){
        var current=repository.publicById(article).orElseThrow(()->new ApiException(404,"NOT_FOUND"));
        String content=repository.revisionContent(article,revision).orElseThrow(()->new ApiException(422,"INVALID_REVISION"));var input=mapper.readValue(content,ArticleInput.class);
        return new Revision(current.revision(),input.abstractText(),input.document());
    }
    public UUID currentRevision(UUID article){return repository.publicById(article).orElseThrow(()->new ApiException(404,"NOT_FOUND")).revision();}
    public long views(UUID id){return repository.views(id);}
    public void incrementViews(UUID id){repository.incrementViews(id);}
    public Map<String,Object> require(UUID id){return find(id).orElseThrow(()->new ApiException(404,"NOT_FOUND"));}
}
