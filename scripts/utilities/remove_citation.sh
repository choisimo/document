#!/bin/bash

# 인용 괄호([숫자]) 제거 스크립트

# 타임스탬프가 포함된 백업 디렉토리 생성
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="./backup_$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# 단일 파일 처리 함수
process_file() {
    local file="$1"
    local basename=$(basename "$file")
    local backup_file="$BACKUP_DIR/$basename"
    
    # 백업 생성
    cp "$file" "$backup_file"
    
    # sed를 사용하여 문장 끝의 인용 괄호 제거
    sed -i 's/\s*\[[0-9]\+\]\(\s*\[[0-9]\+\]\)*//g' "$file"
    
    echo "처리됨: $file"
    return $?
}

# 디렉토리 처리 함수
process_directory() {
    local dir="$1"
    local success=true
    local processed_count=0
    local failed_count=0
    
    echo "디렉토리의, 모든 파일 처리 중: $dir"
    
    for file in "$dir"/*; do
        if [ -f "$file" ]; then
            if process_file "$file"; then
                processed_count=$((processed_count + 1))
            else
                failed_count=$((failed_count + 1))
                echo "처리 실패: $file"
                success=false
            fi
        fi
    done
    
    echo "처리된 파일: $processed_count"
    echo "실패한 파일: $failed_count"
    
    if $success; then
        return 0
    else
        return 1
    fi
}

# 메인 스크립트
if [ $# -ne 1 ]; then
    echo "사용법: $0 <파일 또는 디렉토리>"
    exit 1
fi

TARGET="$1"
absolute_target=$(realpath "$TARGET")

if [ -f "$TARGET" ]; then
    echo "입력 파일: $absolute_target"
    echo "이 파일에서 인용 괄호를 제거합니다."
    echo "백업이 다음 위치에 생성됩니다: $BACKUP_DIR"
    echo "계속하시겠습니까? (y/n)"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        if process_file "$TARGET"; then
            status="성공"
        else
            status="실패"
        fi
    else
        echo "작업이 취소되었습니다."
        exit 0
    fi
elif [ -d "$TARGET" ]; then
    echo "입력 디렉토리: $absolute_target"
    echo "이 디렉토리의 모든 파일에서 인용 괄호를 제거합니다."
    echo "백업이 다음 위치에 생성됩니다: $BACKUP_DIR"
    echo "계속하시겠습니까? (y/n)"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        if process_directory "$TARGET"; then
            status="성공"
        else
            status="일부 실패"
        fi
    else
        echo "작업이 취소되었습니다."
        exit 0
    fi
else
    echo "오류: $TARGET 은(는) 유효한 파일 또는 디렉토리가 아닙니다."
    exit 1
fi

# 결과 출력
echo
echo "1. 원본 디렉토리: $absolute_target"
echo "2. 작업 수행 내용: 텍스트 파일에서 인용 괄호([숫자] 형식) 제거"
echo "3. 성공/실패 여부: $status"
echo "4. 수행된 파일 저장 위치: $absolute_target"
echo "5. 기존 파일 백업본 저장 위치: $(realpath "$BACKUP_DIR")"
