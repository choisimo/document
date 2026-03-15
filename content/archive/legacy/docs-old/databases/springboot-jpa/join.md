
# 단방향 매핑
## N:1 mapping 
    @ManyToOne
    @JoinColumn(name="post_id, nullable=false)
    private posts post
## N:1 mapping (if referencedColumn is not primary key)
  
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "${현재 entity column}", referencedColumnName = "${N 맵핑 entity column}, insertable = "false", updatable = "false")
    private ${entity}

# 양방향 매핑

    객체의 두 관계 중 하나를 연관관계의 주인으로 지칭
    mappedBy (비주인 사용, 주인 지정하는 mappedBy)
    주인이 아닌 쪽은 읽기만 가능


    
