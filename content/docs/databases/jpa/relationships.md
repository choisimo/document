# JPA Entity Relationships 학습 및 기록 노트

## 1. 왜 필요한가? (Pain Point & Motivation)

JPA 관계 매핑은 Java object reference와 database foreign key를 연결하는 계약이다. 단방향/양방향 관계, owner side, `mappedBy`, fetch type, cascade, orphan removal을 정확히 이해하지 못하면 FK가 갱신되지 않거나 N+1 query, JSON infinite recursion, 의도하지 않은 delete가 발생한다.

이 문서는 원문의 JPA/Hibernate relationship mapping 내용을 owner side와 data consistency 중심으로 재작성한다.

## 2. 현재 나의 상태 (Baseline)

- `@ManyToOne`, `@OneToMany`, `@OneToOne`, `@ManyToMany` annotation은 알고 있다.
- 관계의 주인이 foreign key를 관리한다는 점을 더 명확히 해야 한다.
- `mappedBy`가 붙은 inverse side는 관계 변경 권한이 없다는 점을 습관화해야 한다.
- Lazy loading, fetch join, cascade, orphan removal의 위험을 함께 이해해야 한다.
- 양방향 관계에서 helper method로 양쪽 object graph를 동기화해야 한다.

## 3. 도달하고 싶은 목표 (Target State)

- 관계 유형별 DB FK 위치와 JPA owner side를 구분한다.
- 단방향 `ManyToOne`을 기본 관계로 이해한다.
- 양방향 `OneToMany`/`ManyToOne`에서 `mappedBy`와 helper method를 올바르게 사용한다.
- `FetchType.LAZY`를 기본으로 두고 필요한 query에서 명시적으로 fetch한다.
- Cascade와 orphan removal을 aggregate boundary 안에서만 제한적으로 사용한다.

## 4. 시스템 번역 (Data Flow)

```mermaid
flowchart TD
    A[Java object reference 변경] --> B{Owner side인가?}
    B -->|yes| C[Foreign key update SQL 생성]
    B -->|no mappedBy| D[DB 관계 변경 없음]
    C --> E[(Database FK)]
    D --> F[In-memory graph만 변경]
    E --> G[Persistence context flush]
    F --> H[불일치 위험]
```

JPA에서 관계를 바꿨다는 것은 object reference를 바꾼 것만이 아니라, owner side가 관리하는 FK 값이 flush 시 SQL로 반영된다는 뜻이다.

## 5. 핵심 구성요소 (Building Blocks)

| 구성요소 | 역할 | 주의점 |
| --- | --- | --- |
| `@ManyToOne` | 여러 child가 하나의 parent를 참조 | 보통 FK owner side |
| `@OneToMany` | parent가 child collection 보유 | `mappedBy`이면 inverse side |
| `@OneToOne` | 1:1 association | FK 소유 side 결정 필요 |
| `@ManyToMany` | join table 기반 N:M | 실무에서는 join entity 선호 |
| `@JoinColumn` | FK column 지정 | nullable/unique 제약과 일치 |
| `mappedBy` | inverse side 표시 | 관계 변경 SQL을 만들지 않음 |
| `FetchType.LAZY` | 접근 시점에 로딩 | transaction boundary 필요 |
| Cascade | parent operation 전파 | remove 전파 주의 |
| orphanRemoval | collection에서 빠진 child 삭제 | aggregate 내부에만 적합 |

## 6. 상태 전이 (State Transition)

```mermaid
stateDiagram-v2
    [*] --> DetachedGraph
    DetachedGraph --> ManagedGraph: load/persist
    ManagedGraph --> AssociationChanged: owner side 변경
    AssociationChanged --> SyncedInMemory: helper로 양방향 동기화
    SyncedInMemory --> Flushed: transaction flush
    Flushed --> DatabaseUpdated
    DatabaseUpdated --> [*]
```

양방향 관계에서는 DB에 반영되는 owner side와 Java object graph를 편하게 탐색하기 위한 inverse side를 모두 일관되게 맞춰야 한다.

## 7. 불변식 (Invariant: 절대 깨지면 안 되는 규칙)

- FK를 가진 owner side가 관계 변경의 기준이다.
- `mappedBy`가 붙은 inverse side만 수정하면 DB FK는 바뀌지 않는다.
- 양방향 관계 helper method는 양쪽 reference/collection을 함께 갱신해야 한다.
- 기본 전략은 `LAZY`로 두고 필요한 query에서 fetch join 또는 entity graph를 사용한다.
- Cascade remove와 orphan removal은 child lifecycle이 parent에 종속될 때만 사용한다.
- Collection fetch join과 pagination을 함께 사용할 때 결과 왜곡과 메모리 처리 위험을 확인해야 한다.
- Entity를 JSON으로 바로 노출하면 양방향 관계에서 infinite recursion이 생길 수 있다.

## 8. 가장 작은 예제 (Minimal Viable Example)

```java
@Entity
public class Comment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;

    public void setPost(Post post) {
        this.post = post;
    }
}

@Entity
public class Post {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Comment> comments = new ArrayList<>();

    public void addComment(Comment comment) {
        comments.add(comment);
        comment.setPost(this);
    }
}
```

이 예제에서 FK owner는 `Comment.post`다. `Post.comments`는 `mappedBy` inverse side이므로 helper method가 `comment.setPost(this)`를 호출해야 DB 관계도 갱신된다.

## 9. 실패 사례 (What could go wrong?)

- `post.getComments().add(comment)`만 호출하고 `comment.setPost(post)`를 하지 않아 FK가 null로 남는다.
- 모든 관계를 EAGER로 두어 조회 하나가 큰 object graph 전체를 끌고 온다.
- Fetch join 없이 parent 목록에서 child collection을 반복 접근해 N+1 query가 발생한다.
- CascadeType.REMOVE를 공유 child 관계에 걸어 다른 aggregate의 데이터까지 삭제한다.
- `@ManyToMany`에 추가 속성이 필요한데 join entity 없이 직접 mapping해 확장성이 막힌다.
- Entity를 그대로 JSON serialize해 양방향 관계가 무한 순환한다.

## 10. 뇌 확장하기 (Evolution & Variants)

- N:M 관계는 join entity로 풀어 `StudentCourse` 같은 entity에 생성일, 상태, 역할을 담는 방식을 검토한다.
- Fetch 전략은 fetch join, entity graph, batch size, DTO projection을 비교한다.
- Aggregate boundary를 기준으로 cascade와 orphan removal 사용 범위를 정한다.
- JSON 응답은 entity 직접 노출 대신 DTO projection 또는 mapper를 사용한다.
- QueryDSL과 함께 association path를 type-safe하게 탐색할 수 있다.

## 11. 최종 체크리스트 (Definition of Done)

- [x] JPA relationship type과 owner/inverse side를 정리했다.
- [x] `mappedBy`, `@JoinColumn`, fetch, cascade, orphanRemoval의 역할을 설명했다.
- [x] 양방향 helper method 최소 예제를 포함했다.
- [x] N+1, JSON recursion, cascade delete 같은 실패 사례를 정리했다.
- [x] 원문 relationships 문서를 12개 섹션 템플릿으로 재작성했다.

## 12. 뇌에 새기는 복습 문장 (TL;DR Blank)

JPA 관계 매핑에서 DB를 바꾸는 쪽은 object graph에서 보기 편한 쪽이 아니라 foreign key를 가진 owner side다.
