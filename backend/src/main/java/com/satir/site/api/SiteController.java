package com.satir.site.api;

import com.satir.site.application.SiteService;
import com.satir.site.domain.ThemeDocument;
import com.satir.platform.Preconditions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SiteController {
    private final SiteService service;
    public SiteController(SiteService service){this.service=service;}
    @GetMapping("/site") public Object site(){return service.publicSite();}
    @GetMapping("/seo/urls") public Object urls(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="50")int size){return service.urls(page,size);}
    @GetMapping("/studio/site") public Object settings(){return service.settings();}
    @PatchMapping("/studio/site") public Object settings(@RequestHeader(value="If-Match",required=false)String version,@Valid @RequestBody SiteService.Patch patch){return service.settings(Preconditions.version(version),patch);}
    @GetMapping("/studio/theme") public Object workspace(){return service.workspace();}
    @PutMapping("/studio/theme/draft") public Object draft(@RequestHeader(value="If-Match",required=false)String version,@RequestBody ThemeDocument theme){return service.draft(Preconditions.version(version),theme);}
    public record Apply(@NotNull UUID draftRevisionId){}
    @PostMapping("/studio/theme/apply") public Object apply(Authentication auth,@RequestHeader(value="If-Match",required=false)String version,@RequestHeader(value="Idempotency-Key",required=false)String key,@Valid @RequestBody Apply input){return service.apply(UUID.fromString(auth.getName()),key,Preconditions.version(version),input.draftRevisionId());}
    @PostMapping("/studio/theme/restore") public Object restore(Authentication auth,@RequestHeader(value="If-Match",required=false)String version,@RequestHeader(value="Idempotency-Key",required=false)String key){return service.restore(UUID.fromString(auth.getName()),key,Preconditions.version(version));}
}
