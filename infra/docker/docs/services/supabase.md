 n8n에서 벡터 DB로 활용하는 방법
  1. Supabase API 노드 대신 HTTP Request 노드 사용

      Method: POST/GET

      URL: http://supabase_rest:3000/documents

      Headers:

          Authorization: Bearer <직접 생성한 JWT 토큰>

      Body:

          임베딩 데이터, content 등

  2. 쿼리 예시

      문서 삽입:
      POST 요청으로 JSON body에 content, metadata, embedding(vector
  배열) 전달

      벡터 검색:
      match_documents 함수에 직접 SQL 실행(REST API로는 RPC 엔드포인트
  활용)

  참고 자료

      [Supabase 공식 벡터 DB 가이드]

  [pgvector 확장 및 벡터 테이블 생성]

  정리:

      n8n의 Supabase API 노드는 self-hosted PostgREST와 바로 호환되지
  않으니,
      반드시 "HTTP Request" 노드로 직접 REST 엔드포인트(/테이블명 또는
  /rpc/함수명)를 호출한다.

      Supabase(PostgreSQL)에서 벡터 DB를 쓰려면 pgvector 확장 설치,
  벡터 컬럼이 포함된 테이블 생성, 인덱스 및 검색 함수까지 설정하면
  됩니다

  Docker에 올라간 Supabase 컨테이너를 vector DB로 사용하기 위한
  테이블 구성

  Supabase(PostgreSQL)를 벡터 데이터베이스로 사용하려면 `pgvector`
  확장을 활성화하고, 임베딩을 저장할 `vector` 컬럼을 가진 테이블을
  생성한다.

  1. `supabase_db` 컨테이너의 PostgreSQL 프롬프트에 접속한다.

  ```bash
  docker exec -it supabase_db psql -U ${SUPABASE_DB_USER:-supabase_admin} -d ${SUPABASE_DB_NAME:-supabase}
  ```

  2. `pgvector` 확장을 활성화한다.

  ```sql
  CREATE EXTENSION IF NOT EXISTS pgvector;
  ```

  3. 문서 본문, 메타데이터, 벡터 임베딩을 저장할 테이블을 생성한다.

  ```sql
  CREATE TABLE documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT,
      metadata JSONB,
      embedding VECTOR(1536) -- OpenAI embedding 예시 차원
  );
  ```

  컬럼 구성:

  * `id` (UUID PRIMARY KEY): 각 문서의 고유 식별자이며
    `gen_random_uuid()`가 UUID를 자동 생성한다.
  * `content` (TEXT): 임베딩 대상 원문이다.
  * `metadata` (JSONB): source, author, creation date, categories 등
    필터링과 문맥 제공에 필요한 추가 메타데이터를 저장한다.
  * `embedding` (VECTOR(dimension)): pgvector가 제공하는 벡터 타입이다.
    dimension 값은 사용하는 임베딩 모델의 출력 차원과 일치해야 한다.

  4. 대규모 데이터셋의 유사도 검색 성능을 위해 인덱스를 추가한다.

  ```sql
  CREATE INDEX ON documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
  ```

  `vector_l2_ops`는 L2 거리(유클리드 거리)를 사용한다. 코사인 유사도가
  필요하면 `vector_cosine_ops`를 사용할 수 있다. `lists` 값은 데이터셋
  크기와 성능 요구에 맞춰 조정한다.

  SQL 실행이 끝나면 `documents` 테이블은 벡터 임베딩 저장과 검색에 사용할
  수 있다. psql 종료 명령은 `\q`이다.
