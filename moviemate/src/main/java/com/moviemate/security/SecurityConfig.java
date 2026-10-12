package com.moviemate.security;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.crypto.spec.SecretKeySpec;
import javax.crypto.SecretKey;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import com.nimbusds.jose.jwk.source.ImmutableSecret;

@Configuration
public class SecurityConfig {
    public static void json(HttpServletResponse r,int status,String body)throws IOException{r.setStatus(status);r.setContentType("application/json;charset=UTF-8");r.getWriter().write(body);}
    @Bean SecretKey jwtKey(@Value("${moviemate.jwt.secret}") String value){
        byte[] key=Base64.getDecoder().decode(value);
        if(key.length<32)throw new IllegalArgumentException("MOVIEMATE_JWT_SECRET은 32바이트 이상 난수의 Base64 값이어야 합니다.");
        return new SecretKeySpec(key,"HmacSHA256");
    }
    @Bean JwtEncoder jwtEncoder(SecretKey key){return new NimbusJwtEncoder(new ImmutableSecret<>(key));}
    @Bean JwtDecoder jwtDecoder(SecretKey key){
        var decoder=NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> audience=jwt->jwt.getAudience().contains("moviemate-api") ? OAuth2TokenValidatorResult.success() : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer("moviemate"),audience));return decoder;
    }
    @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder(12);}
    @Bean UserDetailsService users(MemberStore members){return name->{var m=members.find(name);if(m==null)throw new UsernameNotFoundException("회원 없음");return User.withUsername(m.username()).password(m.passwordHash()).roles(m.role()).disabled(!m.enabled()).build();};}
    @Bean AuthenticationManager authenticationManager(UserDetailsService users,PasswordEncoder encoder){var p=new DaoAuthenticationProvider(users);p.setPasswordEncoder(encoder);return new ProviderManager(p);}
    @Bean SecurityFilterChain security(HttpSecurity http,MemberStore members,TokenService tokens,
        @Value("${moviemate.jwt.secure-cookie:false}") boolean secure)throws Exception{
        var csrf=new CookieCsrfTokenRepository();
        csrf.setCookieCustomizer(cookie->cookie.httpOnly(true).secure(secure).sameSite("Strict").path("/"));
        http.csrf(c->c.csrfTokenRepository(csrf));
        http.sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.formLogin(f->f.disable()).httpBasic(b->b.disable()).logout(l->l.disable());
        http.requestCache(c->c.disable());
        http.authorizeHttpRequests(a->a
            .requestMatchers(HttpMethod.GET,"/api/auth/csrf").permitAll()
            .requestMatchers(HttpMethod.POST,"/api/auth/register","/api/auth/login","/api/auth/refresh","/api/auth/logout").permitAll()
            .requestMatchers("/error").permitAll()
            .requestMatchers("/api/admin/**").hasRole("ADMIN")
            .requestMatchers("/api/**").authenticated().anyRequest().denyAll());
        http.oauth2ResourceServer(o->o.jwt(j->j.jwtAuthenticationConverter(jwt->{
            var m=members.find(jwt.getSubject());
            String sid=jwt.getClaimAsString("sid");
            Number uid=jwt.getClaim("uid");
            if(m==null||!m.enabled()||uid==null||m.id()!=uid.longValue()||sid==null||!tokens.valid(sid,m.id()))
                throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"));
            return new JwtAuthenticationToken(jwt,List.of(new SimpleGrantedAuthority("ROLE_"+m.role())),m.username());
        })).authenticationEntryPoint((q,r,e)->json(r,401,"{\"message\":\"로그인이 필요합니다.\"}")));
        http.exceptionHandling(e->e.authenticationEntryPoint((q,r,x)->json(r,401,"{\"message\":\"로그인이 필요합니다.\"}"))
            .accessDeniedHandler((q,r,x)->json(r,403,"{\"message\":\"권한 또는 보안 토큰을 확인하세요.\"}")));
        return http.build();
    }
}
