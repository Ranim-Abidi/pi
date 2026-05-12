-- Emotion Analysis Tables Migration Script
-- Date: 2026-04-20
-- Purpose: Add emotion detection and analysis tables

-- Create emotion_analysis table
CREATE TABLE IF NOT EXISTS emotion_analysis (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    entretien_id BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'RUNNING' COMMENT 'RUNNING, COMPLETED, FAILED',
    total_frames INT NOT NULL DEFAULT 0,
    processed_frames INT NOT NULL DEFAULT 0,
    
    -- Facial emotion averages (0-100)
    avg_joy DOUBLE,
    avg_anger DOUBLE,
    avg_sadness DOUBLE,
    avg_surprise DOUBLE,
    avg_fear DOUBLE,
    avg_neutral DOUBLE,
    
    -- Voice analysis averages (0-100)
    avg_stress_level DOUBLE,
    avg_confidence DOUBLE,
    avg_pitch_variation DOUBLE,
    speaking_rate DOUBLE COMMENT 'Words per minute',
    silence_duration BIGINT COMMENT 'In seconds',
    
    -- Overall assessment
    dominat_emotion VARCHAR(32) COMMENT 'The most expressed emotion',
    engagement_score DOUBLE COMMENT '0-100',
    overall_assessment LONGTEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (entretien_id) REFERENCES entretiens(id) ON DELETE CASCADE,
    INDEX idx_entretien_id (entretien_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create emotion_frames table
CREATE TABLE IF NOT EXISTS emotion_frames (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    emotion_analysis_id BIGINT NOT NULL,
    frame_number INT NOT NULL,
    timestamp_seconds DOUBLE NOT NULL COMMENT 'Position in the interview video',
    
    -- Facial emotion detection scores (0-100)
    joy DOUBLE,
    anger DOUBLE,
    sadness DOUBLE,
    surprise DOUBLE,
    fear DOUBLE,
    neutral DOUBLE,
    face_detected BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Voice analysis for this frame
    voice_stress DOUBLE,
    voice_confidence DOUBLE,
    pitch DOUBLE COMMENT 'Hz',
    volume_level DOUBLE COMMENT 'dB',
    
    notes LONGTEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (emotion_analysis_id) REFERENCES emotion_analysis(id) ON DELETE CASCADE,
    INDEX idx_emotion_analysis_id (emotion_analysis_id),
    INDEX idx_frame_number (frame_number),
    INDEX idx_timestamp (timestamp_seconds),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
