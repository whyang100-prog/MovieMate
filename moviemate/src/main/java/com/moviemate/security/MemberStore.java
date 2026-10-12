package com.moviemate.security;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Repository
public class MemberStore {
    private final JdbcTemplate jdbc;
    public MemberStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public record Member(long id, String username, String passwordHash, String nickname, String role, boolean enabled) {}
    public Member find(String username) {
        return jdbc.query("SELECT member_id,username,password_hash,nickname,role,enabled FROM MM_MEMBER WHERE username=?",
            (rs,n) -> new Member(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5),rs.getInt(6)==1),
            username).stream().findFirst().orElse(null);
    }
    public Member current(Authentication auth) {
        Member m = auth == null ? null : find(auth.getName());
        if (m == null || !m.enabled()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"로그인이 필요합니다.");
        return m;
    }
    public static String username(String value) {
        String s = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (!s.matches("[a-z0-9_]{4,30}")) throw new IllegalArgumentException("아이디는 영문 소문자·숫자·밑줄 4~30자입니다.");
        return s;
    }
    public static void password(String value) {
        if (value == null || value.length() < 10 || value.getBytes(StandardCharsets.UTF_8).length > 72)
            throw new IllegalArgumentException("비밀번호는 10자 이상, UTF-8 기준 72바이트 이하로 입력하세요.");
    }
    public static String nickname(String value) {
        String s = value == null ? "" : value.trim();
        if (s.isEmpty() || s.length() > 30) throw new IllegalArgumentException("닉네임은 1~30자입니다.");
        return s;
    }
    public void create(String username, String hash, String nickname, String role) {
        jdbc.update("INSERT INTO MM_MEMBER(username,password_hash,nickname,role) VALUES(?,?,?,?)",username,hash,nickname,role);
    }
}
