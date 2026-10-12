import React, { useEffect, useState } from "react";

export default function MovieApiTest() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMovies() {
      try {
        const response = await fetch(
          "http://localhost:8080/api/movies",
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`조회 실패: HTTP ${response.status}`);
        }

        const data = await response.json();
        setMovies(data);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadMovies();

    return () => controller.abort();
  }, []);

  if (loading) {
    return <p>영화 목록을 불러오는 중...</p>;
  }

  if (error) {
    return <p role="alert">연결 오류: {error}</p>;
  }

  return (
    <section>
      <h2>Oracle에서 가져온 영화 목록</h2>
      <p>총 {movies.length}개</p>

      {movies.length === 0 ? (
        <p>등록된 영화가 없습니다.</p>
      ) : (
        <ul>
          {movies.map((movie) => (
            <li key={movie.movieId}>
              {movie.title} · {movie.releaseYear}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}