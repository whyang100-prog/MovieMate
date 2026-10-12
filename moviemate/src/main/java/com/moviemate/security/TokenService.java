package com.moviemate.security;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import java.sql.Timestamp;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TokenService {
    private final JdbcTemplate jdbc; private final MemberStore members;
    private final JwtEncoder encoder; private final boolean secure;
    private final SecureRandom random=new SecureRandom();
    public TokenService(JdbcTemplate jdbc,MemberStore members,JwtEncoder encoder,
        @Value("${moviemate.jwt.secure-cookie:false}") boolean secure){this.jdbc=jdbc;this.members=members;this.encoder=encoder;this.secure=secure;}
    private String secret(){byte[] bytes=new byte[32];random.nextBytes(bytes);return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);}
    private String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    private void cookie(HttpServletResponse response,String value,long seconds){response.addHeader(HttpHeaders.SET_COOKIE,ResponseCookie.from("MM_REFRESH",value).httpOnly(true).secure(secure).sameSite("Strict").path("/api/auth").maxAge(seconds).build().toString());}
    private Map<String,Object> access(MemberStore.Member m,String sid){
        Instant now=Instant.now();
        var claims=JwtClaimsSet.builder().issuer("moviemate").subject(m.username()).audience(List.of("moviemate-api"))
            .issuedAt(now).expiresAt(now.plusSeconds(900)).claim("uid",m.id()).claim("sid",sid).build();
        String token=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
        return Map.of("accessToken",token,"expiresIn",900,"user",Map.of("id",m.id(),"username",m.username(),"nickname",m.nickname(),"role",m.role()));
    }
    @Transactional public Map<String,Object> login(String username,HttpServletResponse response){
        var m=members.find(username);String sid=UUID.randomUUID().toString(),value=sid+"."+secret();
        jdbc.update("DELETE FROM MM_AUTH_SESSION WHERE expires_at<CURRENT_TIMESTAMP");
        jdbc.update("INSERT INTO MM_AUTH_SESSION(session_id,member_id,refresh_hash,expires_at) VALUES(?,?,?,?)",sid,m.id(),hash(value),Timestamp.from(Instant.now().plusSeconds(604800)));
        cookie(response,value,604800);return access(m,sid);
    }
    @Transactional public Map<String,Object> refresh(String value,HttpServletResponse response){
        if(value==null||!value.matches("[a-f0-9-]{36}\\.[A-Za-z0-9_-]{43}")) throw denied();
        String sid=value.substring(0,36);
        var rows=jdbc.query("SELECT member_id,refresh_hash,expires_at FROM MM_AUTH_SESSION WHERE session_id=? FOR UPDATE",(rs,n)->new Object[]{rs.getLong(1),rs.getString(2),rs.getTimestamp(3)},sid);
        if(rows.isEmpty()) throw denied();Object[] row=rows.get(0);
        if(!MessageDigest.isEqual(hash(value).getBytes(StandardCharsets.UTF_8),((String)row[1]).getBytes(StandardCharsets.UTF_8)) || ((Timestamp)row[2]).toInstant().isBefore(Instant.now())) throw denied();
        var names=jdbc.queryForList("SELECT username FROM MM_MEMBER WHERE member_id=? AND enabled=1",String.class,row[0]);
        if(names.isEmpty())throw denied();String username=names.get(0);
        var m=members.find(username);if(m==null||!m.enabled())throw denied();
        String next=sid+"."+secret();
        jdbc.update("UPDATE MM_AUTH_SESSION SET refresh_hash=? WHERE session_id=?",hash(next),sid);
        long remaining=Math.max(0,Duration.between(Instant.now(),((Timestamp)row[2]).toInstant()).getSeconds());
        cookie(response,next,remaining);return access(m,sid);
    }
    public boolean valid(String sid,long member){return jdbc.queryForObject("SELECT COUNT(*) FROM MM_AUTH_SESSION WHERE session_id=? AND member_id=? AND expires_at>CURRENT_TIMESTAMP",Integer.class,sid,member)>0;}
    public void logout(String value,String sid,HttpServletResponse response){
        if(sid!=null)jdbc.update("DELETE FROM MM_AUTH_SESSION WHERE session_id=?",sid);
        if(value!=null && value.length()>37)jdbc.update("DELETE FROM MM_AUTH_SESSION WHERE session_id=? AND refresh_hash=?",value.substring(0,36),hash(value));
        cookie(response,"",0);
    }
    private ResponseStatusException denied(){return new ResponseStatusException(HttpStatus.UNAUTHORIZED,"로그인이 만료됐어요. 다시 로그인해 주세요.");}
}
