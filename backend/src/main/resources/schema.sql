CREATE DATABASE IF NOT EXISTS universe
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE universe;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. schools
CREATE TABLE schools (
    school_id BIGINT NOT NULL AUTO_INCREMENT,
    school_name VARCHAR(100) NOT NULL,
    email_domain VARCHAR(100) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (school_id),
    UNIQUE KEY uk_schools_school_name (school_name),
    UNIQUE KEY uk_schools_email_domain (email_domain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. users
CREATE TABLE users (
    user_id BIGINT NOT NULL AUTO_INCREMENT,
    school_id BIGINT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(50) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    school_verified BOOLEAN NOT NULL DEFAULT FALSE,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    trust_score INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uk_users_email (email),
    KEY idx_users_school_id (school_id),
    KEY idx_users_account_status (account_status),
    CONSTRAINT fk_users_school FOREIGN KEY (school_id) REFERENCES schools(school_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. school_verifications
CREATE TABLE school_verifications (
    verification_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    school_id BIGINT NOT NULL,
    school_email VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (verification_id),
    KEY idx_school_verifications_user_id (user_id),
    KEY idx_school_verifications_school_id (school_id),
    KEY idx_school_verifications_status (status),
    CONSTRAINT fk_school_verifications_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_school_verifications_school FOREIGN KEY (school_id) REFERENCES schools(school_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. community_posts
CREATE TABLE community_posts (
    post_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    school_id BIGINT NOT NULL,
    category VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
    view_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id),
    KEY idx_community_posts_user_id (user_id),
    KEY idx_community_posts_school_created (school_id, created_at),
    KEY idx_community_posts_school_category (school_id, category),
    KEY idx_community_posts_status (status),
    CONSTRAINT fk_community_posts_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_community_posts_school FOREIGN KEY (school_id) REFERENCES schools(school_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. comments
CREATE TABLE comments (
    comment_id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    parent_comment_id BIGINT NULL,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (comment_id),
    KEY idx_comments_post_created (post_id, created_at),
    KEY idx_comments_user_id (user_id),
    KEY idx_comments_parent_comment_id (parent_comment_id),
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES community_posts(post_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 6. post_likes
CREATE TABLE post_likes (
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id),
    KEY idx_post_likes_user_id (user_id),
    CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES community_posts(post_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 7. hashtags
CREATE TABLE hashtags (
    hashtag_id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (hashtag_id),
    UNIQUE KEY uk_hashtags_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 8. post_hashtags
CREATE TABLE post_hashtags (
    post_id BIGINT NOT NULL,
    hashtag_id BIGINT NOT NULL,
    PRIMARY KEY (post_id, hashtag_id),
    KEY idx_post_hashtags_hashtag_id (hashtag_id),
    CONSTRAINT fk_post_hashtags_post FOREIGN KEY (post_id) REFERENCES community_posts(post_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_post_hashtags_hashtag FOREIGN KEY (hashtag_id) REFERENCES hashtags(hashtag_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 9. market_items
CREATE TABLE market_items (
    item_id BIGINT NOT NULL AUTO_INCREMENT,
    seller_id BIGINT NOT NULL,
    school_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(30) NOT NULL,
    item_condition VARCHAR(20) NOT NULL,
    purchase_price BIGINT NOT NULL,
    listed_price BIGINT NOT NULL,
    description TEXT NOT NULL,
    trade_status VARCHAR(20) NOT NULL DEFAULT 'SELLING',
    ai_status VARCHAR(20) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id),
    KEY idx_market_items_seller_id (seller_id),
    KEY idx_market_items_school_status_created (school_id, trade_status, created_at),
    KEY idx_market_items_school_category (school_id, category),
    CONSTRAINT fk_market_items_seller FOREIGN KEY (seller_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_market_items_school FOREIGN KEY (school_id) REFERENCES schools(school_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 10. market_item_images
CREATE TABLE market_item_images (
    image_id BIGINT NOT NULL AUTO_INCREMENT,
    item_id BIGINT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    image_order INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (image_id),
    KEY idx_market_item_images_item_order (item_id, image_order),
    CONSTRAINT fk_market_item_images_item FOREIGN KEY (item_id) REFERENCES market_items(item_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 11. market_item_favorites
CREATE TABLE market_item_favorites (
    item_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, user_id),
    KEY idx_market_item_favorites_user_id (user_id),
    CONSTRAINT fk_market_item_favorites_item FOREIGN KEY (item_id) REFERENCES market_items(item_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_market_item_favorites_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 12. ai_risk_analyses
CREATE TABLE ai_risk_analyses (
    analysis_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    item_id BIGINT NULL,
    input_text TEXT NOT NULL,
    result VARCHAR(20) NOT NULL,
    risk_score DECIMAL(5,4) NULL,
    detected_types JSON NULL,
    model_version VARCHAR(50) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (analysis_id),
    KEY idx_ai_risk_analyses_user_id (user_id),
    KEY idx_ai_risk_analyses_item_id (item_id),
    KEY idx_ai_risk_analyses_result_created (result, created_at),
    CONSTRAINT fk_ai_risk_analyses_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ai_risk_analyses_item FOREIGN KEY (item_id) REFERENCES market_items(item_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 13. chat_requests
CREATE TABLE chat_requests (
    request_id BIGINT NOT NULL AUTO_INCREMENT,
    requester_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    item_id BIGINT NULL,
    post_id BIGINT NULL,
    profile_mode VARCHAR(20) NOT NULL DEFAULT 'VERIFIED',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME NULL,
    PRIMARY KEY (request_id),
    KEY idx_chat_requests_requester_id (requester_id),
    KEY idx_chat_requests_receiver_status (receiver_id, status),
    KEY idx_chat_requests_item_id (item_id),
    KEY idx_chat_requests_post_id (post_id),
    CONSTRAINT fk_chat_requests_requester FOREIGN KEY (requester_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_chat_requests_receiver FOREIGN KEY (receiver_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_chat_requests_item FOREIGN KEY (item_id) REFERENCES market_items(item_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_chat_requests_post FOREIGN KEY (post_id) REFERENCES community_posts(post_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 14. chat_rooms
CREATE TABLE chat_rooms (
    room_id BIGINT NOT NULL AUTO_INCREMENT,
    request_id BIGINT NOT NULL,
    item_id BIGINT NULL,
    profile_mode VARCHAR(20) NOT NULL DEFAULT 'VERIFIED',
    room_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id),
    UNIQUE KEY uk_chat_rooms_request_id (request_id),
    KEY idx_chat_rooms_item_id (item_id),
    KEY idx_chat_rooms_status (room_status),
    CONSTRAINT fk_chat_rooms_request FOREIGN KEY (request_id) REFERENCES chat_requests(request_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_chat_rooms_item FOREIGN KEY (item_id) REFERENCES market_items(item_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 15. chat_members
CREATE TABLE chat_members (
    room_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    last_read_message_id BIGINT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    KEY idx_chat_members_user_id (user_id),
    CONSTRAINT fk_chat_members_room FOREIGN KEY (room_id) REFERENCES chat_rooms(room_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_chat_members_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 16. messages
CREATE TABLE messages (
    message_id BIGINT NOT NULL AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    sender_id BIGINT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT',
    content TEXT NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id),
    KEY idx_messages_room_message (room_id, message_id),
    KEY idx_messages_sender_id (sender_id),
    CONSTRAINT fk_messages_room FOREIGN KEY (room_id) REFERENCES chat_rooms(room_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE chat_members
    ADD CONSTRAINT fk_chat_members_last_read_message
    FOREIGN KEY (last_read_message_id)
    REFERENCES messages(message_id)
    ON UPDATE CASCADE
    ON DELETE SET NULL;

-- 17. trades
CREATE TABLE trades (
    trade_id BIGINT NOT NULL AUTO_INCREMENT,
    item_id BIGINT NOT NULL,
    seller_id BIGINT NOT NULL,
    buyer_id BIGINT NOT NULL,
    listed_price BIGINT NOT NULL,
    final_price BIGINT NULL,
    seller_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    buyer_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'TRADING',
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trade_id),
    KEY idx_trades_item_id (item_id),
    KEY idx_trades_seller_id (seller_id),
    KEY idx_trades_buyer_id (buyer_id),
    KEY idx_trades_status (status),
    KEY idx_trades_completed_at (completed_at),
    CONSTRAINT fk_trades_item FOREIGN KEY (item_id) REFERENCES market_items(item_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_trades_seller FOREIGN KEY (seller_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_trades_buyer FOREIGN KEY (buyer_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 18. reports
CREATE TABLE reports (
    report_id BIGINT NOT NULL AUTO_INCREMENT,
    reporter_id BIGINT NOT NULL,
    target_user_id BIGINT NOT NULL,
    trade_id BIGINT NULL,
    item_id BIGINT NULL,
    post_id BIGINT NULL,
    report_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    admin_id BIGINT NULL,
    admin_note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    PRIMARY KEY (report_id),
    KEY idx_reports_reporter_id (reporter_id),
    KEY idx_reports_target_user_id (target_user_id),
    KEY idx_reports_status_created (status, created_at),
    KEY idx_reports_trade_id (trade_id),
    KEY idx_reports_item_id (item_id),
    KEY idx_reports_post_id (post_id),
    KEY idx_reports_admin_id (admin_id),
    CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reports_target_user FOREIGN KEY (target_user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_reports_trade FOREIGN KEY (trade_id) REFERENCES trades(trade_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_reports_item FOREIGN KEY (item_id) REFERENCES market_items(item_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_reports_post FOREIGN KEY (post_id) REFERENCES community_posts(post_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_reports_admin FOREIGN KEY (admin_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 19. report_evidences
CREATE TABLE report_evidences (
    evidence_id BIGINT NOT NULL AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (evidence_id),
    KEY idx_report_evidences_report_id (report_id),
    CONSTRAINT fk_report_evidences_report FOREIGN KEY (report_id) REFERENCES reports(report_id)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 20. trust_histories
CREATE TABLE trust_histories (
    trust_history_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    trade_id BIGINT NULL,
    report_id BIGINT NULL,
    before_score INT NOT NULL,
    change_amount INT NOT NULL,
    after_score INT NOT NULL,
    reason VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trust_history_id),
    KEY idx_trust_histories_user_created (user_id, created_at),
    KEY idx_trust_histories_trade_id (trade_id),
    KEY idx_trust_histories_report_id (report_id),
    CONSTRAINT fk_trust_histories_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_trust_histories_trade FOREIGN KEY (trade_id) REFERENCES trades(trade_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_trust_histories_report FOREIGN KEY (report_id) REFERENCES reports(report_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 21. user_sanctions
CREATE TABLE user_sanctions (
    sanction_id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    admin_id BIGINT NOT NULL,
    report_id BIGINT NULL,
    sanction_type VARCHAR(30) NOT NULL,
    reason TEXT NOT NULL,
    start_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (sanction_id),
    KEY idx_user_sanctions_user_id (user_id),
    KEY idx_user_sanctions_admin_id (admin_id),
    KEY idx_user_sanctions_report_id (report_id),
    KEY idx_user_sanctions_end_at (end_at),
    CONSTRAINT fk_user_sanctions_user FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_user_sanctions_admin FOREIGN KEY (admin_id) REFERENCES users(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_user_sanctions_report FOREIGN KEY (report_id) REFERENCES reports(report_id)
        ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SET FOREIGN_KEY_CHECKS = 1;

SHOW TABLES;
