package com.satir.editorial.api;

import com.satir.editorial.application.CategoryService;
import com.satir.platform.Preconditions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1")
public class CategoryController {
    private final CategoryService service;
    public CategoryController(CategoryService service){this.service=service;}
    public record Create(@NotBlank @Size(max=80)String name,@NotBlank @Size(max=100)String slug){}
    public record Patch(@Size(min=1,max=80)String name,@Size(min=1,max=100)String slug){}
    @GetMapping("/categories") public Object categories(){return service.list(false);}
    @GetMapping("/studio/categories") public Object studio(){return service.list(true);}
    @PostMapping("/studio/categories") @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication auth,@RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody Create input){return service.create(auth.getName(),key,input.name(),input.slug());}
    @PatchMapping("/studio/categories/{id}") public Object update(@PathVariable UUID id,@RequestHeader(value="If-Match",required=false)String version,@Valid @RequestBody Patch input){return service.update(id,Preconditions.version(version),input.name(),input.slug());}
    @DeleteMapping("/studio/categories/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)public void delete(@PathVariable UUID id,@RequestHeader(value="If-Match",required=false)String version){service.delete(id,Preconditions.version(version));}
}
