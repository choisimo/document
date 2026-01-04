#!/bin/bash

# 현재 디렉토리를 저장
ROOT_DIR=$(pwd)

# 모든 하위 디렉토리를 순회하며 mods 디렉토리 처리
find . -type d -name "mods" | while read MODS_DIR; do
  # mods 디렉토리 바로 아래의 모든 서브디렉토리를 찾음
  find "$MODS_DIR" -mindepth 1 -maxdepth 1 -type d | while read SUB_DIR; do
    # 서브 디렉토리를 현재 루트 디렉토리로 이동
    echo "Moving $SUB_DIR to $ROOT_DIR"
    mv "$SUB_DIR" "$ROOT_DIR"
  done

  # mods 디렉토리가 비어있는지 확인 후 삭제
  if [ -z "$(ls -A "$MODS_DIR")" ]; then
    echo "Removing empty directory: $MODS_DIR"
    rmdir "$MODS_DIR"
  fi

  # mods 디렉토리를 포함하는 상위 폴더도 비어있다면 삭제
  PARENT_DIR=$(dirname "$MODS_DIR")
  if [ -z "$(ls -A "$PARENT_DIR")" ]; then
    echo "Removing empty parent directory: $PARENT_DIR"
    rmdir "$PARENT_DIR"
  fi
done

echo "Done!"

