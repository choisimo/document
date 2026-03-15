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
  /rpc/함수명)를 호출해야 합니다.

      Supabase(PostgreSQL)에서 벡터 DB를 쓰려면 pgvector 확장 설치,
  벡터 컬럼이 포함된 테이블 생성, 인덱스 및 검색 함수까지 설정하면
  됩니다

  vector DB 으로 현재 docker 에 올린 supabase container 사용하려고
  하는데 테이블 뭐 만들어야 해??

✦ Okay, to use your Supabase (PostgreSQL) container as a vector
  database, you'll need to:


   1. Enable the `pgvector` extension: This extension provides the vector
      data type and functions for similarity search.
   2. Create a table with a `vector` column: This column will store your
      embeddings.

  Here are the SQL commands you need to run inside your supabase_db
  container:

  Step 1: Enable the pgvector extension


  First, connect to your supabase_db container's PostgreSQL prompt.
  You'll need to open a new terminal and run:


   1 docker exec -it supabase_db psql -U
     ${SUPABASE_DB_USER:-supabase_admin} -d
     ${SUPABASE_DB_NAME:-supabase}



  Once you are at the psql prompt (e.g., supabase=>), execute the
  following SQL command:


   1 CREATE EXTENSION IF NOT EXISTS pgvector;


  This command enables the pgvector extension in your database.

  Step 2: Create your Vector Table


  After enabling the extension, you can create a table to store your
  documents, their metadata, and their vector embeddings.

  Here's an example CREATE TABLE statement for a documents table:



   1 CREATE TABLE documents (
   2     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   3     content TEXT,
   4     metadata JSONB,
   5     embedding VECTOR(1536) -- Adjust dimension (e.g., 1536
     for OpenAI embeddings)
   6 );


  Explanation of the table columns:


   * `id` (UUID PRIMARY KEY): A unique identifier for each document.
     gen_random_uuid() automatically generates a UUID.
   * `content` (TEXT): The original text content of the document. This
     is what you'll embed.
   * `metadata` (JSONB): A flexible JSONB column to store any
     additional metadata about your document (e.g., source, author,
     creation date, categories). This is useful for filtering or
     providing context.
   * `embedding` (VECTOR(dimension)): This is the core of your vector
     database.
       * VECTOR is the data type provided by pgvector.
       * dimension (e.g., 1536) is the size of your embedding vectors.
         This must match the output dimension of the embedding model
         you are using (e.g., OpenAI's text-embedding-ada-002 produces
         1536-dimensional vectors).


  Step 3: (Optional) Add an Index for Faster Similarity Search

  For efficient similarity searches on large datasets, you'll want to
  add an index to your embedding column. Common index types for vector
   search include IVFFlat or HNSW.


  Here's an example using IVFFlat (you'll need to choose appropriate
  lists and probes values based on your dataset size and performance
  needs):


   1 CREATE INDEX ON documents USING ivfflat (embedding
     vector_l2_ops) WITH (lists = 100);



   * vector_l2_ops: Specifies the L2 distance (Euclidean distance) for
     similarity. Other options like vector_cosine_ops (cosine
     similarity) are available.
   * lists: The number of inverted lists. A good starting point is
     sqrt(number_of_rows).


  After executing these SQL commands, your documents table will be
  ready to store and search vector embeddings. Remember to exit psql
  by typing \q.

