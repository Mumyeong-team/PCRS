CREATE DATABASE IF NOT EXISTS pcrs_db
DEFAULT CHARACTER SET utf8mb4
COLLATE utf8mb4_general_ci;

USE pcrs_db;

CREATE TABLE IF NOT EXISTS guest_session (
    session_id VARCHAR(100) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS body_analysis (
    analysis_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,

    shoulder_width DOUBLE,
    waist_width DOUBLE,
    upper_body_length DOUBLE,
    lower_body_length DOUBLE,
    arm_length DOUBLE,
    upper_lower_ratio DOUBLE,
    shoulder_waist_ratio DOUBLE,
    body_type VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id)
        REFERENCES guest_session(session_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recommendation_result (
    recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    analysis_id INT NOT NULL,

    recommended_style TEXT,
    recommendation_reason TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id)
        REFERENCES guest_session(session_id)
        ON DELETE CASCADE,

    FOREIGN KEY (analysis_id)
        REFERENCES body_analysis(analysis_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS fitting_result (
    fitting_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    recommendation_id INT,

    composite_image_path TEXT,
    avatar_3d_path TEXT,
    fitting_status VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id)
        REFERENCES guest_session(session_id)
        ON DELETE CASCADE,

    FOREIGN KEY (recommendation_id)
        REFERENCES recommendation_result(recommendation_id)
        ON DELETE SET NULL
);
