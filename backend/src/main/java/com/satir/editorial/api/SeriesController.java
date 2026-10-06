package com.satir.editorial.api;

import com.satir.editorial.application.SeriesInput;
import com.satir.editorial.application.SeriesService;
import com.satir.editorial.application.ArticleService;
import com.satir.platform.Preconditions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SeriesController {
    private final SeriesService service;
    private final ArticleService articles;
    public SeriesController(SeriesService service,ArticleService articles){this.service=service;this.articles=articles;}
    @GetMapping("/series") public Object catalog(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size,@RequestParam(required=false)String q,@RequestParam(defaultValue="title_asc")String sort){return service.list(false,null,q,page,size,sort);}
    @GetMapping("/series/by-slug/{slug}") public Object detail(@PathVariable String slug){return service.bySlug(slug);}
    @GetMapping("/series/{id}/chapters") public Object chapters(@PathVariable UUID id,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size){return service.chapters(id,page,size,articles::summary);}
    @GetMapping("/studio/series") public Object studio(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size,@RequestParam(required=false)String q,@RequestParam(required=false)String status,@RequestParam(defaultValue="title_asc")String sort){return service.list(true,status,q,page,size,sort);}
    @GetMapping("/studio/series/{id}") public ResponseEntity<?> edit(@PathVariable UUID id){var result=service.edit(id);return ResponseEntity.ok().eTag(result.get("version").toString()).body(result);}
    @PostMapping("/studio/series") public ResponseEntity<?> create(Authentication auth,@RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody SeriesInput input){var result=service.create(UUID.fromString(auth.getName()),key,input);return ResponseEntity.status(HttpStatus.CREATED).body(result);}
    @PutMapping("/studio/series/{id}") public Object update(@PathVariable UUID id,@RequestHeader(value="If-Match",required=false)String version,@Valid @RequestBody SeriesInput input){return service.update(id,Preconditions.version(version),input);}
    public record Action(@NotBlank String action){}
    @PostMapping("/studio/series/{id}/actions") public Object action(Authentication auth,@PathVariable UUID id,@RequestHeader(value="Idempotency-Key",required=false)String key,@RequestHeader(value="If-Match",required=false)String version,@Valid @RequestBody Action input){return service.action(UUID.fromString(auth.getName()),id,key,Preconditions.version(version),input.action());}
    @DeleteMapping("/studio/series/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id,@RequestHeader(value="If-Match",required=false)String version){service.trash(id,Preconditions.version(version));}
}
