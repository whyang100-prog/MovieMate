package com.moviemate.controller;

import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    ResponseEntity<?> login(org.springframework.security.core.AuthenticationException e) {return ResponseEntity.status(401).body(Map.of("message","아이디 또는 비밀번호를 확인하세요."));}
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<?> invalid(IllegalArgumentException error) {return ResponseEntity.badRequest().body(Map.of("message",error.getMessage()));}
    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<?> duplicate(DuplicateKeyException error) {return ResponseEntity.status(409).body(Map.of("message","이미 사용 중인 아이디 또는 데이터입니다."));}
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException error) {return ResponseEntity.status(error.getStatusCode()).body(Map.of("message",error.getReason()==null?"요청을 처리할 수 없습니다.":error.getReason()));}
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> body(HttpMessageNotReadableException error) {return ResponseEntity.badRequest().body(Map.of("message","입력 데이터 형식을 확인하세요."));}
}
