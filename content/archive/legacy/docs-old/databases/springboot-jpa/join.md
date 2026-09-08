
# JPA 연관관계 매핑

## 관계 소유권과 예제 판정

`@ManyToOne` 쪽은 일반적으로 외래 키를 보유하며, 양방향 관계에서는 `mappedBy`가 없는 쪽이 연관관계의 주인이다. `mappedBy`를 선언한 반대쪽은 관계 변경의 기준이 아니므로 두 객체의 참조를 함께 맞추는 편의 메서드가 필요할 수 있다. `referencedColumnName`으로 기본 키가 아닌 열을 참조하려면 대상 열의 식별성과 데이터베이스 제약을 먼저 확인한다. 아래 `${...}` 표기는 실제 엔티티·열·필드 이름으로 치환해야 하며, 컴파일과 생성 SQL 확인까지 마쳐야 예제 적용이 완료된다.

## 단방향 매핑
## N:1 mapping 
    @ManyToOne
    @JoinColumn(name = "post_id", nullable = false)
    private Post post;
## N:1 mapping (if referencedColumn is not primary key)
  
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "${현재 엔티티 FK 열}", referencedColumnName = "${대상 엔티티 참조 열}", insertable = false, updatable = false)
    private ${연관_엔티티_타입} ${필드명};

## 양방향 매핑

    객체의 두 관계 중 하나를 연관관계의 주인으로 지칭
    mappedBy (비주인 사용, 주인 지정하는 mappedBy)
    주인이 아닌 쪽은 읽기만 가능


    
