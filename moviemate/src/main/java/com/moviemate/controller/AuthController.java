package com.moviemate.controller;

import java.util.Map;
import com.moviemate.security.MemberStore;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final MemberStore members;
    private final PasswordEncoder encoder;
    private final org.springframework.security.authentication.AuthenticationManager manager;
    private final com.moviemate.security.TokenService tokens;
    public AuthController(MemberStore members, PasswordEncoder encoder, org.springframework.security.authentication.AuthenticationManager manager, com.moviemate.security.TokenService tokens) {this.members=members;this.encoder=encoder;this.manager=manager;this.tokens=tokens;}
    public record LoginRequest(String username,String password) {}
    @PostMapping("/login") public Map<String,Object> login(@RequestBody LoginRequest input, jakarta.servlet.http.HttpServletResponse response) {
        String username=MemberStore.username(input.username());
        manager.authenticate(org.springframework.security.authentication.UsernamePasswordAuthenticationToken.unauthenticated(username,input.password()));
        return tokens.login(username,response);
    }
    @PostMapping("/refresh") public Map<String,Object> refresh(@CookieValue(name="MM_REFRESH",required=false) String cookie,jakarta.servlet.http.HttpServletResponse response) {return tokens.refresh(cookie,response);}
    @PostMapping("/logout") public Map<String,String> logout(@CookieValue(name="MM_REFRESH",required=false) String cookie,jakarta.servlet.http.HttpServletResponse response,Authentication auth) {String sid=auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken token ? token.getToken().getClaimAsString("sid") : null; tokens.logout(cookie,sid,response);return Map.of("message","로그아웃되었습니다.");}
    public record RegisterRequest(String username,String password,String nickname) {}
    @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token) {
        return Map.of("token",token.getToken(),"headerName",token.getHeaderName());
    }
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    public Map<String,String> register(@RequestBody RegisterRequest input) {
        String username=MemberStore.username(input.username());
        MemberStore.password(input.password());
        String nickname=MemberStore.nickname(input.nickname());
        members.create(username,encoder.encode(input.password()),nickname,"USER");
        return Map.of("message","회원가입이 완료됐어요. 로그인해 주세요.");
    }
    @GetMapping("/me") public Map<String,Object> me(Authentication authentication) {
        var m=members.current(authentication);
        return Map.of("id",m.id(),"username",m.username(),"nickname",m.nickname(),"role",m.role());
    }
}
