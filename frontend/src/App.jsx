import CommunityBoard from "./CommunityBoard.jsx";
import AuthGate from "./AuthGate.jsx";
import AdminPanel from "./AdminPanel.jsx";
import { api, movieNumber } from "./api.js";
import React, { useEffect, useMemo, useRef, useState } from "react";

import Icon from "./components/Icon.jsx";

import Modal from "./components/Modal.jsx";

import { imageToDataURL, initialLibrary } from "./storage.js";

const GENRES = [
  "드라마",
  "로맨스",
  "SF",
  "스릴러",
  "액션",
  "코미디",
  "애니메이션",
  "판타지",
  "다큐멘터리",
  "기타",
];

const NAV = [
  ["movies", "영화 탐색"],
  ["taste", "취향 매칭"],
  ["community", "커뮤니티"],
  ["watchlist", "찜한 영화"],
];

// 한 페이지에 표시할 영화 수
const PAGE_SIZE = 6;

// API의 genres 배열과 기존 단일 genre 값을 모두 지원합니다.
function getMovieGenres(movie) {
  const values = Array.isArray(movie.genres) ? movie.genres : [];
  return [
    ...new Set(
      [...values, movie.genre]
        .filter((value) => typeof value === "string" && value.trim())
        .map((value) => value.trim()),
    ),
  ];
}

function Pagination({ page, totalPages, onChange, label }) {
  if (totalPages <= 1) return null;
  const buttonStyle = {
    minWidth: 40,
    height: 40,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "white",
    color: "#25262b",
    cursor: "pointer",
    font: "inherit",
  };
  return (
    <nav
      aria-label={label}
      className="movie-pagination"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        margin: "28px 0",
      }}
    >
      <button
        type="button"
        disabled={page === 1}
        style={{ ...buttonStyle, opacity: page === 1 ? 0.4 : 1 }}
        onClick={() => onChange(page - 1)}
      >
        이전
      </button>
      {Array.from(
        { length: Math.min(5, totalPages) },
        (_, index) => Math.max(1, Math.min(page - 2, totalPages - 4)) + index,
      ).map((number) => (
        <button
          type="button"
          key={number}
          aria-label={`${number}페이지`}
          aria-current={page === number ? "page" : undefined}
          style={{
            ...buttonStyle,
            background: page === number ? "#202126" : "white",
            color: page === number ? "white" : "#25262b",
          }}
          onClick={() => onChange(number)}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        disabled={page === totalPages}
        style={{ ...buttonStyle, opacity: page === totalPages ? 0.4 : 1 }}
        onClick={() => onChange(page + 1)}
      >
        다음
      </button>
    </nav>
  );
}

function Artwork({ movie, layout = "poster", className = "", children }) {
  return (
    <div
      className={`artwork ${layout} ${className}`}
      style={{ aspectRatio: "2 / 3" }}
    >
      {movie?.image ? (
        <img
          src={movie.image}
          alt={`${movie.title} 이미지`}
          style={{ objectFit: movie.fit || "contain" }}
        />
      ) : (
        <div className="artwork-empty">
          <Icon name="image" size={32} />
          <span>2:3</span>
        </div>
      )}

      {children}
    </div>
  );
}

function MovieCard({ movie, layout, onOpen, onFavorite, disabled }) {
  return (
    <article className="movie-card">
      <div className="card-visual">
        <button
          className="artwork-button"
          onClick={() => onOpen(movie.id)}
          aria-label={`${movie.title} 상세 보기`}
        >
          <Artwork movie={movie} layout={layout} />
        </button>

        <button
          className={`favorite-button ${movie.favorite ? "selected" : ""}`}
          disabled={disabled}
          onClick={() => onFavorite(movie.id)}
          aria-label={`${movie.title} ${movie.favorite ? "찜 해제" : "찜하기"}`}
          aria-pressed={movie.favorite}
        >
          <Icon
            name="heart"
            size={20}
            fill={movie.favorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <button className="movie-title" onClick={() => onOpen(movie.id)}>
        {movie.title}
      </button>

      <div className="movie-meta">
        <span>
          {getMovieGenres(movie).join(" · ") || "장르 미입력"}
          {movie.year ? ` · ${movie.year}` : ""}
        </span>
        <span className={movie.rating ? "rated" : ""}>
          <Icon
            name="star"
            size={13}
            fill={movie.rating ? "currentColor" : "none"}
          />
          {movie.rating ? `${movie.rating}.0` : "미평가"}
        </span>
      </div>
    </article>
  );
}

function EmptySlots({ layout, onAdd }) {
  return (
    <div className={`movie-grid layout-${layout}`}>
      {[1, 2, 3, 4].map((n) => (
        <button
          className="empty-movie-card"
          onClick={onAdd}
          key={n}
          aria-label={`${n}번째 영화 추가`}
        >
          <div
            className={`artwork ${layout} empty-slot`}
            style={{ aspectRatio: "2 / 3" }}
          >
            <span className="slot-number">0{n}</span>
            <div className="slot-center">
              <span className="slot-plus">
                <Icon name="plus" size={25} />
              </span>
              <strong>내 이미지 넣기</strong>
              <span>영화 포스터 2:3</span>
            </div>
          </div>

          <span className="empty-card-title">영화 제목을 입력해 주세요</span>
          <span className="empty-card-meta">당신의 영화로 채워질 자리</span>
        </button>
      ))}
    </div>
  );
}

function MovieEditor({ movie, onSave, onClose, layout }) {
  const [form, setForm] = useState(() => ({
    title: "",
    genre: "액션",
    year: "",
    summary: "",
    image: "",
    fit: "contain",
    ...movie,
  })); // form 초기값 설정, movie가 있으면 그 값으로 초기화

  const [error, setError] = useState(""); // 에러 상태 관리

  const [reading, setReading] = useState(false); // 이미지 읽기 상태 관리

  const [saving, setSaving] = useState(false); // 저장 상태 관리

  const [dragging, setDragging] = useState(false); // 드래그 상태 관리

  const input = useRef(null); // 파일 입력 요소에 대한 참조 생성

  const field = (key) => (event) =>
    setForm((value) => ({ ...value, [key]: event.target.value })); // 입력을 처리할 함수를 반환함

  async function selectFile(file) {
    // 파일 선택 시 처리 함수

    if (!file) return; // 파일이 없으면 종료

    setError("");
    setReading(true);

    try {
      const image = await imageToDataURL(file);
      setForm((value) => ({ ...value, image }));
    } catch (err) {
      setError(err.message);
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError("영화 제목을 입력해 주세요.");
      return;
    }

    setSaving(true);

    const success = await onSave({
      ...form,
      title: form.title.trim(),
      summary: form.summary.trim(),
      year: String(form.year).trim(),
    });

    setSaving(false);

    if (success) onClose();
    else
      setError("저장하지 못했습니다. 연도와 입력값, 서버 연결을 확인하세요.");
  }

  return (
    <Modal title={movie ? "영화 수정" : "내 영화 추가"} onClose={onClose} wide>
      <p className="modal-description">
        직접 준비한 이미지와 제목으로 영화 목록을 채워보세요.
      </p>

      <form onSubmit={submit} className="editor-form">
        <div className="editor-image-column">
          <button
            type="button"
            className={`upload-zone ${dragging ? "dragging" : ""}`}
            disabled={reading || saving}
            onClick={() => input.current.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!reading && !saving) selectFile(event.dataTransfer.files[0]);
            }}
            aria-label="영화 이미지 파일 선택"
          >
            {form.image ? (
              <Artwork movie={form} layout={layout} />
            ) : (
              <div
                className={`upload-placeholder ${layout}`}
                style={{ aspectRatio: "2 / 3" }}
              >
                <Icon name="upload" size={30} />
                <strong>
                  {reading ? "이미지 불러오는 중…" : "이미지를 넣어주세요"}
                </strong>
                <span>클릭하거나 여기로 끌어놓기</span>
                <small>포스터 2:3 권장</small>
              </div>
            )}
          </button>

          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(event) => selectFile(event.target.files[0])}
          />

          <p className="field-hint">JPG · PNG · WebP · GIF / 최대 8MB</p>

          {form.image && (
            <div className="image-actions">
              <button
                type="button"
                className="text-button"
                disabled={reading || saving}
                onClick={() => input.current.click()}
              >
                이미지 변경
              </button>
              <button
                type="button"
                className="text-button muted"
                disabled={reading || saving}
                onClick={() => setForm((value) => ({ ...value, image: "" }))}
              >
                이미지 제거
              </button>
            </div>
          )}

          <fieldset className="fit-field">
            <legend>이미지 표시</legend>
            <label>
              <input
                type="radio"
                name="fit"
                value="contain"
                checked={form.fit === "contain"}
                onChange={field("fit")}
              />{" "}
              전체 보기
            </label>
            <label>
              <input
                type="radio"
                name="fit"
                value="cover"
                checked={form.fit === "cover"}
                onChange={field("fit")}
              />{" "}
              꽉 채우기
            </label>
          </fieldset>

          <p className="field-hint">
            ‘전체 보기’는 포스터의 글자까지 모두 보여줘요.
          </p>
        </div>

        <div className="editor-fields">
          <label className="form-field">
            영화 제목 <span className="required">필수</span>
            <input
              autoFocus
              required
              maxLength={80}
              value={form.title}
              onChange={field("title")}
              placeholder="직접 영화 제목을 입력하세요"
            />
          </label>

          <div className="field-row">
            <label className="form-field">
              장르
              <select value={form.genre} onChange={field("genre")}>
                {GENRES.map((genre) => (
                  <option key={genre}>{genre}</option>
                ))}
              </select>
            </label>
            <label className="form-field">
              개봉 연도
              <input
                type="number"
                min="1888"
                max={new Date().getFullYear() + 5}
                value={form.year}
                onChange={field("year")}
                placeholder="예: 2026"
              />
            </label>
          </div>

          <label className="form-field">
            영화 소개 <span className="optional">선택</span>
            <textarea
              rows="5"
              maxLength={500}
              value={form.summary}
              onChange={field("summary")}
              placeholder="줄거리나 기억하고 싶은 소개를 적어주세요."
            />
          </label>

          <p className="local-note">
            <Icon name="check" size={15} /> 등록한 영화는 서버에 저장되어 모든
            회원에게 표시됩니다.
          </p>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              취소
            </button>
            <button className="button primary" disabled={reading || saving}>
              {saving ? "저장 중…" : movie ? "수정 저장" : "영화 추가"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function MovieDetail({ movie, onClose, onRate, onFavorite, onEdit, pending }) {
  const [rating, setRating] = useState(movie.rating || 0);

  const [review, setReview] = useState(movie.review || "");

  const [error, setError] = useState("");

  const [saved, setSaved] = useState(false);

  async function submit(event) {
    event.preventDefault();

    if (!rating) {
      setError("별점을 먼저 선택해 주세요.");
      return;
    }

    if (await onRate(movie.id, rating, review.trim())) {
      setError("");
      setSaved(true);
    }
  }

  return (
    <Modal title="영화 상세" onClose={onClose} wide>
      <div className="detail-grid">
        <Artwork movie={movie} />

        <div className="detail-content">
          <p className="eyebrow">MY MOVIE COLLECTION</p>
          <h3>{movie.title}</h3>
          <p className="detail-meta">
            {getMovieGenres(movie).join(" · ")}
            {movie.year && ` · ${movie.year}`}
          </p>
          <p className="synopsis">
            {movie.summary || "아직 등록된 영화 소개가 없어요."}
          </p>

          <div className="detail-actions">
            <button
              className={`button ${movie.favorite ? "soft" : "secondary"}`}
              disabled={pending}
              onClick={() => onFavorite(movie.id)}
              aria-pressed={movie.favorite}
            >
              <Icon
                name="heart"
                size={17}
                fill={movie.favorite ? "currentColor" : "none"}
              />
              {movie.favorite ? "찜한 영화" : "찜하기"}
            </button>
            {onEdit && (
              <button className="text-button" onClick={() => onEdit(movie.id)}>
                <Icon name="edit" size={16} />
                영화 수정
              </button>
            )}
          </div>

          {movie.review && (
            <p className="board-help">
              리뷰 상태:{" "}
              {{ PENDING: "승인 대기", APPROVED: "공개", REJECTED: "반려" }[
                movie.reviewStatus
              ] || "승인 대기"}
              {movie.reviewStatus === "REJECTED" &&
                ` · ${movie.rejectionNote || "사유 없음"}`}
            </p>
          )}
          <form className="review-form" onSubmit={submit}>
            <label>나의 평점</label>
            <div className="stars" role="group" aria-label="별점 선택">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={n <= rating ? "active" : ""}
                  onClick={() => setRating(n)}
                  aria-pressed={rating === n}
                  aria-label={`${n}점`}
                >
                  <Icon
                    name="star"
                    size={30}
                    fill={n <= rating ? "currentColor" : "none"}
                  />
                </button>
              ))}
              <span>{rating ? `${rating}.0` : "선택해 주세요"}</span>
            </div>

            <label className="form-field">
              짧은 리뷰
              <textarea
                maxLength={500}
                rows="3"
                value={review}
                onChange={(event) => {
                  setReview(event.target.value);
                  setSaved(false);
                }}
                placeholder="이 영화, 어떤 점이 좋았나요?"
              />
            </label>
            <div className="review-form-footer">
              <span>
                {saved
                  ? review.trim()
                    ? "리뷰 제출 완료 · 관리자 승인 대기"
                    : "별점 저장 완료"
                  : `${review.length} / 500`}
              </span>
              <button className="button primary small" disabled={pending}>
                평가 저장
              </button>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        </div>
      </div>
    </Modal>
  );
}

export default function App() {
  return (
    <AuthGate>
      {(user, logout) => (
        <MovieApp key={user.id} user={user} onLogout={logout} />
      )}
    </AuthGate>
  );
}
function MovieApp({ user, onLogout }) {
  const isAdmin = user.role === "ADMIN";
  const [library, setLibrary] = useState(initialLibrary);

  const libraryRef = useRef(initialLibrary);

  const [ready, setReady] = useState(false);

  const [pending, setPending] = useState(false);

  const [storageError, setStorageError] = useState("");

  const [query, setQuery] = useState("");

  const [genre, setGenre] = useState("전체");

  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("movies");
  const [pageSize, setPageSize] = useState(() =>
    window.innerWidth < 700 ? 2 : window.innerWidth < 1100 ? 4 : PAGE_SIZE,
  );
  useEffect(() => {
    const resize = () =>
      setPageSize(
        window.innerWidth < 700 ? 2 : window.innerWidth < 1100 ? 4 : PAGE_SIZE,
      );
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  function navigate(event) {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = link.getAttribute("href").slice(1);
    if (target === "top" || NAV.some(([id]) => id === target)) {
      event.preventDefault();
      setView(target === "top" ? "movies" : target);
      setMobileMenu(false);
    }
  }

  const [dialog, setDialog] = useState(null);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [toast, setToast] = useState("");

  const toastTimer = useRef();

  async function reloadMovies() {
    const data = await api("/api/movies");
    const next = { ...initialLibrary, movies: data };
    libraryRef.current = next;
    setLibrary(next);
  }
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api("/api/movies", { signal: controller.signal })
      .then((data) => {
        if (active) {
          const next = { ...initialLibrary, movies: data };
          libraryRef.current = next;
          setLibrary(next);
          setStorageError("");
        }
      })
      .catch((error) => {
        if (active && error.name !== "AbortError")
          setStorageError(error.message);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function notify(message) {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 3400);
  }

  const mutationLock = useRef(false);
  async function mutate(path, method, body, message) {
    if (mutationLock.current) return false;
    mutationLock.current = true;
    setPending(true);
    setStorageError("");
    try {
      await api(path, { method, body });
      await reloadMovies();
      notify(message);
      return true;
    } catch (error) {
      setStorageError(error.message);
      return false;
    } finally {
      mutationLock.current = false;
      setPending(false);
    }
  }

  const { movies } = library;
  const layout = "poster"; // 저장된 이전 비율과 관계없이 2:3 고정

  const favorites = movies.filter((movie) => movie.favorite);

  const ratedMovies = movies.filter((movie) => movie.rating);

  const reviews = movies
    .filter((movie) => movie.review)
    .sort((a, b) => (b.reviewedAt || 0) - (a.reviewedAt || 0));

  const featured = movies[0];

  const filtered = useMemo(
    () =>
      movies
        .filter(
          (movie) =>
            (!query.trim() ||
              `${movie.title} ${getMovieGenres(movie).join(" ")}`
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase())) &&
            (genre === "전체" || getMovieGenres(movie).includes(genre)),
        )
        .sort((a, b) =>
          sort === "rating"
            ? b.rating - a.rating
            : sort === "title"
              ? a.title.localeCompare(b.title, "ko")
              : b.createdAt - a.createdAt,
        ),
    [movies, query, genre, sort],
  );

  const availableGenres = useMemo(
    () => [...new Set([...GENRES, ...movies.flatMap(getMovieGenres)])],
    [movies],
  );

  // 검색 및 정렬은 전체 목록에 적용하고, 그 결과를 페이지로 나눕니다.
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pagedMovies = filtered.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [query, genre, sort, pageSize]);
  useEffect(() => {
    setPage((previous) => Math.min(previous, totalPages));
  }, [totalPages]);

  function changePage(nextPage) {
    setPage(nextPage);
  }

  const currentMovie = dialog?.id
    ? movies.find((movie) => movie.id === dialog.id)
    : null;

  const close = () => setDialog(null);

  const addMovie = () => {
    if (ready && isAdmin) setDialog({ kind: "editor" });
  };

  const openMovie = (id) => setDialog({ kind: "detail", id });

  async function saveMovie(form) {
    if (!isAdmin) return false;
    return mutate(
      form.id
        ? `/api/admin/movies/${movieNumber(form.id)}`
        : "/api/admin/movies",
      form.id ? "PUT" : "POST",
      form,
      "영화 정보를 저장했어요.",
    );
  }
  async function toggleFavorite(id) {
    const movie = libraryRef.current.movies.find((m) => m.id === id);
    if (!movie) return false;
    return mutate(
      `/api/movies/${movieNumber(id)}/favorite`,
      "PUT",
      { favorite: !movie.favorite },
      movie.favorite ? "찜한 영화에서 해제했어요." : "찜한 영화에 담았어요.",
    );
  }
  async function rateMovie(id, rating, review) {
    return mutate(
      `/api/movies/${movieNumber(id)}/rating`,
      "PUT",
      { rating, review },
      review.trim()
        ? "리뷰를 제출했어요. 관리자 승인 후 공개됩니다."
        : "별점을 저장했어요.",
    );
  }
  async function deleteReview(movie) {
    if (
      pending ||
      !window.confirm(
        `‘${movie.title}’ 리뷰와 별점을 삭제할까요? 찜은 유지됩니다.`,
      )
    )
      return;
    return mutate(
      `/api/movies/${movieNumber(movie.id)}/rating`,
      "DELETE",
      undefined,
      "리뷰와 별점이 삭제됐어요.",
    );
  }
  async function deleteMovie(movie) {
    if (
      !isAdmin ||
      pending ||
      !window.confirm(
        `‘${movie.title}’ 영화를 목록에서 숨길까요? 회원 기록은 보존됩니다.`,
      )
    )
      return;
    return mutate(
      `/api/admin/movies/${movieNumber(movie.id)}`,
      "DELETE",
      undefined,
      "영화를 목록에서 숨겼어요.",
    );
  }

  return (
    <div
      className="cinema-shell"
      data-view={view}
      data-role={user.role}
      onClick={navigate}
      style={{ "--movie-columns": pageSize }}
    >
      <style>{`
.cinema-shell[data-role="USER"] #movies .section-top > button { display:none; }
.cinema-shell { height:100dvh; min-height:360px; display:flex; flex-direction:column; background:#fafafa; overflow:hidden; }
.cinema-shell > .site-header { position:relative; top:auto; flex:0 0 auto; height:64px; }
.cinema-shell .nav-inner { height:64px; min-height:0; }
.cinema-shell > main { flex:1; min-height:0; overflow:auto; }
.cinema-shell[data-view="movies"] > main { display:flex; flex-direction:column; overflow:hidden; }
.cinema-shell > main > section { display:none; }
.cinema-shell[data-view="movies"] #movies { display:flex; }
.cinema-shell[data-view="taste"] #taste,
.cinema-shell[data-view="community"] #community,
.cinema-shell[data-view="watchlist"] #watchlist { display:block; }
.cinema-shell > .site-footer { display:none; }
.cinema-shell #movies { flex:1; min-height:0; width:100%; max-width:1440px; margin:0 auto; padding:16px 32px 10px; box-sizing:border-box; flex-direction:column; gap:12px; }
.cinema-shell #movies .section-top { margin:0; flex-shrink:0; align-items:center; }
.cinema-shell #movies .section-top h2 { font-size:26px; margin:0; line-height:1.25; }
.cinema-shell #movies .section-top .eyebrow,
.cinema-shell #movies .section-description { display:none; }
.cinema-shell #movies .discovery-controls { margin:0; flex-shrink:0; display:flex; gap:12px; }
.cinema-shell #movies .search-field { flex:1; min-width:0; height:42px; }
.cinema-shell #movies .search-field input { height:100%; }
.cinema-shell #movies .genre-tabs { display:flex; flex-wrap:nowrap; overflow-x:auto; flex-shrink:0; gap:6px; margin:0; padding:0 0 4px; }
.cinema-shell #movies .genre-tabs button { flex-shrink:0; padding:7px 13px; white-space:nowrap; }
.cinema-shell #movies > .movie-grid { flex:1; min-height:0; display:grid; grid-template-columns:repeat(var(--movie-columns),minmax(0,1fr)); grid-template-rows:minmax(0,1fr); gap:18px; margin:0; align-items:stretch; container-type:size; }
.cinema-shell #movies .movie-card { width:min(100%, calc((100cqh - 62px) * 2 / 3)); min-width:0; margin:0 auto; align-self:center; }
.cinema-shell #movies .card-visual { width:100%; margin:0; }
.cinema-shell #movies .artwork-button { display:block; width:100%; padding:0; }
.cinema-shell #movies .artwork { width:100%; height:auto; aspect-ratio:2 / 3; }
.cinema-shell #movies .artwork img { width:100%; height:100%; object-fit:contain; }
.cinema-shell #movies .movie-title { display:block; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:8px 0 3px; font-size:14px; line-height:20px; }
.cinema-shell #movies .movie-meta { display:flex; gap:4px; white-space:nowrap; overflow:hidden; font-size:11px; line-height:18px; }
.cinema-shell #movies .movie-meta > span { overflow:hidden; text-overflow:ellipsis; }
.cinema-shell #movies .movie-pagination { flex-shrink:0; flex-wrap:nowrap!important; margin:0!important; gap:5px!important; }
.cinema-shell #movies .movie-pagination button { min-width:32px!important; height:34px!important; padding:0 9px!important; }
.cinema-shell #movies .collection-caption { flex-shrink:0; margin:0; padding:0; border:0; justify-content:center; font-size:12px; }
.cinema-shell #movies .collection-caption > span:last-child { display:none; }
.cinema-shell #movies .section-empty { flex:1; min-height:0; padding:16px; display:flex; align-items:center; justify-content:center; }
.cinema-shell .storage-alert { flex-shrink:0; margin:0; padding:6px 12px; font-size:12px; }
@media(max-width:699px) {
 .cinema-shell #movies { padding:10px 14px 8px; gap:8px; }
 .cinema-shell #movies .section-top h2 { font-size:22px; }
 .cinema-shell #movies > .movie-grid { gap:12px; }
 .cinema-shell #movies .view-options { width:auto; }
 .cinema-shell #movies .sort-select select { max-width:120px; }
}
@media(max-height:560px) {
 .cinema-shell > .site-header,.cinema-shell .nav-inner { height:48px; }
 .cinema-shell #movies { gap:6px; padding-top:6px; }
 .cinema-shell #movies .section-top { display:none; }
 .cinema-shell #movies .collection-caption { display:none; }
}
`}</style>
      <a className="skip-link" href="#movies">
        영화 목록 바로가기
      </a>

      <header className="site-header">
        <div className="nav-inner">
          <a className="brand" href="#top" aria-label="MovieMate 홈">
            <span className="brand-mark">m</span>MovieMate
            <span className="brand-dot">.</span>
          </a>
          <nav
            className={`main-nav ${mobileMenu ? "open" : ""}`}
            aria-label="주 메뉴"
          >
            {NAV.map(([id, title]) => (
              <a key={id} href={`#${id}`} onClick={() => setMobileMenu(false)}>
                {title}
                {id === "watchlist" && favorites.length > 0 && (
                  <span className="nav-count">{favorites.length}</span>
                )}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            {isAdmin && (
              <button
                className="manage-link"
                disabled={!ready}
                onClick={() => setDialog({ kind: "manage" })}
              >
                <Icon name="grid" size={16} />
                <span>영화 관리</span>
              </button>
            )}
            {isAdmin && (
              <button
                className="manage-link"
                onClick={() => setDialog({ kind: "admin" })}
              >
                관리자 모드
              </button>
            )}
            <span className="account-label">{user.nickname}</span>
            <button
              className="login-button"
              disabled={pending}
              onClick={async () => {
                try {
                  await onLogout();
                } catch (e) {
                  setStorageError(e.message);
                }
              }}
            >
              로그아웃
            </button>
            <button
              className="menu-button icon-button"
              aria-label="메뉴 열기"
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Icon name={mobileMenu ? "close" : "menu"} />
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {storageError && (
          <div className="storage-alert" role="alert">
            {storageError}
          </div>
        )}

        <section className="hero container" aria-labelledby="hero-title">
          <p className="eyebrow hero-eyebrow">
            <span />
            영화로 시작하는 취향의 발견
          </p>
          <h1 id="hero-title">
            좋아하는 영화,
            <br />
            <span>함께 나누는 취향.</span>
          </h1>
          <p className="hero-description">
            한 편의 영화가 당신을 말해줘요.
            <br className="mobile-only" /> 나만의 영화 취향을 차곡차곡
            쌓아보세요.
          </p>
          <div className="hero-actions">
            <a href="#movies" className="button primary">
              영화 둘러보기
              <Icon name="arrow" size={17} />
            </a>
            <a href="#taste" className="text-button">
              내 취향 알아보기
              <Icon name="chevron" size={15} />
            </a>
          </div>

          <div className={`feature-band ${featured ? "has-movie" : ""}`}>
            <div className="feature-copy">
              <p className="feature-eyebrow">YOUR MOVIE, YOUR STORY</p>
              <h2>
                {featured ? (
                  featured.title
                ) : (
                  <>
                    당신만의 영화로
                    <br />첫 장면을 채워보세요.
                  </>
                )}
              </h2>
              <p>
                {featured
                  ? [featured.genre, featured.year].filter(Boolean).join(" · ")
                  : "직접 고른 포스터 한 장, 좋아하는 영화 한 편부터."}
              </p>
              <button
                className="text-button"
                disabled={!ready}
                onClick={featured ? () => openMovie(featured.id) : addMovie}
              >
                {featured ? "영화 자세히 보기" : "첫 영화 추가하기"}
                <Icon name="arrow" size={17} />
              </button>
            </div>
            <button
              className="feature-art"
              disabled={!ready}
              onClick={featured ? () => openMovie(featured.id) : addMovie}
              aria-label={
                featured
                  ? `${featured.title} 상세 보기`
                  : "대표 영화 이미지 넣기"
              }
            >
              <Artwork movie={featured} layout="poster">
                {!featured && (
                  <span className="feature-image-caption">내 이미지 · 2:3</span>
                )}
              </Artwork>
            </button>
            <span className="feature-index">01 / MY COLLECTION</span>
          </div>
        </section>

        <section
          id="movies"
          className="section container"
          aria-labelledby="movies-title"
        >
          <div className="section-top">
            <div>
              <p className="eyebrow">EXPLORE MOVIES</p>
              <h2 id="movies-title">오늘은 어떤 영화를 볼까요?</h2>
              <p className="section-description">
                마음에 드는 영화를 발견하고, 나만의 기록을 남겨보세요.
              </p>
            </div>
            <button
              className="button secondary small"
              disabled={!ready}
              onClick={addMovie}
            >
              <Icon name="plus" size={16} />
              영화 추가
            </button>
          </div>

          <div className="discovery-controls">
            <div className="search-field">
              <Icon name="search" size={19} />
              <input
                aria-label="영화 제목 또는 장르 검색"
                placeholder="영화 제목, 장르 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  className="clear-search"
                  onClick={() => setQuery("")}
                  aria-label="검색어 지우기"
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
            <div className="view-options">
              <label className="sort-select">
                <span className="sr-only">영화 정렬</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="recent">최근 추가순</option>
                  <option value="rating">내 평점 높은 순</option>
                  <option value="title">제목순</option>
                </select>
              </label>
            </div>
          </div>

          <div className="genre-tabs" role="group" aria-label="장르 필터">
            {["전체", ...availableGenres].map((value) => (
              <button
                key={value}
                className={genre === value ? "active" : ""}
                aria-pressed={genre === value}
                onClick={() => setGenre(value)}
              >
                {value}
              </button>
            ))}
          </div>

          {!ready ? (
            <div className="section-empty" role="status">
              나의 영화를 불러오고 있어요…
            </div>
          ) : movies.length === 0 ? (
            <div className="section-empty">
              {isAdmin ? (
                <button className="button primary" onClick={addMovie}>
                  첫 영화 추가하기
                </button>
              ) : (
                <p>관리자가 영화를 등록하면 여기에 표시됩니다.</p>
              )}
            </div>
          ) : filtered.length ? (
            <div className={`movie-grid layout-${layout}`}>
              {pagedMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  layout={layout}
                  onOpen={openMovie}
                  onFavorite={toggleFavorite}
                  disabled={pending}
                />
              ))}
            </div>
          ) : (
            <div className="section-empty">
              <Icon name="search" size={30} />
              <h3>찾는 영화가 아직 없어요.</h3>
              <p>다른 검색어나 장르로 찾아보세요.</p>
              <button
                className="text-button"
                onClick={() => {
                  setQuery("");
                  setGenre("전체");
                }}
              >
                필터 초기화
                <Icon name="arrow" size={16} />
              </button>
            </div>
          )}

          {ready && filtered.length > 0 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={changePage}
              label="영화 목록 페이지"
            />
          )}

          <p className="collection-caption">
            <span>
              {movies.length
                ? filtered.length
                  ? `총 ${filtered.length}편 · ${startIndex + 1}–${Math.min(startIndex + pageSize, filtered.length)}번째 · ${currentPage}/${totalPages}페이지`
                  : "검색 결과 0편"
                : "직접 준비한 사진과 제목을 넣어주세요."}
            </span>
            <span>
              <Icon name="image" size={14} />
              영화 포스터 2:3 · 이미지 전체 보기 기본
            </span>
          </p>
        </section>

        <section
          id="taste"
          className="taste-section"
          aria-labelledby="taste-title"
        >
          <div className="container taste-grid">
            <div className="taste-copy">
              <p className="eyebrow">FIND YOUR MOVIEMATE</p>
              <h2 id="taste-title">
                같은 장면에서,
                <br />
                같은 마음을 느낀 사람.
              </h2>
              <p>
                내가 좋아한 영화가 누군가의 인생 영화라면.
                <br />
                영화 평가를 쌓아 나와 닮은 취향을 만나보세요.
              </p>
              <a className="button dark" href="#movies">
                영화 평가하러 가기
                <Icon name="arrow" size={17} />
              </a>
              <span className="upcoming-note">
                회원 취향 매칭과 추천은 준비 중이에요.
              </span>
            </div>
            <div className="taste-card">
              <div className="taste-card-top">
                <span className="subtle-label">MY TASTE</span>
                <Icon name="users" size={22} />
              </div>
              <div className="taste-orbit" aria-hidden="true">
                <div className="orbit outer" />
                <div className="orbit inner" />
                <span className="orbit-spark one" />
                <span className="orbit-spark two" />
                <div className="taste-avatar">
                  M<span>나의 취향</span>
                </div>
                <span className="orbit-plus">
                  <Icon name="plus" size={18} />
                </span>
              </div>
              <h3>
                {ratedMovies.length
                  ? "나의 취향이 쌓이고 있어요."
                  : "취향의 시작은 한 편의 영화."}
              </h3>
              <p>평점을 남길수록 나를 더 잘 알 수 있어요.</p>
              <div className="taste-stats">
                <div>
                  <strong>
                    {ratedMovies.length}
                    <span>편</span>
                  </strong>
                  <span>평가한 영화</span>
                </div>
                <span className="stats-divider" />
                <div>
                  <strong>
                    {favorites.length}
                    <span>편</span>
                  </strong>
                  <span>찜한 영화</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="community"
          className="section container community-section"
          aria-labelledby="community-title"
        >
          <div className="section-top">
            <div>
              <p className="eyebrow">AFTER THE CREDITS</p>
              <h2 id="community-title">영화 이야기를 함께 나눠요.</h2>
            </div>
          </div>
          <CommunityBoard
            user={user}
            onOpenMovie={openMovie}
            onChanged={reloadMovies}
            refreshKey={library}
          />
        </section>

        <section
          id="watchlist"
          className="section container watchlist-section"
          aria-labelledby="watchlist-title"
        >
          <div className="section-top">
            <div>
              <p className="eyebrow">SAVED FOR LATER</p>
              <h2 id="watchlist-title">다음에 만날 영화.</h2>
              <p className="section-description">
                보고 싶은 순간을 위해, 마음에 담아둔 목록.
              </p>
            </div>
            <span className="saved-count">
              {favorites.length}
              <span>편의 영화</span>
            </span>
          </div>
          {favorites.length ? (
            <div className={`movie-grid layout-${layout}`}>
              {favorites.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  layout={layout}
                  onOpen={openMovie}
                  onFavorite={toggleFavorite}
                  disabled={pending}
                />
              ))}
            </div>
          ) : (
            <div className="watchlist-empty">
              <span className="empty-heart">
                <Icon name="heart" size={29} />
              </span>
              <h3>마음이 가는 영화에 하트를 눌러보세요.</h3>
              <p>찜한 영화를 여기에서 한눈에 모아볼 수 있어요.</p>
              <a href="#movies" className="text-button">
                영화 둘러보기
                <Icon name="arrow" size={17} />
              </a>
            </div>
          )}
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-top">
          <a className="brand" href="#top">
            <span className="brand-mark">m</span>MovieMate
            <span className="brand-dot">.</span>
          </a>
          <p>영화로 이어지는, 우리의 취향.</p>
          <a href="#top" className="back-top">
            처음으로 ↑
          </a>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} MovieMate</span>
          <span>내 평점·리뷰·찜은 계정별로 저장돼요.</span>
        </div>
      </footer>

      {isAdmin && dialog?.kind === "editor" && (
        <MovieEditor
          key={dialog.id || "new"}
          movie={currentMovie}
          layout={layout}
          onClose={close}
          onSave={saveMovie}
        />
      )}

      {dialog?.kind === "detail" && currentMovie && (
        <MovieDetail
          key={currentMovie.id}
          movie={currentMovie}
          onClose={close}
          onFavorite={toggleFavorite}
          onRate={rateMovie}
          onEdit={
            isAdmin ? (id) => setDialog({ kind: "editor", id }) : undefined
          }
          pending={pending}
        />
      )}

      {isAdmin && dialog?.kind === "manage" && (
        <Modal title="영화 관리" onClose={close} wide>
          <div className="manage-heading">
            <div>
              <p className="modal-description">
                내가 등록한 이미지와 영화 정보를 관리하세요.
              </p>
              <span className="field-hint">
                공통 영화 정보를 수정합니다. 모든 회원에게 반영됩니다.
              </span>
            </div>
            <button className="button primary small" onClick={addMovie}>
              <Icon name="plus" size={16} />
              영화 추가
            </button>
          </div>
          <div className="management-list">
            {movies.length ? (
              movies.map((movie) => (
                <div className="management-row" key={movie.id}>
                  <Artwork movie={movie} />
                  <div className="management-info">
                    <strong>{movie.title}</strong>
                    <span>
                      {getMovieGenres(movie).join(" · ")}
                      {movie.year && ` · ${movie.year}`}
                    </span>
                  </div>
                  <button
                    className="icon-button"
                    onClick={() => setDialog({ kind: "editor", id: movie.id })}
                    aria-label={`${movie.title} 수정`}
                  >
                    <Icon name="edit" size={18} />
                  </button>
                  <button
                    className="icon-button danger"
                    disabled={pending}
                    onClick={() => deleteMovie(movie)}
                    aria-label={`${movie.title} 삭제`}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))
            ) : (
              <div className="section-empty">
                <Icon name="image" size={30} />
                <h3>아직 등록한 영화가 없어요.</h3>
                <p>직접 준비한 포스터와 영화 제목을 추가해 주세요.</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {isAdmin && dialog?.kind === "admin" && (
        <AdminPanel onClose={close} onChanged={reloadMovies} />
      )}

      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Icon name="check" size={17} />
            {toast}
          </>
        )}
      </div>
    </div>
  );
}
