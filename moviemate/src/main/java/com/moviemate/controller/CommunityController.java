package com.moviemate.controller;
import java.util.*;
import com.moviemate.community.CommunityStore;
import com.moviemate.security.MemberStore;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@RestController
@RequestMapping("/api")
public class CommunityController {
 private final CommunityStore store;private final MemberStore members;
 public CommunityController(CommunityStore store,MemberStore members){this.store=store;this.members=members;}
 @GetMapping("/community/reviews") public Map<String,Object> reviews(Authentication auth,@RequestParam(defaultValue="false") boolean mine,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="12") int size){return store.reviews(members.current(auth).id(),mine,null,false,page,size);}
 @GetMapping("/community/reviews/{memberId}/{movieId}/comments") public Map<String,Object> comments(@PathVariable long memberId,@PathVariable long movieId,Authentication auth,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size){return store.comments(memberId,movieId,members.current(auth).id(),false,page,size);}
 public record CommentInput(String content){}
 @PostMapping("/community/reviews/{memberId}/{movieId}/comments") @ResponseStatus(HttpStatus.CREATED) @Transactional
 public Map<String,String> comment(@PathVariable long memberId,@PathVariable long movieId,@RequestBody CommentInput input,Authentication auth){long current=members.current(auth).id();String content=CommunityStore.content(input.content());store.publicReview(memberId,movieId,true);store.jdbc.update("INSERT INTO MM_REVIEW_COMMENT(review_member_id,movie_id,author_id,content) VALUES(?,?,?,?)",memberId,movieId,current,content);return Map.of("message","댓글을 등록했어요.");}
 @PutMapping("/community/comments/{id}") @Transactional public void edit(@PathVariable long id,@RequestBody CommentInput input,Authentication auth){long current=members.current(auth).id();String text=CommunityStore.content(input.content());var rows=store.jdbc.queryForList("SELECT review_member_id,movie_id,author_id FROM MM_REVIEW_COMMENT WHERE comment_id=?",id);if(rows.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"댓글을 찾을 수 없습니다.");var row=rows.get(0);if(((Number)row.get("AUTHOR_ID")).longValue()!=current)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"내 댓글만 수정할 수 있습니다.");store.publicReview(((Number)row.get("REVIEW_MEMBER_ID")).longValue(),((Number)row.get("MOVIE_ID")).longValue(),true);store.jdbc.update("UPDATE MM_REVIEW_COMMENT SET content=?,updated_at=SYSTIMESTAMP WHERE comment_id=? AND author_id=?",text,id,current);}
 @DeleteMapping("/community/comments/{id}") public void delete(@PathVariable long id,Authentication auth){long current=members.current(auth).id();int count=store.jdbc.update("DELETE FROM MM_REVIEW_COMMENT WHERE comment_id=? AND author_id=?",id,current);if(count==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"삭제할 내 댓글을 찾을 수 없습니다.");}
 @GetMapping("/admin/community/reviews") public Map<String,Object> all(Authentication auth,@RequestParam(defaultValue="PENDING") String status,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size){return store.reviews(members.current(auth).id(),false,status,true,page,size);}
 public record DecisionInput(String status,long revision,String reason){}
 @PutMapping("/admin/community/reviews/{memberId}/{movieId}/decision") public void decision(@PathVariable long memberId,@PathVariable long movieId,@RequestBody DecisionInput input){if(!List.of("APPROVED","REJECTED").contains(input.status()))throw new IllegalArgumentException("승인 또는 반려를 선택하세요.");String reason=Objects.toString(input.reason(),"").trim();if(reason.length()>300)throw new IllegalArgumentException("반려 사유는 300자 이하입니다.");int count=store.jdbc.update("UPDATE MM_MEMBER_MOVIE SET review_status=?,rejection_note=?,moderated_at=SYSTIMESTAMP WHERE member_id=? AND movie_id=? AND review_revision=? AND review IS NOT NULL",input.status(),input.status().equals("REJECTED")?reason:null,memberId,movieId,input.revision());if(count==0)throw new ResponseStatusException(HttpStatus.CONFLICT,"리뷰가 수정 또는 삭제됐어요. 목록을 새로고침하고 다시 검토하세요.");}
 @GetMapping("/admin/community/comments") public Map<String,Object> allComments(Authentication auth,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size){return store.comments(0,0,members.current(auth).id(),true,page,size);}
 @DeleteMapping("/admin/community/comments/{id}") public void deleteAny(@PathVariable long id){if(store.jdbc.update("DELETE FROM MM_REVIEW_COMMENT WHERE comment_id=?",id)==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"댓글을 찾을 수 없습니다.");}
}
