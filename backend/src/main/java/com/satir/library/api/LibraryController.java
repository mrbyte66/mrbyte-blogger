package com.satir.library.api;

import com.satir.library.application.LibraryService;
import com.satir.platform.Preconditions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
public class LibraryController {
    private final LibraryService service;
    public LibraryController(LibraryService service){this.service=service;}
    public record Name(@NotBlank @Size(max=60)String name){}
    public record Save(UUID collectionId){}
    private UUID user(Authentication auth){return UUID.fromString(auth.getName());}
    @GetMapping("/collections") public Object collections(Authentication auth){return service.collections(user(auth));}
    @PostMapping("/collections") public ResponseEntity<?> create(Authentication auth,@RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody Name input){return ResponseEntity.status(HttpStatus.CREATED).body(service.create(user(auth),key,input.name()));}
    @PatchMapping("/collections/{id}") public Object rename(Authentication auth,@PathVariable UUID id,@RequestHeader(value="If-Match",required=false)String version,@Valid @RequestBody Name input){return service.rename(user(auth),id,Preconditions.version(version),input.name());}
    @DeleteMapping("/collections/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(Authentication auth,@PathVariable UUID id,@RequestHeader(value="If-Match",required=false)String version){service.delete(user(auth),id,Preconditions.version(version));}
    @GetMapping("/bookmarks") public Object list(Authentication auth,@RequestParam(required=false)UUID collectionId,@RequestParam(required=false)String q,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size,@RequestParam(defaultValue="saved_asc")String sort){return service.list(user(auth),collectionId,q,page,size,sort);}
    @PutMapping("/bookmarks/{articleId}") public Object save(Authentication auth,@PathVariable UUID articleId,@RequestBody Save input){return service.save(user(auth),articleId,input.collectionId());}
    @DeleteMapping("/bookmarks/{articleId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void remove(Authentication auth,@PathVariable UUID articleId){service.remove(user(auth),articleId);}
    @GetMapping("/article-state") public Object state(Authentication auth,@RequestParam List<UUID> ids){return service.state(user(auth),ids);}
}
