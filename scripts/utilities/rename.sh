#!/bin/bash

# 사용법: ./script.sh <target_directory> <keyword>
# example ./script.sh ./hello helloworld          
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <target_directory> <keyword>"
    exit 1
fi

TARGET_DIR="$1"
KEYWORD="$2"

# 경로가 존재하는지 확인
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory '$TARGET_DIR' does not exist."
    exit 1
fi

# 파일명 변경 로직 실행
find "$TARGET_DIR" -type f -name "*$KEYWORD*" | while read -r file; do
    # 새 파일명 생성 (키워드 제거)
    new_name=$(basename "$file" | sed "s/$KEYWORD//g")
    new_path="$(dirname "$file")/$new_name"

    # 기존 파일과 새 파일명이 다를 경우에만 변경
    if [ "$file" != "$new_path" ]; then
        mv "$file" "$new_path" && echo "Renamed: $file -> $new_path"
    fi
done
