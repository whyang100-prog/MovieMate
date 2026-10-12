package com.moviemate.controller;

import java.io.StringReader;
import java.sql.Types;
import java.util.*;
import com.moviemate.security.MemberStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final JdbcTemplate jdbc; private final MemberStore members;
    public AdminController(JdbcTemplate jdbc,MemberStore members) {this.jdbc=jdbc;this.members=members;}
    @GetMapping("/members") public List<Map<String,Object>> users() {
        return jdbc.query("SELECT member_id,username,nickname,role,enabled FROM MM_MEMBER ORDER BY member_id",(rs,n)->Map.<String,Object>of("id",rs.getLong(1),"username",rs.getString(2),"nickname",rs.getString(3),"role",rs.getString(4),"enabled",rs.getInt(5)==1));
    }
    public record StatusInput(boolean enabled) {}
    private void ordinary(long id) {
        var roles=jdbc.queryForList("SELECT role FROM MM_MEMBER WHERE member_id=?",String.class,id);
        if(roles.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"회원을 찾을 수 없습니다.");
        if(!roles.get(0).equals("USER")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"관리자 계정은 이 화면에서 삭제하거나 정지할 수 없습니다.");
    }
    @PutMapping("/members/{id}/status") public void status(@PathVariable long id,@RequestBody StatusInput input) {
        ordinary(id); jdbc.update("UPDATE MM_MEMBER SET enabled=? WHERE member_id=?",input.enabled()?1:0,id);
    }
    @DeleteMapping("/members/{id}") public void deleteMember(@PathVariable long id) {
        ordinary(id);jdbc.update("DELETE FROM MM_MEMBER WHERE member_id=?",id);
    }
    @GetMapping("/reviews") public List<Map<String,Object>> reviews() {
        return jdbc.query("""
            SELECT p.member_id,p.movie_id,u.nickname,m.title,p.rating,p.review
            FROM MM_MEMBER_MOVIE p JOIN MM_MEMBER u ON u.member_id=p.member_id
            JOIN MM_MOVIE m ON m.movie_id=p.movie_id WHERE p.rating>0 OR p.review IS NOT NULL
            ORDER BY p.reviewed_at DESC
            """,(rs,n)->Map.<String,Object>of("memberId",rs.getLong(1),"movieId",rs.getLong(2),"nickname",rs.getString(3),"title",rs.getString(4),"rating",rs.getInt(5),"review",Objects.toString(rs.getString(6),"")));
    }
    @DeleteMapping("/reviews/{memberId}/{movieId}") @Transactional public void deleteReview(@PathVariable long memberId,@PathVariable long movieId) {
        jdbc.queryForList("SELECT member_id FROM MM_MEMBER_MOVIE WHERE member_id=? AND movie_id=? FOR UPDATE",Long.class,memberId,movieId);
        jdbc.update("DELETE FROM MM_REVIEW_COMMENT WHERE review_member_id=? AND movie_id=?",memberId,movieId);
        jdbc.update("UPDATE MM_MEMBER_MOVIE SET rating=0,review=NULL,reviewed_at=NULL,review_status='PENDING',review_revision=review_revision+1,rejection_note=NULL,moderated_at=NULL WHERE member_id=? AND movie_id=?",memberId,movieId);
    }
    public record MovieInput(String title,String year,String summary,String image,String fit,String genre) {}
    private int validate(MovieInput input) {
        if(input.title()==null||input.title().isBlank()||input.title().length()>200) throw new IllegalArgumentException("영화 제목은 1~200자입니다.");
        int year;
        try {year=Integer.parseInt(input.year());}catch(Exception e){throw new IllegalArgumentException("개봉연도를 숫자로 입력하세요.");}
        if(year<1888||year>2100) throw new IllegalArgumentException("개봉연도는 1888~2100입니다.");
        if(!List.of("contain","cover").contains(input.fit())) throw new IllegalArgumentException("이미지 표시 방식을 확인하세요.");
        if(input.summary()!=null&&input.summary().length()>10000) throw new IllegalArgumentException("소개는 10000자 이하입니다.");
        String image=input.image()==null?"":input.image();
        if(image.length()>11200000) throw new IllegalArgumentException("이미지는 8MB 이하로 선택하세요.");
        if(!image.isEmpty()&&!image.matches("(?s)data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+")
            &&!image.matches("https?://[^\\s]+")&&!image.matches("/[^/].*")) throw new IllegalArgumentException("이미지 URL 또는 업로드 사진을 확인하세요.");
        return year;
    }
    @PostMapping("/movies") @Transactional
    public Map<String,Object> create(@RequestBody MovieInput input) {
        int year=validate(input);String code="U"+UUID.randomUUID().toString().replace("-","").substring(0,19);
        jdbc.update("INSERT INTO MM_MOVIE(catalog_code,title,release_year) VALUES(?,?,?)",code,input.title().trim(),year);
        long id=jdbc.queryForObject("SELECT movie_id FROM MM_MOVIE WHERE catalog_code=?",Long.class,code);
        writeMovie(id,input,year);return Map.of("id",id);
    }
    @PutMapping("/movies/{id}") @Transactional
    public void edit(@PathVariable long id,@RequestBody MovieInput input) {writeMovie(id,input,validate(input));}
    private void writeMovie(long id,MovieInput input,int year) {
        var found=jdbc.queryForList("SELECT movie_id FROM MM_MOVIE WHERE movie_id=? AND is_active='Y'",Long.class,id);
        if(found.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"영화를 찾을 수 없습니다.");
        jdbc.update(connection->{var ps=connection.prepareStatement("UPDATE MM_MOVIE SET title=?,release_year=?,synopsis=?,image_fit=?,updated_at=SYSTIMESTAMP WHERE movie_id=?");
            ps.setString(1,input.title().trim());ps.setInt(2,year);ps.setCharacterStream(3,new StringReader(Objects.toString(input.summary(),"")));ps.setString(4,input.fit());ps.setLong(5,id);return ps;});
        var codes=jdbc.queryForList("SELECT genre_code FROM MM_GENRE WHERE genre_name=?",String.class,input.genre());
        if(codes.isEmpty()) throw new IllegalArgumentException("등록된 장르를 선택하세요.");
        // 대표 장르를 바꾼 경우만 장르 연결을 교체. 그대로면 기존 복수 장르 유지.
        var current=jdbc.queryForList("SELECT genre_code FROM MM_MOVIE_GENRE WHERE movie_id=? AND genre_order=1",String.class,id);
        if(current.isEmpty()||!current.get(0).equals(codes.get(0))) {
            jdbc.update("DELETE FROM MM_MOVIE_GENRE WHERE movie_id=?",id);
            jdbc.update("INSERT INTO MM_MOVIE_GENRE(movie_id,genre_code,genre_order) VALUES(?,?,1)",id,codes.get(0));
        }
        jdbc.update("DELETE FROM MM_MOVIE_MEDIA WHERE movie_id=?",id);
        // 빈 문자열도 CLOB로 저장하여 기존 poster_url로 되돌아가지 않도록 함
        jdbc.update(connection->{var ps=connection.prepareStatement("INSERT INTO MM_MOVIE_MEDIA(movie_id,image_data) VALUES(?,?)");
            ps.setLong(1,id);String image=Objects.toString(input.image(),"");ps.setCharacterStream(2,new StringReader(image),image.length());return ps;});
        if(input.image()==null||input.image().isEmpty()) jdbc.update("UPDATE MM_MOVIE SET poster_url=NULL WHERE movie_id=?",id);
    }
    @DeleteMapping("/movies/{id}") public void deleteMovie(@PathVariable long id) {
        // 목록에서 숨기고 회원 기록은 보존하는 비활성화 삭제
        int count=jdbc.update("UPDATE MM_MOVIE SET is_active='N',updated_at=SYSTIMESTAMP WHERE movie_id=? AND is_active='Y'",id);
        if(count==0) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"영화를 찾을 수 없습니다.");
    }
}
