#!/bin/bash

# 출력 파일 정의
OUTPUT_FILE="mods_and_maps.txt"

# Mods와 Map 초기화
MODS="Mods="
MAPS="Map="

# 현재 디렉토리의 모든 mod.info 파일 처리
find . -type f -name "mod.info" | while read MOD_INFO_FILE; do
  # mod.info에서 id 추출
  ID=$(grep -E "^id=" "$MOD_INFO_FILE" | cut -d'=' -f2)

  # media/maps 디렉토리 확인
  MOD_DIR=$(dirname "$MOD_INFO_FILE")
  MAPS_DIR="$MOD_DIR/media/maps"

  # Mods에 id 추가
  if [ -n "$ID" ]; then
    MODS+="$ID;"
  fi

  # Map에 media/maps의 폴더 추가
  if [ -d "$MAPS_DIR" ]; then
    MAP_NAMES=$(find "$MAPS_DIR" -mindepth 1 -maxdepth 1 -type d | xargs -n 1 basename | tr '\n' ';')
    if [ -n "$MAP_NAMES" ]; then
      MAPS+="$MAP_NAMES"
    else
      MAPS+="No maps found;"
    fi
  else
    MAPS+="No maps found;"
  fi
done

# Mods와 Map에서 끝의 세미콜론 제거
MODS=$(echo "$MODS" | sed 's/;$//')
MAPS=$(echo "$MAPS" | sed 's/;$//')

# 결과 출력
echo "$MODS" > "$OUTPUT_FILE"
echo "$MAPS" >> "$OUTPUT_FILE"

echo "Results saved to $OUTPUT_FILE."
