CREATE TABLE Users (                        -- @TODO check: 예약어 충돌 방지를 위해 User->Users 로 변경
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    user_name VARCHAR(30) NOT NULL, -- used as nickname
    user_role enum('USER','ADMIN') NOT NULL DEFAULT 'USER',
    is_premium BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP DEFAULT NULL,
    is_active enum('active','waiting','blocked','suspend','delete') NOT NULL DEFAULT 'waiting');


-- User 와 1:N 카디널리티 적용
-- Role : User has Diary (1:N)
-- @TODO 제약조건: 사용자가 일기 다 지우기 전까지 계정 탈퇴 못함
CREATE TABLE Diary (
    id BIGINT AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    summary_title VARCHAR(255),
    context TEXT NOT NULL,
    is_negative BOOLEAN NOT NULL DEFAULT FALSE,
    alternative_thought TEXT,
    PRIMARY KEY (id),                           -- @TODO 검토 필요 : indexing 설정하기
    FOREIGN KEY (user_id) REFERENCES Users(id)
        ON DELETE RESTRICT ON UPDATE CASCADE    -- @TODO 검토 필요 : 일기 지우기 전까지 탈퇴 불가능
);


-- @TODO 제약조건: Report 는 삭제 안 되도록 유지
CREATE TABLE Report (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    context TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    summary_title VARCHAR(255) NOT NULL,
    change_process TEXT,
    FOREIGN KEY (user_id) REFERENCES Users(id)
        ON DELETE NO ACTION ON UPDATE CASCADE
);

-- Diary 와 Report 간의 M:N relation
CREATE TABLE Diary_Report_Link (
    diary_id BIGINT NOT NULL,
    report_id BIGINT NOT NULL,
    PRIMARY KEY (diary_id, report_id),
    FOREIGN KEY (diary_id) REFERENCES Diary(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,          -- @TODO 검토 필요
    FOREIGN KEY (report_id) REFERENCES Report(id)
        ON DELETE CASCADE ON UPDATE CASCADE            -- @TODO 검토 필요
);

-- 기본 설정 템플릿 생성
-- @TODO 검토 필요
CREATE TABLE Settings_option (
    id INT AUTO_INCREMENT,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    default_value TEXT NOT NULL,
    data_type ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON') NOT NULL,
    description VARCHAR(100),
    is_user_editable BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id)
);

-- USER custom option -> 약성 개체 집합으로 의존성 부여
-- 유저 정보나 설정 정보 변경시 validation 제약
-- @TODO 검토 필요
CREATE TABLE User_custom_setting (
    user_id BIGINT NOT NULL,
    setting_id INT NOT NULL,
    override_value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, setting_id),              -- @TODO 초기 로그인 때 토큰에 넣으면 될 듯 (user_id, setting_id)
    FOREIGN KEY (user_id) REFERENCES Users(id)
            ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (setting_id) REFERENCES Settings_option(id)
            ON DELETE CASCADE ON UPDATE CASCADE
 );


-- 로그인 관련 --> 실질적으로는 중복 계정 필터링 역할로만 사용 예정
-- 인증 공급자 릴레이션
CREATE TABLE Auth_Provider (
    id INT AUTO_INCREMENT,
    provider_name VARCHAR(50) NOT NULL DEFAULT 'SERVER',  -- @TODO 기본 제공자는 SERVER
    description VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (id)
);

-- 사용자 인증 정보 릴레이션
CREATE TABLE User_Authentication (
    user_id BIGINT NOT NULL,
    auth_provider_id INT NOT NULL,
    social_id VARCHAR(255) NOT NULL, -- Provider 제공 고유 id, 로컬 서버시에는 UUID 값
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, auth_provider_id, social_id),
    FOREIGN KEY (user_id) REFERENCES Users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (auth_provider_id) REFERENCES Auth_Provider(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE (auth_provider_id, social_id)
);

-- @ 인덱스 - start ---------------------------------------------------------------
-- 사용자 이메일 검색
CREATE INDEX idx_user_email ON Users(email);
-- 날짜별 일기 검색
CREATE INDEX idx_diary_date ON Diary(created_at);
-- 날짜로 보고서 검색
CREATE INDEX idx_report_date ON Report(updated_at);
-- 소셜 로그인 이메일 검색
-- CREATE INDEX idx_auth_email ON User_Authentication(email); -> UNIQUE 값이므로 중복
-- 사용자 일기 검색
CREATE INDEX idx_diary_and_userid ON Diary(user_id);
-- 사용자 날자별 일기 조회
-- 사용자별 날짜 기준 일기 조회
CREATE INDEX idx_diary_user_date ON Diary(user_id, created_at);
-- 사용자별 생성 날짜 기준 보고서 조회
CREATE INDEX idx_report_user_date ON Report(user_id, created_at);
-- 사용자별 최근 업데이트 날짜 기준 보고서 조회
CREATE INDEX idx_report_user_date_update ON Report(user_id, created_at);
-- 사용자별 부정적 일기 필터링
CREATE INDEX idx_diary_user_negative ON Diary(user_id, is_negative);
-- @ 인덱스 - end ---------------------------------------------------------------

