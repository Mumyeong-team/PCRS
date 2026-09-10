CREATE DATABASE IF NOT EXISTS pcrs_db
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_general_ci;

USE pcrs_db;

-- 1. 세션 정보
CREATE TABLE IF NOT EXISTS guest_session (
    session_id VARCHAR(100) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id)
);

-- 2. 신체 분석 결과
-- ⚠️ 2026.09 수정: 실제 로컬 DB(DESCRIBE로 검증됨)에 맞게 컬럼 전면 변경
CREATE TABLE IF NOT EXISTS body_analysis (
    analysis_id INT NOT NULL AUTO_INCREMENT,
    session_id VARCHAR(100) NOT NULL,
    shoulder_width FLOAT,
    waist_width FLOAT,
    hip_width FLOAT,
    upper_body_length FLOAT,
    lower_body_length FLOAT,
    arm_length FLOAT,
    leg_length_avg FLOAT,
    upper_lower_ratio FLOAT,
    shoulder_waist_ratio FLOAT,
    body_type VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (analysis_id),
    CONSTRAINT fk_body_analysis_session
        FOREIGN KEY (session_id)
        REFERENCES guest_session(session_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3. 옷 라이브러리
CREATE TABLE IF NOT EXISTS clothing_library (
    id INT NOT NULL AUTO_INCREMENT,
    item_type VARCHAR(20) NOT NULL,       -- top / bottom
    item_name VARCHAR(100) NOT NULL,
    brand VARCHAR(100),
    color VARCHAR(50),
    size_label VARCHAR(30),
    image_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- 4. 추천 결과
-- ⚠️ 2026.09 수정: 실제 로컬 DB(DESCRIBE로 검증됨)에 맞게 컬럼 전면 변경
--    top_clothing_id / bottom_clothing_id는 clothing_library를 가리키는 것으로 추정 (실제 FK 제약 여부는 미확인)
CREATE TABLE IF NOT EXISTS recommendation_result (
    recommendation_id INT NOT NULL AUTO_INCREMENT,
    session_id VARCHAR(100) NOT NULL,
    analysis_id INT,
    top_clothing_id INT,
    bottom_clothing_id INT,
    recommended_style TEXT,
    recommendation_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (recommendation_id),
    CONSTRAINT fk_recommendation_result_session
        FOREIGN KEY (session_id)
        REFERENCES guest_session(session_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_recommendation_result_analysis
        FOREIGN KEY (analysis_id)
        REFERENCES body_analysis(analysis_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_recommendation_result_top
        FOREIGN KEY (top_clothing_id)
        REFERENCES clothing_library(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_recommendation_result_bottom
        FOREIGN KEY (bottom_clothing_id)
        REFERENCES clothing_library(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- 5. 피팅(합성) 결과
-- ⚠️ 2026.09 수정: 실제 로컬 DB(DESCRIBE로 검증됨)에 맞게 컬럼 전면 변경
--    PK 컬럼명이 id가 아니라 fitting_id임에 주의
CREATE TABLE IF NOT EXISTS fitting_result (
    fitting_id INT NOT NULL AUTO_INCREMENT,
    session_id VARCHAR(100) NOT NULL,
    recommendation_id INT,
    composite_image_path VARCHAR(255),
    avatar_3d_path VARCHAR(255),
    fitting_status VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (fitting_id),
    CONSTRAINT fk_fitting_result_session
        FOREIGN KEY (session_id)
        REFERENCES guest_session(session_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_fitting_result_recommendation
        FOREIGN KEY (recommendation_id)
        REFERENCES recommendation_result(recommendation_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);
