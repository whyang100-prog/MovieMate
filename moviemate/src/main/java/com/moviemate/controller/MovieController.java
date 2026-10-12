package com.moviemate.controller;

import java.util.*;
import com.moviemate.security.MemberStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/movies")
public class MovieController {
    private final JdbcTemplate jdbc;
    private final MemberStore members;
    public MovieController(JdbcTemplate jdbc, MemberStore members) {this.jdbc=jdbc;this.members=members;}
    @GetMapping public List<Map<String,Object>> list(Authentication auth) {
        long memberId=members.current(auth).id();
        Map<Long,List<String>> genres=new HashMap<>();
        jdbc.query("SELECT mg.movie_id,g.genre_name FROM MM_MOVIE_GENRE mg JOIN MM_GENRE g ON g.genre_code=mg.genre_code ORDER BY mg.genre_order",
            (org.springframework.jdbc.core.RowCallbackHandler) rs -> genres.computeIfAbsent(rs.getLong(1),k->new ArrayList<>()).add(rs.getString(2)));
        return jdbc.query("""
            SELECT m.*,p.rating,p.review,p.favorite,p.reviewed_at,p.review_status,p.rejection_note,p.review_revision,media.image_data
            FROM MM_MOVIE m
            LEFT JOIN MM_MEMBER_MOVIE p ON p.movie_id=m.movie_id AND p.member_id=?
            LEFT JOIN MM_MOVIE_MEDIA media ON media.movie_id=m.movie_id
            WHERE m.is_active='Y' ORDER BY m.catalog_code
            """, (rs,n) -> {
                Map<String,Object> movie=new LinkedHashMap<>();
                long id=rs.getLong("movie_id");
                List<String> gs=genres.getOrDefault(id,List.of());
                String image=rs.getString("image_data");
                movie.put("id","db-"+id); movie.put("movieId",id);
                movie.put("title",rs.getString("title")); movie.put("year",rs.getString("release_year"));
                movie.put("image",image==null?Objects.toString(rs.getString("poster_url"),""):image);
                movie.put("fit",rs.getString("image_fit")); movie.put("summary",Objects.toString(rs.getString("synopsis"),""));
                movie.put("genre",gs.isEmpty()?"":gs.get(0)); movie.put("genres",gs);
                movie.put("rating",rs.getInt("rating")); movie.put("review",Objects.toString(rs.getString("review"),""));
                movie.put("favorite",rs.getInt("favorite")==1);
                movie.put("reviewStatus",Objects.toString(rs.getString("review_status"),"PENDING"));
                movie.put("rejectionNote",Objects.toString(rs.getString("rejection_note"),""));
                var reviewed=rs.getTimestamp("reviewed_at"); var created=rs.getTimestamp("created_at");
                movie.put("reviewedAt",reviewed==null?0:reviewed.getTime()); movie.put("createdAt",created==null?0:created.getTime());
                return movie;
            },memberId);
    }
    private void active(long id) {
        if (jdbc.queryForObject("SELECT COUNT(*) FROM MM_MOVIE WHERE movie_id=? AND is_active='Y'",Integer.class,id)==0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,"영화를 찾을 수 없습니다.");
    }
    private void ensure(long member,long movie) {
        // 중복 동시 요청에서 PK 충돌은 한 행만 유지하도록 처리
        try {jdbc.update("INSERT INTO MM_MEMBER_MOVIE(member_id,movie_id) SELECT ?,? FROM dual WHERE NOT EXISTS (SELECT 1 FROM MM_MEMBER_MOVIE WHERE member_id=? AND movie_id=?)",member,movie,member,movie);}
        catch(org.springframework.dao.DuplicateKeyException ignored) {}
    }
    public record RatingInput(int rating,String review) {}
    public record FavoriteInput(boolean favorite) {}
    @PutMapping("/{id}/rating") @Transactional
    public Map<String,String> rate(@PathVariable long id,@RequestBody RatingInput input,Authentication auth) {
        long member=members.current(auth).id(); active(id);
        String review=input.review()==null?"":input.review().trim();
        if(input.rating()<1||input.rating()>5||review.length()>500) throw new IllegalArgumentException("별점은 1~5, 리뷰는 500자 이하로 입력하세요.");
        ensure(member,id);
        jdbc.update("UPDATE MM_MEMBER_MOVIE SET rating=?,review=?,reviewed_at=SYSTIMESTAMP,review_status='PENDING',review_revision=review_revision+1,rejection_note=NULL,moderated_at=NULL WHERE member_id=? AND movie_id=?",input.rating(),review,member,id);
        return Map.of("message",review.isEmpty()?"별점을 저장했어요.":"리뷰를 제출했어요. 관리자 승인 후 공개됩니다.");
    }
    @DeleteMapping("/{id}/rating") @Transactional public Map<String,String> deleteRating(@PathVariable long id,Authentication auth) {
        long member=members.current(auth).id(); active(id);
        jdbc.queryForList("SELECT member_id FROM MM_MEMBER_MOVIE WHERE member_id=? AND movie_id=? FOR UPDATE",Long.class,member,id);
        jdbc.update("DELETE FROM MM_REVIEW_COMMENT WHERE review_member_id=? AND movie_id=?",member,id);
        jdbc.update("UPDATE MM_MEMBER_MOVIE SET rating=0,review=NULL,reviewed_at=NULL,review_status='PENDING',review_revision=review_revision+1,rejection_note=NULL,moderated_at=NULL WHERE member_id=? AND movie_id=?",member,id);
        return Map.of("message","리뷰와 별점이 삭제됐어요.");
    }
    @PutMapping("/{id}/favorite") @Transactional
    public Map<String,String> favorite(@PathVariable long id,@RequestBody FavoriteInput input,Authentication auth) {
        long member=members.current(auth).id(); active(id);ensure(member,id);
        jdbc.update("UPDATE MM_MEMBER_MOVIE SET favorite=? WHERE member_id=? AND movie_id=?",input.favorite()?1:0,member,id);
        return Map.of("message","찜을 변경했어요.");
    }
}
