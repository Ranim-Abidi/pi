-- Baseline migration: enable Flyway with FLYWAY_ENABLED=true and add real DDL in subsequent versions.
CREATE TABLE IF NOT EXISTS flyway_jobmatch_marker (
    id TINYINT NOT NULL PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT IGNORE INTO flyway_jobmatch_marker (id) VALUES (1);
