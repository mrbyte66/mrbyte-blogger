package com.satir.platform;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class Problems {
    public static Map<String,Object> body(int status, String code, String requestId, List<?> errors) {
        return Map.of("type", "urn:satir:problem:" + code.toLowerCase(java.util.Locale.ROOT).replace('_','-'), "title", "İşlem tamamlanamadı", "status", status, "code", code,
            "detail", "İsteği kontrol et veya daha sonra tekrar dene.", "requestId", requestId, "errors", errors);
    }
    private ResponseEntity<?> response(int status, String code, HttpServletRequest request, List<?> errors) {
        if(status==429) return ResponseEntity.status(status).header("Retry-After","3600").contentType(MediaType.APPLICATION_PROBLEM_JSON).body(body(status,code,String.valueOf(request.getAttribute("requestId")),errors));
        return ResponseEntity.status(status).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(body(status, code, String.valueOf(request.getAttribute("requestId")), errors));
    }
    @ExceptionHandler(ApiException.class) ResponseEntity<?> domain(ApiException e, HttpServletRequest r) { if(e.status()==429&&e.retryAfter()!=null)return ResponseEntity.status(429).header("Retry-After",e.retryAfter().toString()).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(body(429,e.code(),String.valueOf(r.getAttribute("requestId")),List.of()));return response(e.status(), e.code(), r, List.of()); }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> validation(MethodArgumentNotValidException e, HttpServletRequest r) {
        return response(422, "VALIDATION_FAILED", r, e.getBindingResult().getFieldErrors().stream().map(f -> Map.of("field", f.getField(), "code", "INVALID")).toList());
    }
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class) ResponseEntity<?> upload(org.springframework.web.multipart.MaxUploadSizeExceededException e,HttpServletRequest r){return response(413,"IMAGE_TOO_LARGE",r,List.of());}
    @ExceptionHandler(HttpMessageNotReadableException.class) ResponseEntity<?> malformed(HttpMessageNotReadableException e, HttpServletRequest r) { Throwable cause=e;
        while(cause!=null) {if(cause instanceof tools.jackson.databind.exc.UnrecognizedPropertyException)return response(422,"VALIDATION_FAILED",r,List.of());cause=cause.getCause();}
        return response(400, "MALFORMED_JSON", r, List.of()); }
    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class) ResponseEntity<?> method(org.springframework.web.HttpRequestMethodNotSupportedException e,HttpServletRequest r){return response(405,"METHOD_NOT_ALLOWED",r,List.of());}
    @ExceptionHandler(DataAccessException.class) ResponseEntity<?> dependency(DataAccessException e, HttpServletRequest r) { return response(503, "DATABASE_UNAVAILABLE", r, List.of()); }
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class) ResponseEntity<?> missing(org.springframework.web.servlet.resource.NoResourceFoundException e,HttpServletRequest r){return response(404,"NOT_FOUND",r,List.of());}
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class) ResponseEntity<?> type(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException e,HttpServletRequest r){return response(400,"INVALID_PARAMETER",r,List.of());}
    @ExceptionHandler(Exception.class) ResponseEntity<?> unexpected(Exception e, HttpServletRequest r) { return response(500, "INTERNAL_ERROR", r, List.of()); }
}
