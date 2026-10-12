import React, { useEffect, useState } from "react";
import { api } from "./api.js";
import "./community.css";
const names = { PENDING: "승인 대기", APPROVED: "공개", REJECTED: "반려" };
const empty = { items: [], total: 0, totalPages: 1 };
export default function CommunityBoard({
  user,
  onOpenMovie,
  onChanged,
  refreshKey,
}) {
  const [mine, setMine] = useState(false),
    [page, setPage] = useState(1),
    [data, setData] = useState(empty),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(null);
  async function load() {
    const result = await api(
      `/api/community/reviews?mine=${mine}&page=${page}&size=12`,
    );
    setData(result);
    if (page > result.totalPages) setPage(result.totalPages);
  }
  useEffect(() => {
    let active = true;
    api(`/api/community/reviews?mine=${mine}&page=${page}&size=12`)
      .then((r) => {
        if (active) {
          setData(r);
          setError("");
          if (page > r.totalPages) setPage(r.totalPages);
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [mine, page, refreshKey]);
  async function remove(r) {
    if (
      busy ||
      !window.confirm("리뷰·별점과 달린 댓글을 삭제할까요? 찜은 유지됩니다.")
    )
      return;
    setBusy(true);
    try {
      await api(`/api/movies/${r.movieId}/rating`, { method: "DELETE" });
      setSelected(null);
      await onChanged();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="community-board">
      <div className="board-tabs">
        <button
          aria-pressed={!mine}
          onClick={() => {
            setMine(false);
            setPage(1);
            setSelected(null);
          }}
        >
          전체 리뷰
        </button>
        <button
          aria-pressed={mine}
          onClick={() => {
            setMine(true);
            setPage(1);
            setSelected(null);
          }}
        >
          내 리뷰
        </button>
        <button onClick={() => load().catch((e) => setError(e.message))}>
          새로고침
        </button>
      </div>
      <p className="board-help">
        리뷰는 영화 상세 화면에서 작성해요. 관리자 승인 후 전체 리뷰에
        공개됩니다. 수정하면 다시 승인을 받아야 해요.
      </p>
      {error && (
        <p className="board-error" role="alert">
          {error}
        </p>
      )}
      <div className="board-grid">
        {data.items.map((r) => (
          <article className="board-card" key={`${r.memberId}-${r.movieId}`}>
            <header>
              <strong>{r.title}</strong>
              <span className={`review-status ${r.status}`}>
                {names[r.status]}
              </span>
            </header>
            <p className="board-meta">
              {r.nickname} · {r.rating}점 ·{" "}
              {new Date(r.createdAt).toLocaleString("ko-KR")}
            </p>
            <p className="board-text">{r.review}</p>
            {r.isMine && r.status === "REJECTED" && (
              <p className="board-error">
                반려 사유: {r.rejectionNote || "관리자에게 문의해 주세요."}
              </p>
            )}
            <div className="board-actions">
              <button onClick={() => onOpenMovie(`db-${r.movieId}`)}>
                영화 보기{r.isMine ? " · 리뷰 수정" : ""}
              </button>
              {r.status === "APPROVED" && (
                <button onClick={() => setSelected(r)}>
                  댓글 {r.commentCount}
                </button>
              )}
              {r.isMine && (
                <button disabled={busy} onClick={() => remove(r)}>
                  내 리뷰 삭제
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {!data.items.length && (
        <p className="board-help">
          {mine ? "아직 작성한 리뷰가 없어요." : "아직 승인된 리뷰가 없어요."}
        </p>
      )}
      <div className="board-pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          이전
        </button>
        <span>
          {page} / {data.totalPages} · {data.total}개
        </span>
        <button
          disabled={page >= data.totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          다음
        </button>
      </div>
      {selected && (
        <Comments
          key={`${selected.memberId}-${selected.movieId}`}
          review={selected}
          user={user}
          onClose={() => {
            setSelected(null);
            load().catch((e) => setError(e.message));
          }}
        />
      )}
    </div>
  );
}
function Comments({ review, user, onClose }) {
  const [data, setData] = useState(empty),
    [page, setPage] = useState(1),
    [text, setText] = useState(""),
    [editing, setEditing] = useState(null),
    [editText, setEditText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const path = `/api/community/reviews/${review.memberId}/${review.movieId}/comments`;
  async function load() {
    const r = await api(`${path}?page=${page}&size=20`);
    setData(r);
    if (page > r.totalPages) setPage(r.totalPages);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [page]);
  async function mutate(url, method, body) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(url, { method, body });
      setText("");
      setEditing(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="comments-panel">
      <header>
        <h3>
          {review.title} · {review.nickname}의 리뷰 댓글
        </h3>
        <button onClick={onClose}>댓글 닫기</button>
      </header>
      {error && (
        <p role="alert" className="board-error">
          {error}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutate(path, "POST", { content: text });
        }}
      >
        <label>
          댓글 작성
          <textarea
            required
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="다른 회원의 리뷰에 의견을 남겨 주세요."
          />
        </label>
        <button disabled={busy || !text.trim()}>댓글 등록</button>
      </form>
      {data.items.map((c) => (
        <article className="comment-row" key={c.id}>
          <strong>{c.nickname}</strong>
          <span className="board-meta">
            {" "}
            · {new Date(c.createdAt).toLocaleString("ko-KR")}
          </span>
          {editing === c.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                mutate(`/api/community/comments/${c.id}`, "PUT", {
                  content: editText,
                });
              }}
            >
              <textarea
                aria-label="댓글 수정"
                required
                maxLength={500}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
              <button disabled={busy}>수정 저장</button>
              <button type="button" onClick={() => setEditing(null)}>
                취소
              </button>
            </form>
          ) : (
            <p className="board-text">{c.content}</p>
          )}
          <div className="board-actions">
            {c.isMine && (
              <button
                onClick={() => {
                  setEditing(c.id);
                  setEditText(c.content);
                }}
              >
                수정
              </button>
            )}
            {(c.isMine || user.role === "ADMIN") && (
              <button
                disabled={busy}
                onClick={() => {
                  if (window.confirm("댓글을 삭제할까요?"))
                    mutate(
                      user.role === "ADMIN"
                        ? `/api/admin/community/comments/${c.id}`
                        : `/api/community/comments/${c.id}`,
                      "DELETE",
                    );
                }}
              >
                삭제
              </button>
            )}
          </div>
        </article>
      ))}
      <div className="board-pagination">
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          이전 댓글
        </button>
        <span>
          {page} / {data.totalPages}
        </span>
        <button
          disabled={page >= data.totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          다음 댓글
        </button>
      </div>
    </div>
  );
}
