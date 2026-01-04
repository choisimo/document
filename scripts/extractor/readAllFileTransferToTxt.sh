#!/bin/bash

# 출력 파일 초기화
OUTPUT_FILE="get_id_and_maps.txt"
> "$OUTPUT_FILE"  # 기존 파일 내용을 비웁니다.

# 현재 디렉토리에서 모든 하위 디렉토리 순회
find . -type f -name "mod.info" -print0 | while IFS= read -r -d '' MOD_INFO_FILE; do
  # `mod.info` 파일에서 `id` 값 추출
  ID=$(grep -E "^id=" "$MOD_INFO_FILE" | cut -d'=' -f2)

  # `media/maps` 디렉토리 경로 설정
  MOD_DIR=$(dirname "$MOD_INFO_FILE")
  MAPS_DIR="$MOD_DIR/media/maps"

  if [ -n "$ID" ]; then
    echo "Processing ID: $ID"

    # ID 저장
    echo "Mods=$ID" >> "$OUTPUT_FILE"

    # `maps` 디렉토리가 존재하면 하위 폴더 이름 추출
    if [ -d "$MAPS_DIR" ]; then
      MAP_NAMES=$(find "$MAPS_DIR" -mindepth 1 -maxdepth 1 -type d -print0 | xargs -0 -n 1 basename | tr '\n' ';' | sed 's/;$//')
      echo "Map=$MAP_NAMES" >> "$OUTPUT_FILE"
    else
      echo "Map=No maps found" >> "$OUTPUT_FILE"
    fi

    # 공백 추가
    echo "" >> "$OUTPUT_FILE"
  fi
done

echo "Results saved to $OUTPUT_FILE."
