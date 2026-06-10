# GitHub Actions 기반 소스 병합 파일 생성

GitHub 저장소에 push가 발생할 때 `file_concatter.sh`를 실행하고, `.h` 및 `.cpp` 파일을 `total/total.txt`로 병합한 뒤 변경 사항이 있으면 다시 커밋하는 구성이다.

## Shell 스크립트

`file_concatter.sh`는 기본 출력 디렉토리를 `total/`, 기본 출력 파일명을 `total.txt`로 둔다. 출력 디렉토리가 없으면 생성하고, 재실행 시 `total/total.txt`가 다시 입력 파일로 병합되지 않도록 출력 디렉토리를 건너뛴다.

```bash
#!/bin/bash

# 기본값 설정
start_dir="."
output_dir="total"
output_file_name="total.txt"
output_path="$output_dir/$output_file_name"

# 도움말 표시 함수
show_help() {
    echo "사용법: $0 [옵션]"
    echo "옵션:"
    echo "  -d, --directory DIR  검색 시작 디렉토리 지정 (기본값: 현재 디렉토리)"
    echo "  -o, --output FILE    출력 파일 지정 (기본값: $output_dir/$output_file_name)"
    echo "  -h, --help           도움말 표시"
    exit 0
}

# 인자 파싱
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--directory)
            start_dir="$2"
            shift 2
            ;;
        -o|--output)
            output_path="$2" # 사용자가 -o 옵션으로 경로를 포함한 파일명을 지정할 수 있도록 함
            output_dir=$(dirname "$output_path")
            output_file_name=$(basename "$output_path")
            shift 2
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo "알 수 없는 옵션: $1"
            show_help
            ;;
    esac
done

# 시작 디렉토리가 존재하는지 확인
if [ ! -d "$start_dir" ]; then
    echo "오류: 디렉토리 '$start_dir'가 존재하지 않습니다."
    exit 1
fi

# 출력 디렉토리 생성
mkdir -p "$output_dir"
if [ ! -d "$output_dir" ]; then
    echo "오류: 출력 디렉토리 '$output_dir'를 생성할 수 없습니다."
    exit 1
fi

# 결과 파일 초기화
> "$output_path"

echo "디렉토리 '$start_dir'에서 .h 및 .cpp 파일을 검색하여 '$output_path'에 병합합니다..."

# 파일 카운터 초기화
file_count=0

# 재귀적으로 .h와 .cpp 파일 찾기
find "$start_dir" -type f \( -name "*.h" -o -name "*.cpp" \) -print0 |
while IFS= read -r -d $'\0' file; do
    # 'total' 디렉토리 내의 파일은 건너뛰기 (무한 루프 방지)
    if [[ "$file" == "$output_dir"* ]]; then
        continue
    fi

    # 파일 카운터 증가
    ((file_count++))

    # 진행 상황 표시
    echo "처리 중: $file"

    # 파일 구분자 추가
    echo -e "\n\n===== $file =====\n" >> "$output_path"

    # 파일 내용을 결과 파일에 추가
    cat "$file" >> "$output_path"
done

# 병합 완료 메시지
# find 명령어의 결과를 직접 사용하여 정확한 파일 수를 얻음
# (파이프라인 서브셸 문제 회피)
actual_files_processed_count=$(grep -c "^===== .* ====$" "$output_path")

if [ "$actual_files_processed_count" -eq "0" ] && [ "$file_count" -eq "0" ]; then
    # wc -l 은 파일이 비어있어도 1을 반환할 수 있으므로, 실제 처리된 파일 구분자로 확인
    # find로 찾은 파일이 0개이고, grep 결과도 0이면 실제로 처리된 파일이 없는 것
    echo "주의: 병합할 .h 또는 .cpp 파일을 찾지 못했습니다."
    # 빈 total.txt 파일이 생성될 수 있으므로, 필요에 따라 이 파일을 삭제하는 로직 추가 가능
    # rm -f "$output_path"
    # rmdir "$output_dir" # 디렉토리가 비었을 경우 삭제
else
    echo "완료: $actual_files_processed_count 개의 파일이 '$output_path'에 병합되었습니다."
fi
```

## GitHub Actions 워크플로우

저장소의 `.github/workflows/` 디렉토리에 `main.yml` 또는 `build_total.yml` 파일을 둔다.

```yaml
name: Generate Total Source File

on:
  push:
    branches:
      - main  # 또는 master, develop 등 기본 브랜치명으로 변경한다.

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Make script executable
      run: chmod +x ./file_concatter.sh # 스크립트 경로가 다르면 수정한다.

    - name: Run file_concatter.sh
      run: ./file_concatter.sh # 스크립트 경로가 다르면 수정한다.

    - name: Commit and push if changes
      run: |
        git config --global user.name 'github-actions[bot]'
        git config --global user.email 'github-actions[bot]@users.noreply.github.com'
        git add total/total.txt # 생성된 파일 경로
        # 파일이 변경되었는지 확인 후 커밋 및 푸시
        if ! git diff --staged --quiet; then
          git commit -m "Automated: Update total.txt"
          git push
        else
          echo "No changes to total.txt to commit."
        fi
```

## 동작 흐름

1. push 이벤트가 `main` 브랜치에서 발생한다.
2. GitHub Actions runner가 저장소를 체크아웃한다.
3. `file_concatter.sh` 실행 권한을 부여한다.
4. 스크립트가 `total/total.txt`를 생성하거나 갱신한다.
5. `total/total.txt`에 변경 사항이 있으면 Actions bot 계정으로 커밋하고 push한다.

`branches` 값과 스크립트 경로는 저장소의 실제 기본 브랜치와 파일 위치에 맞춰 조정한다.
