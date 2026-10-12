-- Oracle 12c 이상. XE 18c/21c의 프로젝트용 계정에서 최초 1회 실행하세요.
-- 기존 테이블을 삭제하거나 덮어쓰지 않습니다. 이미 생성했다면 02번으로 이동합니다.
SET DEFINE OFF
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

BEGIN
    IF SYS_CONTEXT('USERENV', 'SESSION_USER') IN ('SYS', 'SYSTEM') THEN
        RAISE_APPLICATION_ERROR(-20002, '프로젝트용 계정으로 접속하세요. 예: MOVIEMATE');
    END IF;
END;
/

CREATE TABLE MM_MOVIE (
    movie_id       NUMBER GENERATED ALWAYS AS IDENTITY,
    catalog_code   VARCHAR2(20 CHAR) NOT NULL,
    title          VARCHAR2(200 CHAR) NOT NULL,
    title_en       VARCHAR2(300 CHAR),
    release_year   NUMBER(4) NOT NULL,
    poster_url     VARCHAR2(1000 CHAR),
    image_fit      VARCHAR2(7 CHAR) DEFAULT 'contain' NOT NULL,
    synopsis       CLOB,
    wikidata_id    VARCHAR2(20 CHAR),
    source_url     VARCHAR2(500 CHAR),
    is_active      CHAR(1 CHAR) DEFAULT 'Y' NOT NULL,
    created_at     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at     TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_MM_MOVIE PRIMARY KEY (movie_id),
    CONSTRAINT UQ_MM_MOVIE_CODE UNIQUE (catalog_code),
    CONSTRAINT UQ_MM_MOVIE_WIKIDATA UNIQUE (wikidata_id),
    CONSTRAINT CK_MM_MOVIE_YEAR CHECK (release_year BETWEEN 1888 AND 2100),
    CONSTRAINT CK_MM_MOVIE_FIT CHECK (image_fit IN ('contain', 'cover')),
    CONSTRAINT CK_MM_MOVIE_ACTIVE CHECK (is_active IN ('Y', 'N'))
);

CREATE TABLE MM_GENRE (
    genre_code     VARCHAR2(20 CHAR) NOT NULL,
    genre_name     VARCHAR2(30 CHAR) NOT NULL,
    sort_order     NUMBER(3) NOT NULL,
    CONSTRAINT PK_MM_GENRE PRIMARY KEY (genre_code),
    CONSTRAINT UQ_MM_GENRE_NAME UNIQUE (genre_name),
    CONSTRAINT CK_MM_GENRE_ORDER CHECK (sort_order > 0)
);

CREATE TABLE MM_MOVIE_GENRE (
    movie_id       NUMBER NOT NULL,
    genre_code     VARCHAR2(20 CHAR) NOT NULL,
    genre_order    NUMBER(2) NOT NULL,
    CONSTRAINT PK_MM_MOVIE_GENRE PRIMARY KEY (movie_id, genre_code),
    CONSTRAINT UQ_MM_MOVIE_GENRE_ORDER UNIQUE (movie_id, genre_order),
    CONSTRAINT FK_MM_MG_MOVIE FOREIGN KEY (movie_id)
        REFERENCES MM_MOVIE(movie_id) ON DELETE CASCADE,
    CONSTRAINT FK_MM_MG_GENRE FOREIGN KEY (genre_code)
        REFERENCES MM_GENRE(genre_code),
    CONSTRAINT CK_MM_MG_ORDER CHECK (genre_order > 0)
);

CREATE INDEX IX_MM_MG_GENRE ON MM_MOVIE_GENRE(genre_code, movie_id);

COMMENT ON TABLE MM_MOVIE IS '공통 영화 정보. 개인 평점과 찜은 별도 회원 관계 테이블에 저장한다.';
COMMENT ON COLUMN MM_MOVIE.movie_id IS 'Oracle 자동 생성 PK. 번호가 연속적이지 않아도 정상이다.';
COMMENT ON COLUMN MM_MOVIE.catalog_code IS '프로젝트 내부 영화 코드. 초기 데이터 MM001~MM100. 외부 기관 코드가 아니다.';
COMMENT ON COLUMN MM_MOVIE.release_year IS 'Wikidata 공개일 중 가장 이른 연도. 국내 개봉연도와 다를 수 있다.';
COMMENT ON COLUMN MM_MOVIE.poster_url IS '이미지 URL 또는 웹 공개 경로. 초기값 NULL. PC 파일 경로를 넣지 않는다.';
COMMENT ON COLUMN MM_MOVIE.image_fit IS 'contain: 원본 전체 표시, cover: 프레임 채우기';
COMMENT ON COLUMN MM_MOVIE.updated_at IS '정보를 수정하는 UPDATE 문에서 SYSTIMESTAMP로 함께 갱신한다.';
COMMENT ON TABLE MM_GENRE IS '프로젝트 장르 분류';
COMMENT ON TABLE MM_MOVIE_GENRE IS '영화와 장르의 다대다 연결. genre_order=1은 대표 장르.';

PROMPT 영화 관련 테이블 3개 생성 완료. 02_seed_100_movies.sql을 실행하세요.
