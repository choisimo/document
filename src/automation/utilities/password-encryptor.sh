#!/bin/bash

# 암호화 키 설정
SECRET_KEY="your-secret-key"

# 사용자에게 비밀번호 입력 요청
echo "암호화 할 비밀번호를 입력하세요:"
read -s plain_password

echo "비밀번호 이름을 입력하세요:"
 read -s password_name

# 입력값이 비어 있는지 확인
if [ -z "$plain_password" ]; then
  echo "비밀번호가 입력되지 않았습니다. 스크립트를 종료합니다."
  exit 1
fi

# 비밀번호 암호화 및 .env에 저장
echo -n "$password_name=" >> .env
echo -n "$plain_password" | openssl enc -aes-256-cbc -e -a -pbkdf2 -salt -pass pass:"$SECRET_KEY" >> .env

# 암호화 완료 메시지
echo
echo ".env 파일에 암호화된 비밀번호가 저장되었습니다."

# 복호화 방법 안내
echo
echo "복호화 방법:"
echo "cat .env | cut -d '=' -f 2 | openssl enc -aes-256-cbc -d -a -pbkdf2 -salt -pass pass:${SECRET_KEY}"
