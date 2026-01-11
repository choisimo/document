create table emotion.USERS
(
    user_id       int auto_increment
        primary key,
    username      varchar(50)                           not null,
    email         varchar(100)                          not null,
    password_hash varchar(255)                          not null,
    created_at    timestamp default current_timestamp() null,
    last_login    timestamp                             null,
    preferences   longtext collate utf8mb4_bin          null
        check (json_valid(`preferences`)),
    constraint email
        unique (email),
    constraint chk_email
        check (`email` like '%@%.%')
);

create table emotion.JOURNALS
(
    journal_id int auto_increment
        primary key,
    user_id    int                                    not null,
    created_at timestamp  default current_timestamp() null,
    content    text                                   not null,
    metadata   longtext collate utf8mb4_bin           null
        check (json_valid(`metadata`)),
    is_deleted tinyint(1) default 0                   null,
    constraint JOURNALS_ibfk_1
        foreign key (user_id) references emotion.USERS (user_id)
            on delete cascade
);

create table emotion.EMOTION_ANALYSES
(
    analysis_id    int auto_increment
        primary key,
    journal_id     int                                   not null,
    emotion_scores longtext collate utf8mb4_bin          not null
        check (json_valid(`emotion_scores`)),
    is_negative    tinyint(1)                            null,
    severity_level int                                   null
        check (`severity_level` between 1 and 10),
    created_at     timestamp default current_timestamp() null,
    raw_analysis   longtext collate utf8mb4_bin          null
        check (json_valid(`raw_analysis`)),
    constraint EMOTION_ANALYSES_ibfk_1
        foreign key (journal_id) references emotion.JOURNALS (journal_id)
            on delete cascade
);

create table emotion.COGNITIVE_PATTERNS
(
    pattern_id         int auto_increment
        primary key,
    analysis_id        int                                                  not null,
    pattern_type       enum ('흑백논리', '과잉일반화', '재앙화', '감정적추론', '마음읽기', '기타') not null,
    distortion_content text                                                 not null,
    alternatives       longtext collate utf8mb4_bin                         null
        check (json_valid(`alternatives`)),
    confidence_score   int                                                  null
        check (`confidence_score` between 1 and 100),
    constraint COGNITIVE_PATTERNS_ibfk_1
        foreign key (analysis_id) references emotion.EMOTION_ANALYSES (analysis_id)
            on delete cascade
);

create index idx_analysis_pattern
    on emotion.COGNITIVE_PATTERNS (analysis_id, pattern_type);

create index idx_journal_created
    on emotion.EMOTION_ANALYSES (journal_id, created_at);

create index idx_user_created
    on emotion.JOURNALS (user_id, created_at);

create table emotion.RECOMMENDATIONS
(
    recommendation_id int auto_increment
        primary key,
    analysis_id       int                                        not null,
    rec_type          enum ('활동', '인지재구성', '마음챙김', '사회활동', '기타') not null,
    content           text                                       not null,
    is_completed      tinyint(1) default 0                       null,
    created_at        timestamp  default current_timestamp()     null,
    constraint RECOMMENDATIONS_ibfk_1
        foreign key (analysis_id) references emotion.EMOTION_ANALYSES (analysis_id)
            on delete cascade
);

create table emotion.ACTIVITIES
(
    activity_id       int auto_increment
        primary key,
    user_id           int                                         not null,
    recommendation_id int                                         null,
    status            enum ('계획', '진행중', '완료', '취소') default '계획' null,
    started_at        timestamp                                   null,
    completed_at      timestamp                                   null,
    feedback          text                                        null,
    constraint ACTIVITIES_ibfk_1
        foreign key (user_id) references emotion.USERS (user_id)
            on delete cascade,
    constraint ACTIVITIES_ibfk_2
        foreign key (recommendation_id) references emotion.RECOMMENDATIONS (recommendation_id)
            on delete set null,
    check (`completed_at` is null or `completed_at` >= `started_at`)
);

create index idx_user_status
    on emotion.ACTIVITIES (user_id, status);

create index recommendation_id
    on emotion.ACTIVITIES (recommendation_id);

create index idx_analysis_type
    on emotion.RECOMMENDATIONS (analysis_id, rec_type);

