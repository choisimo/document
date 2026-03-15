# Gemini API 호출 스크립트 개선: 사용자 친화적 출력을 위한 최적화

여러분이 작성한 Gemini API 호출 스크립트를 분석하고 더 사용자 친화적으로 개선했습니다. 원본 스크립트는 기본적인 API 호출 기능을 제공하지만, 출력 형식과 오류 처리 등 여러 부분에서 개선이 가능합니다. 아래에서 세 가지 다른 버전의 개선된 스크립트를 제안하고 각각의 특징을 설명드리겠습니다.

## 기존 스크립트 분석

현재 스크립트는 다음과 같은 기능을 제공합니다:

- 사용자가 `-p`, `-t`, `-m` 옵션을 통해 프롬프트, 온도, 최대 토큰을 설정할 수 있음
- JSON 템플릿을 사용하여 API 요청 데이터 구성
- `jq`가 설치되어 있으면 이를 활용하고, 없으면 `sed`를 사용하는 대체 로직 제공
- curl을 사용한 API 호출

하지만 몇 가지 개선이 필요한 부분이 있습니다:

- 응답 데이터가 가공 없이 그대로 출력됨
- 오류 처리가 미흡함
- 입력값 검증 부족
- API 키 검증 부족

## 버전 1: 기본 개선 스크립트

```bash
#!/bin/bash

help()
{
  echo "Usage: ./script.sh -p 'prompt' -t 'temperature 0-1' -m 'max tokens' -h"
  echo
  echo "Options:"
  echo "  -p 'prompt'       Text prompt for Gemini API (required)"
  echo "  -t 'temperature'  Temperature setting (0-1) for randomness (default: 0.7)"
  echo "  -m 'max tokens'   Maximum number of output tokens (default: 800)"
  echo "  -h                Display this help message"
  echo
  echo "Example: ./script.sh -p 'Tell me a joke' -t 0.8 -m 1000"
  exit 0
}

# API 키 확인
check_api_key() {
  if [ -z "$GEMINI_API_KEY" ]; then
    echo "Error: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다."
    echo "다음 명령으로 설정하세요: export GEMINI_API_KEY='your-api-key-here'"
    exit 1
  fi
}

# jq 설치 확인
check_jq() {
  if ! command -v jq &> /dev/null; then
    echo "Warning: jq가 설치되어 있지 않습니다. 출력이 예쁘게 포맷되지 않을 수 있습니다."
    echo "jq 설치 방법:"
    echo "  Debian/Ubuntu: sudo apt install jq"
    echo "  CentOS/RHEL: sudo yum install jq"
    echo "  macOS: brew install jq"
    return 1
  fi
  return 0
}

# 기본 JSON 템플릿
JSON_TEMPLATE='{
  "contents": [{
    "parts":[{"text": ""}]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 800
  }
}'

# 변수 초기화
PROMPT=""
TEMPERATURE=""
MAX_TOKENS=""

# 인자가 없으면 도움말 표시
if [ $# -eq 0 ]; then
  help
fi

# 매개변수 파싱
while getopts "p:t:m:h" opt; do
  case $opt in
    p) PROMPT="$OPTARG" ;;
    t) TEMPERATURE="$OPTARG" ;;
    m) MAX_TOKENS="$OPTARG" ;;
    h) help ;;
    *) echo "Invalid option: -$OPTARG" >&2; help ;;
  esac
done

# 프롬프트 확인
if [ -z "$PROMPT" ]; then
  echo "Error: 프롬프트(-p)는 필수입니다."
  help
fi

# 온도 값 검증
if [ -n "$TEMPERATURE" ]; then
  if ! [[ "$TEMPERATURE" =~ ^[0-9]*\.?[0-9]+$ ]] || (( $(echo "$TEMPERATURE  1" | bc -l) )); then
    echo "Error: 온도 값은 0과 1 사이의 숫자여야 합니다."
    exit 1
  fi
fi

# 최대 토큰 검증
if [ -n "$MAX_TOKENS" ]; then
  if ! [[ "$MAX_TOKENS" =~ ^[0-9]+$ ]]; then
    echo "Error: 최대 토큰 값은 양의 정수여야 합니다."
    exit 1
  fi
fi

# API 키 확인
check_api_key

# jq 설치 확인
has_jq=$(check_jq)

# JSON 데이터 생성
if command -v jq &> /dev/null; then
  # jq를 사용하여 데이터 생성
  JSON_DATA=$(echo "$JSON_TEMPLATE" | jq --arg prompt "$PROMPT" '.contents.parts.text = $prompt')
  
  # 온도 값 업데이트
  if [ -n "$TEMPERATURE" ]; then
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg temp "$TEMPERATURE" '.generationConfig.temperature = ($temp | tonumber)')
  fi
  
  # 최대 토큰 업데이트
  if [ -n "$MAX_TOKENS" ]; then
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg max "$MAX_TOKENS" '.generationConfig.maxOutputTokens = ($max | tonumber)')
  fi
else
  # sed를 사용한 대체 방법
  ESCAPED_PROMPT=$(printf '%s\n' "$PROMPT" | sed -e 's/[\/&]/\\&/g')
  JSON_DATA=$(echo "$JSON_TEMPLATE" | sed "s/\"text\": \"\"/\"text\": \"$ESCAPED_PROMPT\"/")
  
  # 온도 및 최대 토큰 업데이트
  if [ -n "$TEMPERATURE" ]; then
    JSON_DATA=$(echo "$JSON_DATA" | sed "s/\"temperature\": 0.7/\"temperature\": $TEMPERATURE/")
  fi
  
  if [ -n "$MAX_TOKENS" ]; then
    JSON_DATA=$(echo "$JSON_DATA" | sed "s/\"maxOutputTokens\": 800/\"maxOutputTokens\": $MAX_TOKENS/")
  fi
fi

echo "Gemini API 요청 전송 중..."

# API 호출 및 응답 캡처
RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d "$JSON_DATA")

# 응답에 오류가 있는지 확인
if echo "$RESPONSE" | grep -q "\"error\""; then
  echo "API 오류:"
  if command -v jq &> /dev/null; then
    echo "$RESPONSE" | jq '.error'
  else
    echo "$RESPONSE"
  fi
  exit 1
fi

echo -e "\n===== Gemini API 응답 =====\n"

# 텍스트 내용만 추출하여 표시
if command -v jq &> /dev/null; then
  TEXT=$(echo "$RESPONSE" | jq -r '.candidates.content.parts.text // "응답에 텍스트가 없습니다"')
  echo "$TEXT"
  
  echo -e "\n===== 전체 JSON 응답 =====\n"
  echo "$RESPONSE" | jq '.'
else
  # jq가 없는 경우 간단한 텍스트 추출 시도
  TEXT=$(echo "$RESPONSE" | grep -o '"text":"[^"]*"' | sed 's/"text":"//;s/"$//')
  if [ -z "$TEXT" ]; then
    echo "텍스트 응답을 추출할 수 없습니다. 원본 응답:"
    echo "$RESPONSE"
  else
    echo "$TEXT"
  fi
fi
```

### 변경 이유 및 기대 효과

1. **변경 이유**:
   - 사용자 지정 에러 메시지를 추가하여 오류 식별 개선
   - API 키 검증 로직 추가
   - 입력 유효성 검사 추가
   - 출력 포맷 개선

2. **기대 효과**:
   - 더 명확한 사용 방법 안내
   - 유효하지 않은 입력에 대한 즉각적인 피드백
   - 더 읽기 쉬운 응답 형식
   - 더 나은 오류 처리

3. **타입 형식**:
   - 프롬프트: 텍스트 문자열 (필수)
   - 온도: 0~1 사이의 부동 소수점 숫자 (선택)
   - 최대 토큰: 양의 정수 (선택)

4. **출력 형식**:
   - 텍스트 응답 및 전체 JSON 응답 분리 표시
   - 가독성을 위한 섹션 구분
   - jq가 없을 경우 대체 출력 방식 제공

5. **세부사항**:
   - 특수 문자 처리 개선
   - 입력 파라미터 검증
   - API 키 누락 시 지침 제공
   - jq 설치 확인 및 관련 지침 제공

## 버전 2: 저장 및 색상 강화 스크립트

```bash
#!/bin/bash

# 더 나은 가독성을 위한 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

help()
{
  echo -e "${BOLD}Gemini API 클라이언트${NC}"
  echo "Google의 Gemini API와 상호 작용하는 스크립트"
  echo
  echo -e "${BOLD}사용법:${NC} ./script.sh [옵션]"
  echo
  echo -e "${BOLD}옵션:${NC}"
  echo "  -p '프롬프트'     Gemini API에 전송할 텍스트 프롬프트 (필수)"
  echo "  -t '온도'         무작위성에 대한 온도 설정 (0-1) (기본값: 0.7)"
  echo "  -m '최대 토큰'    최대 출력 토큰 수 (기본값: 800)"
  echo "  -f '파일명'       응답을 지정된 파일에 저장"
  echo "  -r                Raw 모드 - JSON 없이 텍스트 응답만 출력"
  echo "  -h                이 도움말 메시지 표시"
  echo
  echo -e "${BOLD}예제:${NC}"
  echo "  ./script.sh -p '재미있는 농담 하나 해줘' -t 0.8 -m 1000"
  echo "  ./script.sh -p '고양이에 대한 시를 써줘' -f poem.txt"
  exit 0
}

# jq 설치 확인
check_jq() {
  if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}경고: jq가 설치되어 있지 않습니다. 출력이 예쁘게 포맷되지 않을 수 있습니다.${NC}"
    echo "jq 설치 방법:"
    echo "  Debian/Ubuntu: sudo apt install jq"
    echo "  CentOS/RHEL: sudo yum install jq"
    echo "  macOS: brew install jq"
    return 1
  fi
  return 0
}

# API 키 확인
check_api_key() {
  if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${RED}오류: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.${NC}"
    echo "다음 명령으로 설정하세요: export GEMINI_API_KEY='your-api-key-here'"
    exit 1
  fi
}

# 단일 API 호출 처리
process_request() {
  local prompt="$1"
  local temp="$2"
  local max_tokens="$3"
  local output_file="$4"
  local raw_mode="$5"
  
  # 기본 JSON 템플릿
  local json_template='{
    "contents": [{
      "parts":[{"text": ""}]
    }],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 800
    }
  }'
  
  # JSON 데이터 생성
  local json_data
  if command -v jq &> /dev/null; then
    # jq를 사용하여 데이터 생성
    json_data=$(echo "$json_template" | jq --arg prompt "$prompt" '.contents.parts.text = $prompt')
    
    # 온도 값 업데이트
    if [ -n "$temp" ]; then
      json_data=$(echo "$json_data" | jq --arg temp "$temp" '.generationConfig.temperature = ($temp | tonumber)')
    fi
    
    # 최대 토큰 업데이트
    if [ -n "$max_tokens" ]; then
      json_data=$(echo "$json_data" | jq --arg max "$max_tokens" '.generationConfig.maxOutputTokens = ($max | tonumber)')
    fi
  else
    # sed를 사용한 대체 방법
    local escaped_prompt=$(printf '%s\n' "$prompt" | sed -e 's/[\/&]/\\&/g')
    json_data=$(echo "$json_template" | sed "s/\"text\": \"\"/\"text\": \"$escaped_prompt\"/")
    
    # 온도 및 최대 토큰 업데이트
    if [ -n "$temp" ]; then
      json_data=$(echo "$json_data" | sed "s/\"temperature\": 0.7/\"temperature\": $temp/")
    fi
    
    if [ -n "$max_tokens" ]; then
      json_data=$(echo "$json_data" | sed "s/\"maxOutputTokens\": 800/\"maxOutputTokens\": $max_tokens/")
    fi
  fi
  
  echo -e "${BLUE}Gemini API 요청 전송 중...${NC}"
  
  # API 호출 및 응답 캡처
  local response
  response=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "$json_data")
  
  # 응답에 오류가 있는지 확인
  if echo "$response" | grep -q "\"error\""; then
    echo -e "${RED}API 오류:${NC}"
    if command -v jq &> /dev/null; then
      echo "$response" | jq '.error'
    else
      echo "$response"
    fi
    return 1
  fi
  
  # 텍스트 내용 추출
  local text_content
  if command -v jq &> /dev/null; then
    text_content=$(echo "$response" | jq -r '.candidates.content.parts.text // "응답에 텍스트가 없습니다"')
  else
    # jq가 없는 경우 간단한 텍스트 추출
    text_content=$(echo "$response" | grep -o '"text":"[^"]*"' | sed 's/"text":"//;s/"$//')
    if [ -z "$text_content" ]; then
      text_content="응답에서 텍스트를 추출할 수 없습니다 (더 나은 파싱을 위해 jq 설치)"
    fi
  fi
  
  # 요청된 경우 파일에 저장
  if [ -n "$output_file" ]; then
    echo "$text_content" > "$output_file"
    echo -e "${GREEN}응답이 ${BOLD}$output_file${NC}${GREEN}에 저장되었습니다${NC}"
  fi
  
  # 출력 표시
  if [ "$raw_mode" = true ]; then
    # 텍스트 내용만 표시
    echo "$text_content"
  else
    echo -e "\n${BOLD}===== Gemini API 응답 =====${NC}\n"
    echo "$text_content"
    
    if command -v jq &> /dev/null; then
      echo -e "\n${BOLD}===== 전체 JSON 응답 =====${NC}\n"
      echo "$response" | jq '.'
    fi
  fi
  
  return 0
}

# 변수 초기화
PROMPT=""
TEMPERATURE=""
MAX_TOKENS=""
OUTPUT_FILE=""
RAW_MODE=false

# 인자가 없으면 도움말 표시
if [ $# -eq 0 ]; then
  help
fi

# 매개변수 파싱
while getopts "p:t:m:f:rh" opt; do
  case $opt in
    p) PROMPT="$OPTARG" ;;
    t) TEMPERATURE="$OPTARG" ;;
    m) MAX_TOKENS="$OPTARG" ;;
    f) OUTPUT_FILE="$OPTARG" ;;
    r) RAW_MODE=true ;;
    h) help ;;
    *) echo -e "${RED}잘못된 옵션: -$OPTARG${NC}" >&2; help ;;
  esac
done

# API 키 확인
check_api_key

# jq 설치 확인
check_jq

# 프롬프트 확인
if [ -z "$PROMPT" ]; then
  echo -e "${RED}오류: 프롬프트(-p)는 필수입니다.${NC}"
  help
fi

# 온도 값 검증
if [ -n "$TEMPERATURE" ]; then
  if ! [[ "$TEMPERATURE" =~ ^[0-9]*\.?[0-9]+$ ]] || (( $(echo "$TEMPERATURE  1" | bc -l) )); then
    echo -e "${RED}오류: 온도 값은 0과 1 사이의 숫자여야 합니다.${NC}"
    exit 1
  fi
fi

# 최대 토큰 검증
if [ -n "$MAX_TOKENS" ]; then
  if ! [[ "$MAX_TOKENS" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}오류: 최대 토큰 값은 양의 정수여야 합니다.${NC}"
    exit 1
  fi
fi

# 요청 처리
process_request "$PROMPT" "$TEMPERATURE" "$MAX_TOKENS" "$OUTPUT_FILE" "$RAW_MODE"
```

### 변경 이유 및 기대 효과

1. **변경 이유**:
   - 출력에 색상 추가하여 가독성 향상
   - 응답 저장 기능 추가
   - 텍스트 전용 출력 모드 추가
   - 함수화를 통한 코드 모듈화

2. **기대 효과**:
   - 더 시각적으로 명확한 출력
   - 응답을 파일로 저장하여 재사용 가능
   - 다양한 사용 사례에 적합한 출력 옵션

3. **타입 형식**:
   - 버전 1과 동일하며 추가로:
   - 출력 파일: 텍스트 파일 경로 (선택)
   - Raw 모드: 부울 값 (텍스트만 출력)

4. **출력 형식**:
   - 색상으로 강조된 정보 및 오류 메시지
   - 출력 형식 선택 (전체 또는 텍스트만)
   - 파일 저장 기능

5. **세부사항**:
   - 함수화를 통한 코드 개선
   - 색상 코드를 사용한 가독성 향상
   - 파일 출력 옵션
   - 단순화된 텍스트 전용 모드

## 버전 3: 기능 확장 스크립트 (스트리밍 및 함수 호출 지원)

```bash
#!/bin/bash

# 더 나은 가독성을 위한 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

help()
{
  echo -e "${BOLD}고급 Gemini API 클라이언트${NC}"
  echo "함수 호출 및 스트리밍을 포함한 Google의 Gemini API와 상호 작용하는 스크립트"
  echo
  echo -e "${BOLD}사용법:${NC} ./script.sh [옵션]"
  echo
  echo -e "${BOLD}기본 옵션:${NC}"
  echo "  -p '프롬프트'     Gemini API에 전송할 텍스트 프롬프트 (필수)"
  echo "  -t '온도'         무작위성에 대한 온도 설정 (0-1) (기본값: 0.7)"
  echo "  -m '최대 토큰'    최대 출력 토큰 수 (기본값: 800)"
  echo "  -s                실시간 응답을 위한 스트리밍 모드 활성화"
  echo "  -h                이 도움말 메시지 표시"
  echo
  echo -e "${BOLD}함수 호출 옵션:${NC}"
  echo "  -f '함수 파일'    함수 선언이 포함된 JSON 파일"
  echo
  echo -e "${BOLD}출력 옵션:${NC}"
  echo "  -o '파일명'       응답을 지정된 파일에 저장"
  echo "  -r                Raw 모드 - JSON 없이 텍스트 응답만 출력"
  echo
  echo -e "${BOLD}예제:${NC}"
  echo "  ./script.sh -p '재미있는 농담 하나 해줘' -t 0.8 -m 1000"
  echo "  ./script.sh -p '뉴욕의 날씨는 어때?' -f weather_functions.json"
  echo "  ./script.sh -p '실시간 결과 보여줘' -s"
  exit 0
}

# jq 설치 확인
check_jq() {
  if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}경고: jq가 설치되어 있지 않습니다. 출력이 예쁘게 포맷되지 않을 수 있습니다.${NC}"
    echo "jq 설치 방법:"
    echo "  Debian/Ubuntu: sudo apt install jq"
    echo "  CentOS/RHEL: sudo yum install jq"
    echo "  macOS: brew install jq"
    return 1
  fi
  return 0
}

# API 키 확인
check_api_key() {
  if [ -z "$GEMINI_API_KEY" ]; then
    echo -e "${RED}오류: GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.${NC}"
    echo "다음 명령으로 설정하세요: export GEMINI_API_KEY='your-api-key-here'"
    exit 1
  fi
}

# 표준 요청 처리
process_request() {
  local prompt="$1"
  local temp="$2"
  local max_tokens="$3"
  local output_file="$4"
  local raw_mode="$5"
  local func_file="$6"
  local streaming="$7"
  
  # 기본 JSON 템플릿
  local json_template='{
    "contents": [{
      "parts":[{"text": ""}]
    }],
    "generationConfig": {
      "temperature": 0.7,
      "maxOutputTokens": 800
    }
  }'
  
  # JSON 데이터 생성
  local json_data
  if command -v jq &> /dev/null; then
    # jq를 사용하여 데이터 생성
    json_data=$(echo "$json_template" | jq --arg prompt "$prompt" '.contents.parts.text = $prompt')
    
    # 온도 값 업데이트
    if [ -n "$temp" ]; then
      json_data=$(echo "$json_data" | jq --arg temp "$temp" '.generationConfig.temperature = ($temp | tonumber)')
    fi
    
    # 최대 토큰 업데이트
    if [ -n "$max_tokens" ]; then
      json_data=$(echo "$json_data" | jq --arg max "$max_tokens" '.generationConfig.maxOutputTokens = ($max | tonumber)')
    fi
    
    # 함수 선언 추가
    if [ -n "$func_file" ] && [ -f "$func_file" ]; then
      echo -e "${BLUE}$func_file에서 함수 선언 사용 중${NC}"
      # 파일에서 함수 읽기
      local functions=$(cat "$func_file")
      # JSON 데이터에 함수 추가
      json_data=$(echo "$json_data" | jq --argjson funcs "$functions" '. + {tools: [{functionDeclarations: $funcs}]}')
    fi
    
    # 스트리밍 활성화
    if [ "$streaming" = true ]; then
      json_data=$(echo "$json_data" | jq '. + {streamEnabled: true}')
    fi
  else
    # 대체 방법으로 간단한 문자열 대체
    # sed를 위한 프롬프트의 특수 문자 이스케이프
    local escaped_prompt=$(printf '%s\n' "$prompt" | sed -e 's/[\/&]/\\&/g')
    json_data=$(echo "$json_template" | sed "s/\"text\": \"\"/\"text\": \"$escaped_prompt\"/")
    
    # 온도 및 최대 토큰 업데이트
    if [ -n "$temp" ]; then
      json_data=$(echo "$json_data" | sed "s/\"temperature\": 0.7/\"temperature\": $temp/")
    fi
    
    if [ -n "$max_tokens" ]; then
      json_data=$(echo "$json_data" | sed "s/\"maxOutputTokens\": 800/\"maxOutputTokens\": $max_tokens/")
    fi
    
    # 함수 선언 및 스트리밍은 jq 필요
    if [ -n "$func_file" ] || [ "$streaming" = true ]; then
      echo -e "${RED}오류: 함수 선언 및 스트리밍은 jq 설치가 필요합니다.${NC}"
      exit 1
    fi
  fi
  
  echo -e "${BLUE}Gemini API 요청 전송 중...${NC}"
  
  # API 엔드포인트
  local endpoint="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
  
  # 스트리밍이 활성화된 경우 스트리밍 엔드포인트 사용
  if [ "$streaming" = true ]; then
    endpoint="${endpoint}Stream"
    
    echo -e "${GREEN}스트리밍 응답:${NC}"
    # 스트리밍을 위해 버퍼링을 비활성화한 curl 사용
    curl -N -s "$endpoint?key=${GEMINI_API_KEY}" \
      -H 'Content-Type: application/json' \
      -X POST \
      -d "$json_data" | while read -r line; do
        # 빈 줄 건너뛰기
        [ -z "$line" ] && continue
        
        # 스트림의 각 줄 처리
        if command -v jq &> /dev/null; then
          # 각 청크에서 텍스트만 추출
          text=$(echo "$line" | jq -r '.candidates.content.parts.text // empty')
          if [ -n "$text" ]; then
            echo -n "$text"
            # 요청된 경우 파일에 추가
            if [ -n "$output_file" ]; then
              echo -n "$text" >> "$output_file"
            fi
          fi
        else
          echo "$line"
        fi
    done
    echo # 스트리밍 끝에 개행 추가
    return 0
  fi
  
  # 표준 API 호출 및 응답 캡처
  local response
  response=$(curl -s "$endpoint?key=${GEMINI_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "$json_data")
  
  # 응답에 오류가 있는지 확인
  if echo "$response" | grep -q "\"error\""; then
    echo -e "${RED}API 오류:${NC}"
    if command -v jq &> /dev/null; then
      echo "$response" | jq '.error'
    else
      echo "$response"
    fi
    return 1
  fi
  
  # 함수 호출 확인.parts | has("functionCall"))')
    if [ "$has_function_call" = "true" ]; then
      echo -e "${YELLOW}응답에서 함수 호출이 감지되었습니다${NC}"
      echo -e "${BLUE}함수 세부 정보:${NC}"
      echo "$response" | jq '.candidates.content.parts.functionCall'
      
      # 실제 구현에서는 여기서 함수 실행을 처리
      echo -e "${YELLOW}참고: 자동 함수 실행은 이 스크립트에 구현되어 있지 않습니다.${NC}"
      echo -e "${YELLOW}      함수 호출 로직을 직접 구현해야 합니다.${NC}"
    fi
  fi
  
  # 텍스트 내용 추출 (함수 호출이 아닌 경우)
  local text_content
  if [ "$has_function_call" = "false" ] && command -v jq &> /dev/null; then
    text_content=$(echo "$response" | jq -r '.candidates.content.parts.text // "응답에 텍스트가 없습니다"')
  elif command -v jq &> /dev/null; then
    text_content="(응답에 직접 텍스트가 아닌 함수 호출이 포함되어 있습니다)"
  else
    # jq가 없는 경우 간단한 텍스트 추출
    text_content=$(echo "$response" | grep -o '"text":"[^"]*"' | sed 's/"text":"//;s/"$//')
    if [ -z "$text_content" ]; then
      text_content="응답에서 텍스트를 추출할 수 없습니다 (더 나은 파싱을 위해 jq 설치)"
    fi
  fi
  
  # 요청된 경우 파일에 저장
  if [ -n "$output_file" ]; then
    echo "$text_content" > "$output_file"
    echo -e "${GREEN}응답이 ${BOLD}$output_file${NC}${GREEN}에 저장되었습니다${NC}"
  fi
  
  # 출력 표시
  if [ "$raw_mode" = true ]; then
    # 텍스트 내용만 표시
    echo "$text_content"
  else
    echo -e "\n${BOLD}===== Gemini API 응답 =====${NC}\n"
    echo "$text_content"
    
    if command -v jq &> /dev/null; then
      echo -e "\n${BOLD}===== 전체 JSON 응답 =====${NC}\n"
      echo "$response" | jq '.'
    fi
  fi
  
  return 0
}

# 변수 초기화
PROMPT=""
TEMPERATURE=""
MAX_TOKENS=""
OUTPUT_FILE=""
RAW_MODE=false
FUNC_FILE=""
STREAMING=false

# 인자가 없으면 도움말 표시
if [ $# -eq 0 ]; then
  help
fi

# 매개변수 파싱
while getopts "p:t:m:o:rf:sh" opt; do
  case $opt in
    p) PROMPT="$OPTARG" ;;
    t) TEMPERATURE="$OPTARG" ;;
    m) MAX_TOKENS="$OPTARG" ;;
    o) OUTPUT_FILE="$OPTARG" ;;
    r) RAW_MODE=true ;;
    f) FUNC_FILE="$OPTARG" ;;
    s) STREAMING=true ;;
    h) help ;;
    *) echo -e "${RED}잘못된 옵션: -$OPTARG${NC}" >&2; help ;;
  esac
done

# API 키 확인
check_api_key

# jq 설치 확인
check_jq

# 프롬프트 확인
if [ -z "$PROMPT" ]; then
  echo -e "${RED}오류: 프롬프트(-p)는 필수입니다.${NC}"
  help
fi

# 온도 값 검증
if [ -n "$TEMPERATURE" ]; then
  if ! [[ "$TEMPERATURE" =~ ^[0-9]*\.?[0-9]+$ ]] || (( $(echo "$TEMPERATURE  1" | bc -l) )); then
    echo -e "${RED}오류: 온도 값은 0과 1 사이의 숫자여야 합니다.${NC}"
    exit 1
  fi
fi

# 최대 토큰 검증
if [ -n "$MAX_TOKENS" ]; then
  if ! [[ "$MAX_TOKENS" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}오류: 최대 토큰 값은 양의 정수여야 합니다.${NC}"
    exit 1
  fi
fi

# 함수 파일 존재 확인
if [ -n "$FUNC_FILE" ] && [ ! -f "$FUNC_FILE" ]; then
  echo -e "${RED}오류: 함수 파일 '$FUNC_FILE'이 존재하지 않습니다.${NC}"
  exit 1
fi

# 요청 처리
process_request "$PROMPT" "$TEMPERATURE" "$MAX_TOKENS" "$OUTPUT_FILE" "$RAW_MODE" "$FUNC_FILE" "$STREAMING"
  local has_function_call=false
  if command -v jq &> /dev/null; then
    has_function_call=$(echo "$response" | jq 'has("candidates") and (.candidates.content
```

### 변경 이유 및 기대 효과

1. **변경 이유**:
   - Gemini API의 고급 기능 지원(함수 호출, 스트리밍)
   - 더 다양한 사용 사례 지원
   - 개발자를 위한 추가 옵션 제공

2. **기대 효과**:
   - 실시간 응답 표시 가능
   - 함수 호출을 통한 더 복잡한 API 활용 가능
   - 고급 사용 사례 지원

3. **타입 형식**:
   - 버전 2의 모든 타입 포함
   - 함수 파일: JSON 파일 경로 (선택)
   - 스트리밍: 부울 값 (실시간 응답 표시)

4. **출력 형식**:
   - 스트리밍 모드에서 실시간 텍스트 출력
   - 함수 호출 감지 및 관련 정보 표시
   - 버전 2의 모든 출력 형식 포함

5. **세부사항**:
   - 스트리밍 응답 처리
   - 함수 호출 감지 및 정보 표시
   - API 엔드포인트 동적 선택 (일반/스트리밍)
   - 더 복잡한 JSON 구성 지원

## 스크립트 비교 분석

세 가지 버전의 스크립트를 비교 분석해 보겠습니다:

### 1. 기본 개선 스크립트 (버전 1)
- **목적성**: 기본적인 사용자 경험 개선 및 오류 처리
- **장점**: 간단하고 필수 기능만 포함하여 초보자도 이해하기 쉬움
- **단점**: 고급 기능이나 파일 저장 기능 없음
- **적합한 사용자**: Gemini API를 처음 사용하는 사용자, 단순한 스크립트를 원하는 사용자

### 2. 저장 및 색상 강화 스크립트 (버전 2)
- **목적성**: 더 나은 사용자 경험과 파일 저장 기능 제공
- **장점**: 시각적으로 더 명확한 출력, 파일 저장 기능, 텍스트 전용 모드 지원
- **단점**: 스트리밍이나 함수 호출과 같은 고급 기능 미지원
- **적합한 사용자**: 정기적으로 Gemini API를 사용하고 결과를 저장하려는 사용자

### 3. 기능 확장 스크립트 (버전 3)
- **목적성**: Gemini API의 모든 고급 기능 활용
- **장점**: 스트리밍, 함수 호출, 파일 저장 등 모든 기능 지원
- **단점**: 더 복잡한 코드 구조, 초보자에게는 이해하기 어려울 수 있음
- **적합한 사용자**: 개발자, Gemini API의 고급 기능을 활용하려는 사용자

## 기타 사항

1. **API 키 관리**: 모든 버전에서 환경 변수로 API 키를 관리합니다. 보안을 위해 스크립트에 직접 키를 하드코딩하지 않는 것이 좋습니다.

2. **의존성**: jq는 선택적 의존성으로 처리하여, 설치되어 있지 않더라도 스크립트가 작동하도록 했습니다. 그러나 jq가 있으면 더 나은 출력을 제공합니다.

3. **오류 처리**: 모든 버전에서 입력 검증 및 API 오류 처리를 개선했습니다.

4. **확장성**: 버전 3은 모듈식 구조를 통해 추가 기능을 쉽게 확장할 수 있도록 설계되었습니다.

5. **성능**: 모든 버전에서 효율적인 API 호출을 구현했으며, 특히 버전 3의 스트리밍 모드는 대량의 출력을 생성할 때 유용합니다.

이 세 가지 버전의 스크립트는 사용자의 필요에 따라 선택할 수 있으며, 각각 다른 복잡성과 기능 세트를 제공합니다. 기본적인 사용을 위해서는 버전 1, 파일 저장이 필요하면 버전 2, 고급 기능이 필요하면 버전 3을 선택하는 것이 좋겠습니다.

## 결론

제공된 코드를 분석하고 세 가지 다른 버전으로 개선했습니다. 각 버전은 서로 다른 사용 사례와 사용자 유형을 위해 설계되었습니다. 이러한 개선된 스크립트는 Gemini API를 더 효과적으로 활용할 수 있도록 해주며, 사용자 친화적인 출력과 강화된 오류 처리를 통해 더 나은 사용자 경험을 제공합니다.






# Gemini API 출력 가독성 향상을 위한 프롬프트 및 스크립트 개선 방안

현재 스크립트의 출력이 가독성이 떨어지는 문제를 해결하기 위한 여러 방법을 살펴보겠습니다. 이미지에 보이는 코드는 Gemini API를 호출하는 Bash 스크립트로, JSON 출력이 사람이 읽기 어려운 형태로 나타나고 있습니다.

## JSON 출력 가독성 향상을 위한 주요 접근법

### 1. jq 도구를 사용한 출력 포맷팅

jq는 JSON 데이터를 처리하고 예쁘게 출력하는 강력한 도구입니다. API 응답을 jq로 파이프하여 가독성을 크게 향상시킬 수 있습니다.

```bash
#!/bin/bash

help()
{
  echo "./script.sh -p 'prompt' -t 'diversity 0-1' -m 'max token'"
}

# Default JSON template
JSON_TEMPLATE='{
  "contents": [{
    "parts":[{"text": "PROMPT_PLACEHOLDER"}]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 800
  }
}'

# Parse parameters
while getopts "p:t:m:c" opt; do
  case $opt in
    p) PROMPT="$OPTARG" ;;
    t) TEMPERATURE="$OPTARG" ;;
    m) MAX_TOKENS="$OPTARG" ;;
    c) COLOR_OUTPUT=true ;;
    *) echo "Usage: $0 [-p prompt] [-t temperature] [-m maxTokens] [-c colorize]" >&2; exit 1 ;;
  esac
done

# Replace placeholders in template
JSON_DATA=$(echo "$JSON_TEMPLATE" | sed "s/PROMPT_PLACEHOLDER/$PROMPT/")

# 온도 업데이트
if [ -n "$TEMPERATURE" ]; then
  if command -v jq &> /dev/null; then
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg temp "$TEMPERATURE" '.generationConfig.temperature = ($temp | tonumber)')
  else
    echo "jq가 설치되어 있지 않습니다. 간단한 방식으로 처리합니다."
    JSON_DATA=$(echo "$JSON_DATA" | sed 's/"temperature": 0.7/"temperature": '$TEMPERATURE'/')
  fi
fi

# 최대 토큰 수 업데이트
if [ -n "$MAX_TOKENS" ]; then
  if command -v jq &> /dev/null; then
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg max "$MAX_TOKENS" '.generationConfig.maxOutputTokens = ($max | tonumber)')
  else
    echo "jq가 설치되어 있지 않습니다. 간단한 방식으로 처리합니다."
    JSON_DATA=$(echo "$JSON_DATA" | sed 's/"maxOutputTokens": 800/"maxOutputTokens": '$MAX_TOKENS'/')
  fi
fi

# API 호출 및 출력 포맷팅
if command -v jq &> /dev/null; then
  # jq가 있는 경우 예쁘게 포맷팅
  if [ "$COLOR_OUTPUT" = true ]; then
    # 컬러 출력
    curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "$JSON_DATA" | jq -C '.candidates.content.parts.text'
  else
    # 일반 포맷팅
    curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "$JSON_DATA" | jq '.candidates.content.parts.text'
  fi
else
  # jq가 없는 경우 간단한
  RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d "$JSON_DATA")
  
  # 응답에서 텍스트 부분만 추출하여 출력
  echo "$RESPONSE" | grep -o '"text":"[^"]*"' | sed 's/"text":"//;s/"$//'
fi
```

### 2. JSON 스키마 기반 구조화된 응답 요청

Gemini API의 스키마 기능을 활용하여 응답을 구조화하는 방법입니다.

```bash
#!/bin/bash

help()
{
  echo "./script.sh -p 'prompt' -t 'diversity 0-1' -m 'max token' -f 'format(json|text)'"
}

# Default JSON template
JSON_TEMPLATE='{
  "contents": [{
    "parts":[{"text": "PROMPT_PLACEHOLDER"}]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 800
  }
}'

# Parse parameters
while getopts "p:t:m:f:" opt; do
  case $opt in
    p) PROMPT="$OPTARG" ;;
    t) TEMPERATURE="$OPTARG" ;;
    m) MAX_TOKENS="$OPTARG" ;;
    f) FORMAT="$OPTARG" ;;
    *) echo "Usage: $0 [-p prompt] [-t temperature] [-m maxTokens] [-f format(json|text)]" >&2; exit 1 ;;
  esac
done

# 프롬프트가 없으면 도움말 표시
if [ -z "$PROMPT" ]; then
  help
  exit 1
fi

# Replace placeholders in template
JSON_DATA=$(echo "$JSON_TEMPLATE" | sed "s/PROMPT_PLACEHOLDER/$PROMPT/")

# 온도 업데이트
if [ -n "$TEMPERATURE" ]; then
  if command -v jq &> /dev/null; then
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg temp "$TEMPERATURE" '.generationConfig.temperature = ($temp | tonumber)')
  else
    echo "jq가 설치되어 있지 않습니다. 간단한 방식으로 처리합니다."
    JSON_DATA=$(echo "$JSON_DATA" | sed 's/"temperature": 0.7/"temperature": '$TEMPERATURE'/')
  fi
fi

# 최대 토큰 수 업데이트
if [ -n "$MAX_TOKENS" ]; then
  if command -v jq &> /dev/null; then
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg max "$MAX_TOKENS" '.generationConfig.maxOutputTokens = ($max | tonumber)')
  else
    echo "jq가 설치되어 있지 않습니다. 간단한 방식으로 처리합니다."
    JSON_DATA=$(echo "$JSON_DATA" | sed 's/"maxOutputTokens": 800/"maxOutputTokens": '$MAX_TOKENS'/')
  fi
fi

# 응답 형식 지정
if [ "$FORMAT" = "json" ]; then
  if command -v jq &> /dev/null; then
    # JSON 응답을 요청하는 경우 스키마 추가
    JSON_DATA=$(echo "$JSON_DATA" | jq '.generationConfig.responseMimeType = "application/json"')
    
    # 프롬프트에 JSON 요청 설명 추가
    PROMPT="다음 내용은 JSON 형식으로 응답해주세요: $PROMPT"
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg prompt "$PROMPT" '.contents.parts.text = $prompt')
  else
    echo "JSON 형식 지정에는 jq가 필요합니다."
    exit 1
  fi
fi

# API 호출 및 출력 처리
RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d "$JSON_DATA")

# 응답 형식에 따라 처리
if [ "$FORMAT" = "json" ] && command -v jq &> /dev/null; then
  echo -e "\n=== 응답 내용 ===\n"
  echo "$RESPONSE" | jq -r '.candidates.content.parts.text' | jq '.'
else
  # 텍스트 응답 처리
  echo -e "\n=== 응답 내용 ===\n"
  if command -v jq &> /dev/null; then
    echo "$RESPONSE" | jq -r '.candidates.content.parts.text'
  else
    echo "$RESPONSE" | grep -o '"text":"[^"]*"' | sed 's/"text":"//;s/"$//'
  fi
fi
```

### 3. 프롬프트 자체에 형식 지정 요청 포함

API 요청에서 프롬프트 내용을 수정하여 더 구조화된 응답을 요청할 수 있습니다.

```bash
#!/bin/bash

help()
{
  echo "./script.sh -p 'prompt' -t 'diversity 0-1' -m 'max token' -s 'style(default|markdown|list)'"
}

# Default JSON template
JSON_TEMPLATE='{
  "contents": [{
    "parts":[{"text": "PROMPT_PLACEHOLDER"}]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 800
  }
}'

# 스타일 프리픽스 정의
STYLE_DEFAULT=""
STYLE_MARKDOWN="응답은 마크다운 형식으로 작성해주세요. 제목, 소제목, 목록을 적절히 사용하여 가독성을 높여주세요. "
STYLE_LIST="응답은 번호가 매겨진 목록 형식으로 작성해주세요. 각 요점은 명확하게 구분되어야 합니다. "

# 파라미터 파싱
while getopts "p:t:m:s:" opt; do
  case $opt in
    p) PROMPT="$OPTARG" ;;
    t) TEMPERATURE="$OPTARG" ;;
    m) MAX_TOKENS="$OPTARG" ;;
    s) STYLE="$OPTARG" ;;
    *) echo "Usage: $0 [-p prompt] [-t temperature] [-m maxTokens] [-s style(default|markdown|list)]" >&2; exit 1 ;;
  esac
done

# 프롬프트가 없으면 종료
if [ -z "$PROMPT" ]; then
  help
  exit 1
fi

# 스타일에 따른 프롬프트 프리픽스 선택
case "$STYLE" in
  markdown) STYLE_PREFIX="$STYLE_MARKDOWN" ;;
  list) STYLE_PREFIX="$STYLE_LIST" ;;
  *) STYLE_PREFIX="$STYLE_DEFAULT" ;;
esac

# 프롬프트에 스타일 프리픽스 추가
PROMPT="${STYLE_PREFIX}${PROMPT}"

# 템플릿에 프롬프트 삽입
ESCAPED_PROMPT=$(printf '%s\n' "$PROMPT" | sed -e 's/[\/&]/\\&/g')
JSON_DATA=$(echo "$JSON_TEMPLATE" | sed "s/PROMPT_PLACEHOLDER/$ESCAPED_PROMPT/")

# 온도 업데이트
if [ -n "$TEMPERATURE" ]; then
  if command -v jq &> /dev/null; then
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg temp "$TEMPERATURE" '.generationConfig.temperature = ($temp | tonumber)')
  else
    JSON_DATA=$(echo "$JSON_DATA" | sed 's/"temperature": 0.7/"temperature": '$TEMPERATURE'/')
  fi
fi

# 최대 토큰 수 업데이트
if [ -n "$MAX_TOKENS" ]; then
  if command -v jq &> /dev/null; then
    JSON_DATA=$(echo "$JSON_DATA" | jq --arg max "$MAX_TOKENS" '.generationConfig.maxOutputTokens = ($max | tonumber)')
  else
    JSON_DATA=$(echo "$JSON_DATA" | sed 's/"maxOutputTokens": 800/"maxOutputTokens": '$MAX_TOKENS'/')
  fi
fi

# API 호출 및 출력
RESPONSE=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d "$JSON_DATA")

# 응답 포맷팅 및 출력
echo -e "\n=== 응답 내용 ===\n"
if command -v jq &> /dev/null; then
  echo "$RESPONSE" | jq -r '.candidates.content.parts.text'
else
  echo "$RESPONSE" | grep -o '"text":"[^"]*"' | sed 's/"text":"//;s/"$//'
fi
```

## 스크립트 개선 분석

### 1. 첫 번째 스크립트 (jq 도구 활용)

1. **변경 이유**:
   - jq를 사용하여 JSON 응답을 자동으로 포맷팅
   - 텍스트 내용만 추출하여 가독성 향상
   - 컬러 출력 옵션 추가

2. **기대 효과**:
   - 구조화된 JSON 출력으로 가독성 향상
   - 불필요한 메타데이터 없이 실제 응답 내용에 집중
   - 컬러 하이라이팅으로 가독성 추가 개선

3. **타입 형식**:
   - 기존 매개변수 유지 (prompt, temperature, max_tokens)
   - 컬러 출력을 위한 새 플래그 옵션 추가

4. **출력 형식**:
   - jq 사용 시: 구조화되고 가독성 높은 JSON 또는 텍스트
   - jq 미사용 시: 간단한 텍스트 추출 및 출력

### 2. 두 번째 스크립트 (JSON 스키마 활용)

1. **변경 이유**:
   - Gemini API의 responseMimeType 기능 활용
   - JSON 형식 지정 옵션 추가

2. **기대 효과**:
   - API 레벨에서 구조화된 응답 요청 가능
   - 응답을 JSON 또는 일반 텍스트로 유연하게 선택 가능

3. **타입 형식**:
   - format 매개변수 추가 (json 또는 text)

4. **출력 형식**:
   - JSON 형식: 구조화된 JSON 응답
   - 텍스트 형식: 일반 텍스트 응답

### 3. 세 번째 스크립트 (프롬프트 엔지니어링)

1. **변경 이유**:
   - 프롬프트 자체에 형식 지정 요청 포함
   - 다양한 출력 스타일 지원

2. **기대 효과**:
   - API 응답의 구조화된 형식 유도
   - 마크다운, 목록 등 다양한 형식 지원으로 가독성 향상

3. **타입 형식**:
   - style 매개변수 추가 (default, markdown, list)

4. **출력 형식**:
   - 일반 텍스트, 마크다운, 번호 목록 등 다양한 형식

## 결론 및 권장사항

1. **기본 사용자**: jq 기반 첫 번째 스크립트 사용
   - 설치 및 사용이 간단하며 즉시 가독성 향상 가능
   - 추가 프롬프트 엔지니어링 없이도 깔끔한 출력 제공

2. **개발자**: JSON 스키마 기반 두 번째 스크립트 사용
   - API 레벨에서 구조화된 응답 요청 가능
   - 프로그래밍 방식으로 응답 처리에 적합

3. **콘텐츠 작업자**: 프롬프트 기반 세 번째 스크립트 사용
   - 마크다운 등 다양한 형식의 응답으로 콘텐츠 작업에 유용
   - 가장 유연한 출력 형식 제공

이 세 가지 접근 방식을 통해 Gemini API 응답의 가독성을 크게 향상시킬 수 있으며, 각각의 사용 사례에 맞게 선택하여 적용할 수 있습니다.

