import React, { useEffect, useState } from "react";
import Modal from "./components/Modal.jsx";
import { api } from "./api.js";
import "./community.css";
export default function AdminPanel({ onClose, onChanged }) {
  const [members, setMembers] = useState([]),
    [data, setData] = useState({ items: [], totalPages: 1, total: 0 }),
    [tab, setTab] = useState("reviews"),
    [status, setStatus] = useState("PENDING"),
    [page, setPage] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load() {
    if (tab === "members") {
      setMembers(await api("/api/admin/members"));
      return;
    }
    const r = await api(
      tab === "reviews"
        ? `/api/admin/community/reviews?status=${status}&page=${page}&size=20`
        : `/api/admin/community/comments?page=${page}&size=20`,
    );
    setData(r);
    if (page > r.totalPages) setPage(r.totalPages);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [tab, status, page]);
  async function change(path, method, body, question) {
    if (busy || !window.confirm(question)) return;
    setBusy(true);
    setError("");
    try {
      await api(path, { method, body });
      await load();
      await onChanged();
    } catch (e) {
      setError(e.message);
      try {
        await load();
      } catch {}
    } finally {
      setBusy(false);
    }
  }
  function decision(r, next) {
    const reason =
      next === "REJECTED"
        ? window.prompt("반려 사유를 입력하세요 (300자 이하)", "")
        : "";
    if (reason === null) return;
    change(
      `/api/admin/community/reviews/${r.memberId}/${r.movieId}/decision`,
      "PUT",
      { status: next, revision: r.revision, reason },
      next === "APPROVED"
        ? "이 버전의 리뷰를 공개할까요?"
        : "리뷰를 반려할까요?",
    );
  }
  return (
    <Modal title="관리자 모드" onClose={onClose} wide>
      <div className="moderation-panel">
        <div className="admin-tabs">
          {[
            ["reviews", "리뷰 승인·관리"],
            ["comments", "전체 댓글 관리"],
            ["members", "회원 관리"],
          ].map(([id, name]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              onClick={() => {
                setTab(id);
                setPage(1);
                setError("");
              }}
            >
              {name}
            </button>
          ))}
          <button onClick={() => load().catch((e) => setError(e.message))}>
            새로고침
          </button>
        </div>
        {tab === "reviews" && (
          <div className="moderation-status">
            {[
              ["PENDING", "승인 대기"],
              ["APPROVED", "공개"],
              ["REJECTED", "반려"],
              ["ALL", "전체"],
            ].map(([id, name]) => (
              <button
                key={id}
                aria-pressed={status === id}
                onClick={() => {
                  setStatus(id);
                  setPage(1);
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p role="alert" className="board-error">
            {error}
          </p>
        )}
        {tab === "members"
          ? members.map((m) => (
              <article key={m.id} className="admin-row">
                <div>
                  <strong>{m.nickname}</strong>
                  <p>
                    {m.username} · {m.role} · {m.enabled ? "사용 중" : "정지"}
                  </p>
                </div>
                {m.role === "USER" && (
                  <div className="admin-actions">
                    <button
                      disabled={busy}
                      onClick={() =>
                        change(
                          `/api/admin/members/${m.id}/status`,
                          "PUT",
                          { enabled: !m.enabled },
                          "계정 사용 상태를 바꿀까요?",
                        )
                      }
                    >
                      {m.enabled ? "정지" : "복구"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        change(
                          `/api/admin/members/${m.id}`,
                          "DELETE",
                          undefined,
                          "회원과 모든 작성 기록을 삭제할까요?",
                        )
                      }
                    >
                      회원 삭제
                    </button>
                  </div>
                )}
              </article>
            ))
          : data.items.map((r) => (
              <article
                key={tab === "reviews" ? `${r.memberId}-${r.movieId}` : r.id}
                className="admin-row"
              >
                <div>
                  <strong>
                    {r.title} · {r.nickname}
                    {tab === "reviews" && ` · ${r.rating}점`}
                  </strong>
                  <p className="board-text">
                    {tab === "reviews" ? r.review : r.content}
                  </p>
                  {tab === "reviews" && (
                    <span className={`review-status ${r.status}`}>
                      {
                        {
                          PENDING: "승인 대기",
                          APPROVED: "공개",
                          REJECTED: "반려",
                        }[r.status]
                      }{" "}
                      · 버전 {r.revision}
                    </span>
                  )}
                </div>
                <div className="admin-actions">
                  {tab === "reviews" ? (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => decision(r, "APPROVED")}
                      >
                        승인
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => decision(r, "REJECTED")}
                      >
                        반려
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          change(
                            `/api/admin/reviews/${r.memberId}/${r.movieId}`,
                            "DELETE",
                            undefined,
                            "리뷰·별점과 달린 댓글을 삭제할까요? 찜은 유지됩니다.",
                          )
                        }
                      >
                        삭제
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() =>
                        change(
                          `/api/admin/community/comments/${r.id}`,
                          "DELETE",
                          undefined,
                          "이 댓글을 삭제할까요?",
                        )
                      }
                    >
                      댓글 삭제
                    </button>
                  )}
                </div>
              </article>
            ))}
        {tab !== "members" && (
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
        )}
      </div>
    </Modal>
  );
}
