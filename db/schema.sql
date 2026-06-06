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
CREATE TABLE IF NOT EXISTS body_analysis (
    id INT NOT NULL AUTO_INCREMENT,
    session_id VARCHAR(100) NOT NULL,
    front_landmarks LONGTEXT,
    side_landmarks LONGTEXT,
    body_result LONGTEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
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

-- 4. 피팅(합성) 결과
CREATE TABLE IF NOT EXISTS fitting_result (
    id INT NOT NULL AUTO_INCREMENT,
    session_id VARCHAR(100) NOT NULL,
    top_image_path VARCHAR(255),
    bottom_image_path VARCHAR(255),
    outfit_result_path VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_fitting_result_session
        FOREIGN KEY (session_id)
        REFERENCES guest_session(session_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 5. 추천 결과
CREATE TABLE IF NOT EXISTS recommendation_result (
    id INT NOT NULL AUTO_INCREMENT,
    session_id VARCHAR(100) NOT NULL,
    recommendation_text TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_recommendation_result_session
        FOREIGN KEY (session_id)
        REFERENCES guest_session(session_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
