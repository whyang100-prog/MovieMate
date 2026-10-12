package com.moviemate.security;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private final MemberStore members;
    private final PasswordEncoder encoder;
    private final String username;
    private final String password;
    public AdminBootstrap(MemberStore members, PasswordEncoder encoder,
            @Value("${moviemate.bootstrap.username:}") String username,
            @Value("${moviemate.bootstrap.password:}") String password) {
        this.members=members; this.encoder=encoder; this.username=username; this.password=password;
    }
    @Override public void run(ApplicationArguments args) {
        if (username.isBlank() && password.isBlank()) return;
        String name=MemberStore.username(username);
        var existing=members.find(name);
        if (existing != null) {
            if (!existing.role().equals("ADMIN")) throw new IllegalStateException("관리자 ID가 일반 회원과 중복됩니다. 다른 ID를 사용하세요.");
            return; // 기존 계정의 암호/권한을 변경하지 않음
        }
        MemberStore.password(password);
        members.create(name,encoder.encode(password),"관리자","ADMIN");
    }
}
