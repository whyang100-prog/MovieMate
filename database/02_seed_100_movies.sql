-- 영화 100편 입력. 먼저 01_create_tables.sql을 실행하세요.
-- F5(스크립트 실행)로 파일 전체 실행. 영화 코드는 프로젝트 내부 코드입니다.
-- 이미 있는 영화는 제목/사진/장르를 덮어쓰지 않습니다.
-- 성공 시 COMMIT, 실패 시 이번 입력을 ROLLBACK합니다.
SET DEFINE OFF
SET SERVEROUTPUT ON
WHENEVER SQLERROR EXIT SQL.SQLCODE ROLLBACK

DECLARE
    v_inserted PLS_INTEGER := 0;
    v_count PLS_INTEGER;

    PROCEDURE add_movie(
        p_code VARCHAR2, p_title VARCHAR2, p_title_en VARCHAR2,
        p_year NUMBER, p_wikidata_id VARCHAR2, p_genres VARCHAR2
    ) IS
        v_movie_id MM_MOVIE.movie_id%TYPE;
        v_existing_id MM_MOVIE.wikidata_id%TYPE;
        v_genre VARCHAR2(20);
        v_order PLS_INTEGER := 1;
    BEGIN
        MERGE INTO MM_MOVIE m
        USING (SELECT p_code AS catalog_code FROM dual) s
        ON (m.catalog_code = s.catalog_code)
        WHEN NOT MATCHED THEN
            INSERT (catalog_code, title, title_en, release_year, wikidata_id, source_url)
            VALUES (p_code, p_title, p_title_en, p_year, p_wikidata_id,
                    'https://www.wikidata.org/wiki/' || p_wikidata_id);

        IF SQL%ROWCOUNT = 1 THEN
            v_inserted := v_inserted + 1;
            SELECT movie_id INTO v_movie_id FROM MM_MOVIE WHERE catalog_code = p_code;
            LOOP
                v_genre := REGEXP_SUBSTR(p_genres, '[^|]+', 1, v_order);
                EXIT WHEN v_genre IS NULL;
                INSERT INTO MM_MOVIE_GENRE (movie_id, genre_code, genre_order)
                VALUES (v_movie_id, v_genre, v_order);
                v_order := v_order + 1;
            END LOOP;
        ELSE
            SELECT wikidata_id INTO v_existing_id FROM MM_MOVIE WHERE catalog_code = p_code;
            IF NVL(v_existing_id, '?') <> p_wikidata_id THEN
                RAISE_APPLICATION_ERROR(-20003, '다른 영화가 같은 코드를 사용 중입니다: ' || p_code);
            END IF;
        END IF;
    END;
BEGIN
    SAVEPOINT mm_seed_start;

    -- 장르 10개: 기존 분류명은 유지합니다.
    MERGE INTO MM_GENRE g
    USING (SELECT 'DRAMA' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('DRAMA', '드라마', 1);
    MERGE INTO MM_GENRE g
    USING (SELECT 'ROMANCE' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('ROMANCE', '로맨스', 2);
    MERGE INTO MM_GENRE g
    USING (SELECT 'SF' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('SF', 'SF', 3);
    MERGE INTO MM_GENRE g
    USING (SELECT 'THRILLER' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('THRILLER', '스릴러', 4);
    MERGE INTO MM_GENRE g
    USING (SELECT 'ACTION' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('ACTION', '액션', 5);
    MERGE INTO MM_GENRE g
    USING (SELECT 'COMEDY' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('COMEDY', '코미디', 6);
    MERGE INTO MM_GENRE g
    USING (SELECT 'ANIMATION' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('ANIMATION', '애니메이션', 7);
    MERGE INTO MM_GENRE g
    USING (SELECT 'FANTASY' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('FANTASY', '판타지', 8);
    MERGE INTO MM_GENRE g
    USING (SELECT 'DOCUMENTARY' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('DOCUMENTARY', '다큐멘터리', 9);
    MERGE INTO MM_GENRE g
    USING (SELECT 'OTHER' AS genre_code FROM dual) s
    ON (g.genre_code = s.genre_code)
    WHEN NOT MATCHED THEN INSERT (genre_code, genre_name, sort_order)
    VALUES ('OTHER', '기타', 10);

    -- 영화 데이터: 코드, 한글 제목, 영어 제목, 최초 공개연도, 출처 ID, 장르
    add_movie('MM001', '기생충', 'Parasite', 2019, 'Q61448040', 'DRAMA|THRILLER');
    add_movie('MM002', '부산행', 'Train to Busan', 2016, 'Q20948236', 'THRILLER|ACTION');
    add_movie('MM003', '극한직업', 'Extreme Job', 2019, 'Q55106022', 'COMEDY|ACTION');
    add_movie('MM004', '명량', 'The Admiral: Roaring Currents', 2014, 'Q16930989', 'ACTION|DRAMA');
    add_movie('MM005', '국제시장', 'Ode to My Father', 2014, 'Q18611423', 'DRAMA');
    add_movie('MM006', '베테랑', 'Veteran', 2015, 'Q19939990', 'ACTION|THRILLER');
    add_movie('MM007', '신과함께-죄와 벌', 'Along with the Gods: The Two Worlds', 2017, 'Q26252639', 'FANTASY|DRAMA');
    add_movie('MM008', '신과함께-인과 연', 'Along with the Gods: The Last 49 Days', 2018, 'Q54803694', 'FANTASY|DRAMA');
    add_movie('MM009', '택시운전사', 'A Taxi Driver', 2017, 'Q28698824', 'DRAMA');
    add_movie('MM010', '도둑들', 'The Thieves', 2012, 'Q492485', 'ACTION|THRILLER');
    add_movie('MM011', '암살', 'Assassination', 2015, 'Q19801741', 'ACTION|DRAMA');
    add_movie('MM012', '괴물', 'The Host', 2006, 'Q488222', 'THRILLER|SF');
    add_movie('MM013', '왕의 남자', 'The King and the Clown', 2005, 'Q51743', 'DRAMA');
    add_movie('MM014', '광해, 왕이 된 남자', 'Masquerade', 2012, 'Q491957', 'DRAMA');
    add_movie('MM015', '변호인', 'The Attorney', 2013, 'Q15283831', 'DRAMA');
    add_movie('MM016', '해운대', 'Tidal Wave', 2009, 'Q495128', 'ACTION|DRAMA');
    add_movie('MM017', '실미도', 'Silmido', 2003, 'Q494993', 'ACTION|DRAMA');
    add_movie('MM018', '태극기 휘날리며', 'Taegukgi', 2004, 'Q494410', 'ACTION|DRAMA');
    add_movie('MM019', '살인의 추억', 'Memories of Murder', 2003, 'Q488169', 'THRILLER|DRAMA');
    add_movie('MM020', '올드보이', 'Oldboy', 2003, 'Q475693', 'THRILLER|ACTION');
    add_movie('MM021', '아저씨', 'The Man from Nowhere', 2010, 'Q485709', 'ACTION|THRILLER');
    add_movie('MM022', '추격자', 'The Chaser', 2008, 'Q496724', 'THRILLER|ACTION');
    add_movie('MM023', '달콤한 인생', 'A Bittersweet Life', 2005, 'Q485462', 'ACTION|DRAMA');
    add_movie('MM024', '장화, 홍련', 'A Tale of Two Sisters', 2003, 'Q255260', 'THRILLER');
    add_movie('MM025', '곡성', 'The Wailing', 2016, 'Q22972803', 'THRILLER');
    add_movie('MM026', '파묘', 'Exhuma', 2024, 'Q117322466', 'THRILLER');
    add_movie('MM027', '서울의 봄', '12.12: The Day', 2023, 'Q115858816', 'DRAMA|THRILLER');
    add_movie('MM028', '범죄도시', 'The Outlaws', 2017, 'Q33101534', 'ACTION|THRILLER');
    add_movie('MM029', '범죄도시2', 'The Roundup', 2022, 'Q109355923', 'ACTION|THRILLER');
    add_movie('MM030', '범죄도시3', 'The Roundup: No Way Out', 2023, 'Q113317051', 'ACTION|THRILLER');
    add_movie('MM031', '범죄도시4', 'The Roundup: Punishment', 2024, 'Q115283311', 'ACTION|THRILLER');
    add_movie('MM032', '헤어질 결심', 'Decision to Leave', 2022, 'Q100889636', 'ROMANCE|THRILLER');
    add_movie('MM033', '1987', '1987: When the Day Comes', 2017, 'Q30115075', 'DRAMA');
    add_movie('MM034', '공동경비구역 JSA', 'Joint Security Area', 2000, 'Q202681', 'DRAMA|THRILLER');
    add_movie('MM035', '건축학개론', 'Architecture 101', 2012, 'Q492288', 'ROMANCE|DRAMA');
    add_movie('MM036', '클래식', 'The Classic', 2003, 'Q485525', 'ROMANCE|DRAMA');
    add_movie('MM037', '늑대소년', 'A Werewolf Boy', 2012, 'Q115890', 'ROMANCE|FANTASY');
    add_movie('MM038', '엽기적인 그녀', 'My Sassy Girl', 2001, 'Q483166', 'ROMANCE|COMEDY');
    add_movie('MM039', '써니', 'Sunny', 2011, 'Q492504', 'DRAMA|COMEDY');
    add_movie('MM040', '리틀 포레스트', 'Little Forest', 2018, 'Q30611920', 'DRAMA');
    add_movie('MM041', '인셉션', 'Inception', 2010, 'Q25188', 'SF|THRILLER');
    add_movie('MM042', '인터스텔라', 'Interstellar', 2014, 'Q13417189', 'SF|DRAMA');
    add_movie('MM043', '다크 나이트', 'The Dark Knight', 2008, 'Q163872', 'ACTION|THRILLER');
    add_movie('MM044', '배트맨 비긴즈', 'Batman Begins', 2005, 'Q166262', 'ACTION|THRILLER');
    add_movie('MM045', '다크 나이트 라이즈', 'The Dark Knight Rises', 2012, 'Q189330', 'ACTION|THRILLER');
    add_movie('MM046', '쇼생크 탈출', 'The Shawshank Redemption', 1994, 'Q172241', 'DRAMA');
    add_movie('MM047', '포레스트 검프', 'Forrest Gump', 1994, 'Q134773', 'DRAMA|ROMANCE');
    add_movie('MM048', '매트릭스', 'The Matrix', 1999, 'Q83495', 'SF|ACTION');
    add_movie('MM049', '타이타닉', 'Titanic', 1997, 'Q44578', 'ROMANCE|DRAMA');
    add_movie('MM050', '아바타', 'Avatar', 2009, 'Q24871', 'SF|ACTION|FANTASY');
    add_movie('MM051', '아바타: 물의 길', 'Avatar: The Way of Water', 2022, 'Q3604746', 'SF|ACTION');
    add_movie('MM052', '어벤져스', 'The Avengers', 2012, 'Q182218', 'ACTION|SF');
    add_movie('MM053', '어벤져스: 에이지 오브 울트론', 'Avengers: Age of Ultron', 2015, 'Q14171368', 'ACTION|SF');
    add_movie('MM054', '어벤져스: 인피니티 워', 'Avengers: Infinity War', 2018, 'Q23780914', 'ACTION|SF');
    add_movie('MM055', '어벤져스: 엔드게임', 'Avengers: Endgame', 2019, 'Q23781155', 'ACTION|SF');
    add_movie('MM056', '아이언맨', 'Iron Man', 2008, 'Q192724', 'ACTION|SF');
    add_movie('MM057', '캡틴 아메리카: 윈터 솔져', 'Captain America: The Winter Soldier', 2014, 'Q1765358', 'ACTION|THRILLER');
    add_movie('MM058', '가디언즈 오브 갤럭시', 'Guardians of the Galaxy', 2014, 'Q5887360', 'SF|ACTION|COMEDY');
    add_movie('MM059', '스파이더맨: 노 웨이 홈', 'Spider-Man: No Way Home', 2021, 'Q68934496', 'ACTION|SF|FANTASY');
    add_movie('MM060', '닥터 스트레인지', 'Doctor Strange', 2016, 'Q18406872', 'FANTASY|ACTION');
    add_movie('MM061', '블랙 팬서', 'Black Panther', 2018, 'Q23780734', 'ACTION|SF');
    add_movie('MM062', '탑건: 매버릭', 'Top Gun: Maverick', 2022, 'Q31202708', 'ACTION|DRAMA');
    add_movie('MM063', '미션 임파서블: 폴아웃', 'Mission: Impossible – Fallout', 2018, 'Q29261993', 'ACTION|THRILLER');
    add_movie('MM064', '매드 맥스: 분노의 도로', 'Mad Max: Fury Road', 2015, 'Q1757288', 'ACTION|SF');
    add_movie('MM065', '글래디에이터', 'Gladiator', 2000, 'Q128518', 'ACTION|DRAMA');
    add_movie('MM066', '반지의 제왕: 반지 원정대', 'The Lord of the Rings: The Fellowship of the Ring', 2001, 'Q127367', 'FANTASY|ACTION');
    add_movie('MM067', '반지의 제왕: 두 개의 탑', 'The Lord of the Rings: The Two Towers', 2002, 'Q164963', 'FANTASY|ACTION');
    add_movie('MM068', '반지의 제왕: 왕의 귀환', 'The Lord of the Rings: The Return of the King', 2003, 'Q131074', 'FANTASY|ACTION');
    add_movie('MM069', '해리 포터와 마법사의 돌', 'Harry Potter and the Philosopher''s Stone', 2001, 'Q102438', 'FANTASY');
    add_movie('MM070', '해리 포터와 비밀의 방', 'Harry Potter and the Chamber of Secrets', 2002, 'Q102244', 'FANTASY');
    add_movie('MM071', '라라랜드', 'La La Land', 2016, 'Q20856802', 'ROMANCE|DRAMA');
    add_movie('MM072', '위플래쉬', 'Whiplash', 2014, 'Q15648198', 'DRAMA');
    add_movie('MM073', '어바웃 타임', 'About Time', 2013, 'Q4668586', 'ROMANCE|FANTASY|COMEDY');
    add_movie('MM074', '이터널 선샤인', 'Eternal Sunshine of the Spotless Mind', 2004, 'Q208269', 'ROMANCE|SF');
    add_movie('MM075', '비포 선라이즈', 'Before Sunrise', 1995, 'Q659609', 'ROMANCE|DRAMA');
    add_movie('MM076', '노트북', 'The Notebook', 2004, 'Q223374', 'ROMANCE|DRAMA');
    add_movie('MM077', '악마는 프라다를 입는다', 'The Devil Wears Prada', 2006, 'Q223316', 'COMEDY|DRAMA');
    add_movie('MM078', '그랜드 부다페스트 호텔', 'The Grand Budapest Hotel', 2014, 'Q3521099', 'COMEDY|DRAMA');
    add_movie('MM079', '조커', 'Joker', 2019, 'Q42759035', 'DRAMA|THRILLER');
    add_movie('MM080', '오펜하이머', 'Oppenheimer', 2023, 'Q108839994', 'DRAMA');
    add_movie('MM081', '듄', 'Dune', 2021, 'Q60834962', 'SF');
    add_movie('MM082', '듄: 파트 2', 'Dune: Part Two', 2024, 'Q109228991', 'SF|ACTION');
    add_movie('MM083', '에브리씽 에브리웨어 올 앳 원스', 'Everything Everywhere All at Once', 2022, 'Q83808444', 'SF|ACTION|COMEDY');
    add_movie('MM084', '펭귄 - 위대한 모험', 'March of the Penguins', 2005, 'Q330113', 'DOCUMENTARY');
    add_movie('MM085', '맨 온 와이어', 'Man on Wire', 2008, 'Q1417721', 'DOCUMENTARY');
    add_movie('MM086', '센과 치히로의 행방불명', 'Spirited Away', 2001, 'Q155653', 'ANIMATION|FANTASY');
    add_movie('MM087', '이웃집 토토로', 'My Neighbor Totoro', 1988, 'Q39571', 'ANIMATION|FANTASY');
    add_movie('MM088', '하울의 움직이는 성', 'Howl''s Moving Castle', 2004, 'Q29011', 'ANIMATION|FANTASY');
    add_movie('MM089', '모노노케 히메', 'Princess Mononoke', 1997, 'Q186572', 'ANIMATION|FANTASY');
    add_movie('MM090', '마녀 배달부 키키', 'Kiki''s Delivery Service', 1989, 'Q196602', 'ANIMATION|FANTASY');
    add_movie('MM091', '너의 이름은.', 'Your Name', 2016, 'Q21697406', 'ANIMATION|ROMANCE|FANTASY');
    add_movie('MM092', '날씨의 아이', 'Weathering with You', 2019, 'Q59692464', 'ANIMATION|ROMANCE|FANTASY');
    add_movie('MM093', '스즈메의 문단속', 'Suzume', 2022, 'Q110126272', 'ANIMATION|FANTASY');
    add_movie('MM094', '더 퍼스트 슬램덩크', 'The First Slam Dunk', 2022, 'Q112897629', 'ANIMATION|DRAMA');
    add_movie('MM095', '겨울왕국', 'Frozen', 2013, 'Q246283', 'ANIMATION|FANTASY');
    add_movie('MM096', '겨울왕국 2', 'Frozen 2', 2019, 'Q24733929', 'ANIMATION|FANTASY');
    add_movie('MM097', '주토피아', 'Zootopia', 2016, 'Q15270647', 'ANIMATION|COMEDY');
    add_movie('MM098', '인사이드 아웃', 'Inside Out', 2015, 'Q6144664', 'ANIMATION|FANTASY');
    add_movie('MM099', '코코', 'Coco', 2017, 'Q5815826', 'ANIMATION|FANTASY');
    add_movie('MM100', '토이 스토리', 'Toy Story', 1995, 'Q171048', 'ANIMATION|FANTASY');

    SELECT COUNT(*) INTO v_count FROM MM_MOVIE
    WHERE catalog_code IN (
        'MM001', 'MM002', 'MM003', 'MM004', 'MM005', 'MM006', 'MM007', 'MM008', 'MM009', 'MM010',
        'MM011', 'MM012', 'MM013', 'MM014', 'MM015', 'MM016', 'MM017', 'MM018', 'MM019', 'MM020',
        'MM021', 'MM022', 'MM023', 'MM024', 'MM025', 'MM026', 'MM027', 'MM028', 'MM029', 'MM030',
        'MM031', 'MM032', 'MM033', 'MM034', 'MM035', 'MM036', 'MM037', 'MM038', 'MM039', 'MM040',
        'MM041', 'MM042', 'MM043', 'MM044', 'MM045', 'MM046', 'MM047', 'MM048', 'MM049', 'MM050',
        'MM051', 'MM052', 'MM053', 'MM054', 'MM055', 'MM056', 'MM057', 'MM058', 'MM059', 'MM060',
        'MM061', 'MM062', 'MM063', 'MM064', 'MM065', 'MM066', 'MM067', 'MM068', 'MM069', 'MM070',
        'MM071', 'MM072', 'MM073', 'MM074', 'MM075', 'MM076', 'MM077', 'MM078', 'MM079', 'MM080',
        'MM081', 'MM082', 'MM083', 'MM084', 'MM085', 'MM086', 'MM087', 'MM088', 'MM089', 'MM090',
        'MM091', 'MM092', 'MM093', 'MM094', 'MM095', 'MM096', 'MM097', 'MM098', 'MM099', 'MM100'
    );
    IF v_count <> 100 THEN
        RAISE_APPLICATION_ERROR(-20004, '초기 영화 100편 확인에 실패했습니다.');
    END IF;
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('초기 영화 확인: ' || v_count || '편');
    DBMS_OUTPUT.PUT_LINE('이번에 추가: ' || v_inserted || '편 / 기존 영화는 유지');
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK TO mm_seed_start;
        RAISE;
END;
/
