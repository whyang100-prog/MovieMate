package com.moviemate.controller;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/movies")
public class MovieController {

    private final JdbcTemplate jdbcTemplate;

    public MovieController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public List<Map<String, Object>> getMovies() {
        String sql = """
            SELECT movie_id AS "movieId",
                   catalog_code AS "catalogCode",
                   title,
                   title_en AS "titleEn",
                   release_year AS "releaseYear",
                   poster_url AS "posterUrl"
            FROM MM_MOVIE
            ORDER BY catalog_code
            """;

        return jdbcTemplate.queryForList(sql);
    }
}