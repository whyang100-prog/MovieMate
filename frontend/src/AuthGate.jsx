import React, { useEffect, useState } from "react";
import { api, setApiMember } from "./api.js";
import "./auth.css";

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    nickname: "",
    confirm: "",
  });
  const [message, setMessage] = useState("");
  function assign(value) {
    setApiMember(value?.id ?? null);
    setUser(value);
  }
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const result = await api("/api/auth/me");
        if (active) {
          assign(result);
          setError("");
        }
      } catch (e) {
        if (active) {
          assign(null);
          if (e.status !== 401) setError(e.message);
        }
      } finally {
        if (active) setChecking(false);
      }
    };
    const expired = () => {
      if (active) {
        assign(null);
        setMessage("로그인 상태를 확인해 주세요.");
      }
    };
    check();
    window.addEventListener("moviemate:unauthorized", expired);
    window.addEventListener("focus", check);
    return () => {
      active = false;
      window.removeEventListener("moviemate:unauthorized", expired);
      window.removeEventListener("focus", check);
    };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const username = form.username.trim().toLowerCase();
      if (mode === "register") {
        if (form.password !== form.confirm)
          throw new Error("비밀번호 확인이 일치하지 않습니다.");
        await api("/api/auth/register", {
          method: "POST",
          body: {
            username,
            password: form.password,
            nickname: form.nickname.trim(),
          },
        });
        setMode("login");
        setForm((f) => ({ ...f, password: "", confirm: "" }));
        setMessage("회원가입이 완료됐어요. 로그인해 주세요.");
      } else {
        await api("/api/auth/login", {
          method: "POST",
          body: { username, password: form.password },
        });
        const me = await api("/api/auth/me");
        assign(me);
        setForm({ username: "", password: "", nickname: "", confirm: "" });
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    assign(null);
    setMessage("로그아웃되었습니다.");
  }
  if (checking)
    return (
      <div className="auth-shell">
        <p>로그인 상태를 확인하고 있어요.</p>
      </div>
    );
  if (user) return children(user, logout);
  const field = (name) => (e) =>
    setForm((f) => ({ ...f, [name]: e.target.value }));
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          MovieMate<span>.</span>
        </div>
        <p className="auth-eyebrow">YOUR MOVIE, YOUR STORY</p>
        <h1>
          {mode === "login"
            ? "나의 영화 취향을 만나세요."
            : "MovieMate 시작하기"}
        </h1>
        <p>로그인하고 영화 검색, 평가, 리뷰와 찜을 이용하세요.</p>
        <form onSubmit={submit}>
          <label>
            아이디
            <input
              required
              minLength={4}
              maxLength={30}
              pattern="[a-zA-Z0-9_]{4,30}"
              autoComplete="username"
              value={form.username}
              onChange={field("username")}
              placeholder="영문·숫자·밑줄 4~30자"
            />
          </label>
          {mode === "register" && (
            <label>
              닉네임
              <input
                required
                maxLength={30}
                autoComplete="nickname"
                value={form.nickname}
                onChange={field("nickname")}
              />
            </label>
          )}
          <label>
            비밀번호
            <input
              type="password"
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={form.password}
              onChange={field("password")}
              placeholder="10자 이상 (최대 72바이트)"
            />
          </label>
          {mode === "register" && (
            <label>
              비밀번호 확인
              <input
                type="password"
                required
                autoComplete="new-password"
                value={form.confirm}
                onChange={field("confirm")}
              />
            </label>
          )}
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="auth-success" role="status">
              {message}
            </p>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "처리 중…" : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>
        <button
          className="auth-switch"
          disabled={busy}
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
            setMessage("");
          }}
        >
          {mode === "login"
            ? "처음이신가요? 회원가입"
            : "이미 계정이 있나요? 로그인"}
        </button>
      </section>
    </main>
  );
}
