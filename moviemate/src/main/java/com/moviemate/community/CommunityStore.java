package com.moviemate.community;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@Service
public class CommunityStore {
 public final JdbcTemplate jdbc;
 public CommunityStore(JdbcTemplate jdbc){this.jdbc=jdbc;}
 public static void page(int page,int size){if(page<1||page>100000||size<1||size>30)throw new IllegalArgumentException("페이지는 1 이상, 크기는 1~30입니다.");}
 public static String content(String value){String s=value==null?"":value.trim();if(s.isEmpty()||s.length()>500)throw new IllegalArgumentException("댓글은 1~500자입니다.");return s;}
 public void publicReview(long member,long movie,boolean lock){
  var rows=jdbc.queryForList("SELECT p.review_status,p.review FROM MM_MEMBER_MOVIE p JOIN MM_MEMBER u ON u.member_id=p.member_id JOIN MM_MOVIE m ON m.movie_id=p.movie_id WHERE p.member_id=? AND p.movie_id=? AND u.enabled=1 AND m.is_active='Y'"+(lock?" FOR UPDATE":""),member,movie);
  if(rows.isEmpty()||!"APPROVED".equals(rows.get(0).get("REVIEW_STATUS"))||rows.get(0).get("REVIEW")==null)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"공개된 리뷰를 찾을 수 없습니다.");
 }
 public Map<String,Object> reviews(long current,boolean mine,String status,boolean admin,int page,int size){
  page(page,size); List<Object> args=new ArrayList<>();
  String where=" WHERE p.review IS NOT NULL";
  if(!admin){where+=" AND m.is_active='Y' AND u.enabled=1";if(mine){where+=" AND p.member_id=?";args.add(current);}else where+=" AND p.review_status='APPROVED'";}
  if(admin && status!=null && !status.equals("ALL")){if(!List.of("PENDING","APPROVED","REJECTED").contains(status))throw new IllegalArgumentException("승인 상태를 확인하세요.");where+=" AND p.review_status=?";args.add(status);}
  String from=" FROM MM_MEMBER_MOVIE p JOIN MM_MEMBER u ON u.member_id=p.member_id JOIN MM_MOVIE m ON m.movie_id=p.movie_id";
  int total=jdbc.queryForObject("SELECT COUNT(*)"+from+where,Integer.class,args.toArray());
  args.add((page-1)*size);args.add(size);
  var items=jdbc.query("SELECT p.*,u.nickname,m.title,(SELECT COUNT(*) FROM MM_REVIEW_COMMENT c JOIN MM_MEMBER a ON a.member_id=c.author_id WHERE c.review_member_id=p.member_id AND c.movie_id=p.movie_id AND a.enabled=1) AS comment_count"+from+where+" ORDER BY p.reviewed_at DESC,p.member_id,p.movie_id OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",(rs,n)->{
    Map<String,Object> v=new LinkedHashMap<>();long author=rs.getLong("member_id");v.put("memberId",author);v.put("movieId",rs.getLong("movie_id"));v.put("nickname",rs.getString("nickname"));v.put("title",rs.getString("title"));v.put("rating",rs.getInt("rating"));v.put("review",rs.getString("review"));v.put("status",rs.getString("review_status"));v.put("revision",rs.getLong("review_revision"));v.put("isMine",current==author);v.put("rejectionNote",Objects.toString(rs.getString("rejection_note"),""));v.put("commentCount",rs.getInt("comment_count"));var ts=rs.getTimestamp("reviewed_at");v.put("createdAt",ts==null?0:ts.getTime());return v;
  },args.toArray());
  return Map.of("items",items,"total",total,"page",page,"totalPages",Math.max(1,(total+size-1)/size));
 }
 public Map<String,Object> comments(long member,long movie,long current,boolean admin,int page,int size){
  page(page,size);String from=" FROM MM_REVIEW_COMMENT c JOIN MM_MEMBER u ON u.member_id=c.author_id JOIN MM_MOVIE m ON m.movie_id=c.movie_id";
  String where=admin?"":" WHERE c.review_member_id=? AND c.movie_id=? AND u.enabled=1";
  List<Object> args=new ArrayList<>();if(!admin){publicReview(member,movie,false);args.add(member);args.add(movie);}
  int total=jdbc.queryForObject("SELECT COUNT(*)"+from+where,Integer.class,args.toArray());args.add((page-1)*size);args.add(size);
  var items=jdbc.query("SELECT c.*,u.nickname,m.title"+from+where+" ORDER BY c.comment_id DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY",(rs,n)->{
    Map<String,Object> v=new LinkedHashMap<>();v.put("id",rs.getLong("comment_id"));v.put("memberId",rs.getLong("review_member_id"));v.put("movieId",rs.getLong("movie_id"));v.put("authorId",rs.getLong("author_id"));v.put("nickname",rs.getString("nickname"));v.put("title",rs.getString("title"));v.put("content",rs.getString("content"));v.put("isMine",rs.getLong("author_id")==current);v.put("createdAt",rs.getTimestamp("created_at").getTime());return v;
  },args.toArray());return Map.of("items",items,"total",total,"page",page,"totalPages",Math.max(1,(total+size-1)/size));
 }
}
