package com.satir.reading.api;

import com.satir.reading.application.ReadingService;
import com.satir.reading.domain.AnnotationInput;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/me")
public class ReadingController {
    private final ReadingService service;
    public ReadingController(ReadingService service){this.service=service;}
    private UUID user(Authentication auth){return UUID.fromString(auth.getName());}
    @GetMapping("/articles/{id}/annotations") public Object marks(Authentication auth,@PathVariable UUID id){return service.annotations(user(auth),id);}
    @PutMapping("/articles/{id}/annotations/{markId}") public ResponseEntity<?> put(Authentication auth,@PathVariable UUID id,@PathVariable UUID markId,@RequestHeader(value="If-Match",required=false)String version,@RequestHeader(value="If-None-Match",required=false)String creating,@RequestBody AnnotationInput input){var result=service.put(user(auth),id,markId,creating,version,input);return ResponseEntity.status(result.created()?HttpStatus.CREATED:HttpStatus.OK).body(result.mark());}
    @DeleteMapping("/articles/{id}/annotations/{markId}") @ResponseStatus(HttpStatus.NO_CONTENT) public void remove(Authentication auth,@PathVariable UUID id,@PathVariable UUID markId){service.remove(user(auth),id,markId);}
    @PostMapping("/imports/annotations") public Object importMarks(Authentication auth,@RequestBody ReadingService.Import input){return service.importMarks(user(auth),input);}
    @PostMapping("/visits") @ResponseStatus(HttpStatus.NO_CONTENT) public void visit(Authentication auth,@RequestBody ReadingService.VisitInput input){service.visit(user(auth),input);}
    @GetMapping("/history") public Object history(Authentication auth,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size){return service.history(user(auth),page,size);}
    @GetMapping("/series/{id}/history") public Object series(Authentication auth,@PathVariable UUID id){return service.seriesHistory(user(auth),id);}
    @DeleteMapping("/history") @ResponseStatus(HttpStatus.NO_CONTENT) public void clear(Authentication auth){service.clearHistory(user(auth));}
}
