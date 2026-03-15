// init/mongo-init.js

// 1. 루트 인증 (환경변수로 생성된 계정 사용)


// 2. 애플리케이션 전용 데이터베이스 생성
db = db.getSiblingDB('n8n_chat-caching');
print('Application database created: n8n_chat-caching');

// 3. 애플리케이션 전용 사용자 생성
db.createUser({
  user: 'n8n_user',
  pwd: 'n8n_password',
  roles: [
    { role: 'readWrite', db: 'n8n_chat-caching' },
    { role: 'dbAdmin', db: 'n8n_chat-caching' }
  ]
});
print('Application user created: n8n_user');

// 4. 초기 컬렉션 및 데이터 설정 (옵션)
db.createCollection('chat_history');
db.chat_history.insertOne({
  session_id: 'init',
  messages: [],
  created_at: new Date()
});
print('Initial collection "chat_history" created with sample document');

// 5. 샘플 인덱스 생성 (옵션)
db.chat_history.createIndex({ session_id: 1 }, { unique: true });
print('Unique index created on "session_id"');

// 6. 생성 결과 확인
printjson({
  databases: db.admin().listDatabases().databases.map(d => d.name),
  users: db.getUsers()
});

