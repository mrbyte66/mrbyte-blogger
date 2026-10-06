package com.satir.editorial.api;

import com.satir.editorial.application.ArticleService;
import com.satir.editorial.application.ArticleInput;
import com.satir.platform.Preconditions;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1")
public class ArticleController {
    private final ArticleService service;
    public ArticleController(ArticleService service){this.service=service;}
    @GetMapping("/articles") public Object catalog(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size,@RequestParam(defaultValue="date_desc")String sort,@RequestParam(required=false)String q,@RequestParam(required=false)UUID categoryId){return service.list(page,size,sort,false,null,null,null,categoryId,q);}
    @GetMapping("/articles/by-slug/{slug}") public Object detail(@PathVariable String slug){return service.bySlug(slug);}
    @GetMapping("/studio/articles") public Object studio(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size,@RequestParam(required=false)String sort,@RequestParam(required=false)String q,@RequestParam(required=false)String status,@RequestParam(required=false)String visibility,@RequestParam(required=false)UUID seriesId){return service.list(page,size,sort,true,status,visibility,seriesId,null,q);}
    @GetMapping("/studio/articles/{id}") public ResponseEntity<?> edit(@PathVariable UUID id){var result=service.edit(id);return ResponseEntity.ok().eTag(result.get("version").toString()).body(result);}
    @PostMapping("/studio/articles") public ResponseEntity<?> create(Authentication auth,@RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody ArticleInput input){var result=service.create(UUID.fromString(auth.getName()),key,input);return ResponseEntity.status(HttpStatus.CREATED).header("Location","/api/v1/studio/articles/"+result.get("id").asText()).body(result);}
    @PutMapping("/studio/articles/{id}") public Object update(@PathVariable UUID id,@RequestHeader(value="If-Match",required=false)String version,@Valid @RequestBody ArticleInput input){return service.update(id,Preconditions.version(version),input);}
    @DeleteMapping("/studio/articles/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id,@RequestHeader(value="If-Match",required=false)String version){service.trash(id,Preconditions.version(version));}
    @PostMapping("/studio/articles/{id}/actions") public Object action(Authentication auth,@PathVariable UUID id,@RequestHeader(value="If-Match",required=false)String version,@RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody ArticleService.Action action){return service.action(id,UUID.fromString(auth.getName()),key,Preconditions.version(version),action);}
}
