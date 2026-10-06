package com.satir.editorial.application;

import com.satir.editorial.infrastructure.CategoryRepository;
import com.satir.platform.ApiException;
import com.satir.platform.IdempotentCommands;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class CategoryService {
    private final CategoryRepository repository;private final IdempotentCommands commands;
    public CategoryService(CategoryRepository repository,IdempotentCommands commands){this.repository=repository;this.commands=commands;}
    public boolean exists(UUID id){return repository.find(id).isPresent();}
    public Object list(boolean owner){return Map.of("items",owner?repository.list(true):repository.list(false).stream().map(c->Map.of("id",c.id(),"slug",c.slug(),"name",c.name())).toList());}
    public Object create(String principal,String key,String name,String slug){return commands.execute(principal,"/studio/categories",key,Map.of("name",name,"slug",slug),()->{
        validate(name,slug);try{return repository.create(UUID.randomUUID(),name.trim(),slug);}catch(org.springframework.dao.DuplicateKeyException e){throw new ApiException(409,"CATEGORY_CONFLICT");}
    });}
    @Transactional public Object update(UUID id,long version,String name,String slug){
        var current=repository.find(id).orElseThrow(()->new ApiException(404,"NOT_FOUND"));if(current.version()!=version)throw new ApiException(412,"STALE_VERSION");
        String newName=name==null?current.name():name.trim(),newSlug=slug==null?current.slug():slug;validate(newName,newSlug);
        try{if(!repository.update(id,version,newName,newSlug))throw new ApiException(412,"STALE_VERSION");}catch(org.springframework.dao.DuplicateKeyException e){throw new ApiException(409,"CATEGORY_CONFLICT");}
        return repository.find(id).orElseThrow();
    }
    @Transactional public void delete(UUID id,long version){
        var existing=repository.find(id);if(existing.isEmpty())return;if(existing.get().version()!=version)throw new ApiException(412,"STALE_VERSION");
        try{repository.delete(id);}catch(org.springframework.dao.DataIntegrityViolationException e){throw new ApiException(409,"CATEGORY_IN_USE");}
    }
    private void validate(String name,String slug){if(name==null||name.isBlank()||name.length()>80||slug==null||slug.length()>100||!slug.matches("[a-z0-9]+(-[a-z0-9]+)*"))throw new ApiException(422,"INVALID_CATEGORY");}
}
