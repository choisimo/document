# GitHub Actions 기반 소스 병합 파일 생성

GitHub 저장소에 push가 발생할 때 `file_concatter.sh`를 실행하고, `.h` 및 `.cpp` 파일을 `total/total.txt`로 병합한 뒤 변경 사항이 있으면 다시 커밋하는 구성이다.

## Shell 스크립트

`file_concatter.sh`는 기본 출력 디렉토리를 `total/`, 기본 출력 파일명을 `total.txt`로 둔다. 출력 디렉토리가 없으면 생성하고, 재실행 시 `total/total.txt`가 다시 입력 파일로 병합되지 않도록 출력 디렉토리를 건너뛴다.

```bash
#!/usr/bin/env bash
set -euo pipefail

start_dir="."
output_path="total/total.txt"
show_help() {
    printf '사용법: %s [-d DIR] [-o FILE]\n' "$0"
}
while (( $# )); do
    case "$1" in
        -d|--directory|-o|--output)
            if (( $# < 2 )) || [[ -z "$2" ]]; then
                echo "오류: $1 값이 필요합니다." >&2
                exit 2
            fi
            if [[ "$1" == -d || "$1" == --directory ]]; then
                start_dir="$2"
            else
                output_path="$2"
            fi
            shift 2
            ;;
        -h|--help) show_help; exit 0 ;;
        *) show_help >&2; exit 2 ;;
    esac
done

start_dir=$(realpath -e -- "$start_dir")
[[ -d "$start_dir" ]] || { echo "검색 경로는 디렉터리여야 합니다." >&2; exit 1; }
mkdir -p -- "$(dirname -- "$output_path")"
output_dir=$(cd -- "$(dirname -- "$output_path")" && pwd -P)
output_path="$output_dir/$(basename -- "$output_path")"
# 출력 경로가 입력 디렉터리이거나 symlink이면 덮어쓰지 않는다.
[[ ! -d "$output_path" && ! -L "$output_path" ]] || exit 1

input_list=$(mktemp)
output_tmp=$(mktemp "$output_dir/.concat.XXXXXX")
trap 'rm -f -- "$input_list" "$output_tmp"' EXIT

# 경계를 정규화해 total-backup 같은 형제 디렉터리는 제외하지 않는다.
# 출력 디렉터리가 검색 루트인 경우에는 출력 파일만 제외한다.
if [[ "$output_dir" == "$start_dir" ]]; then
    find "$start_dir" -type f \( -name '*.h' -o -name '*.cpp' \) \
        ! -path "$output_path" -print0 | LC_ALL=C sort -z > "$input_list"
else
    find "$start_dir" -path "$output_dir" -prune -o \
        -type f \( -name '*.h' -o -name '*.cpp' \) \
        ! -path "$output_path" -print0 | LC_ALL=C sort -z > "$input_list"
fi

file_count=0
while IFS= read -r -d '' file; do
    printf '\n\n===== %s =====\n\n' "$file" >> "$output_tmp"
    cat -- "$file" >> "$output_tmp"
    file_count=$((file_count + 1))
done < "$input_list"

# 읽기 실패 시 기존 결과를 보존하고, 모든 입력을 읽은 뒤 결과를 교체한다.
mv -- "$output_tmp" "$output_path"
printf '완료: %s 개의 파일이 %s에 병합되었습니다.\n' "$file_count" "$output_path"
```

## 자동화 완료 계약과 알려진 결함

셸 예시는 Bash와 GNU find/sort/realpath를 사용한다. NUL 구분 입력 목록을 정렬하고 실제 처리 횟수를 같은 셸에서 집계하므로 파일 내용의 구분자와 무관하다. 정규화한 출력 디렉터리 경계만 제외해 비슷한 이름의 형제 경로는 보존한다. 빈 입력·단일 파일·출력 디렉터리 재입력·형제 경로·재실행 결과를 검증한다. 읽기·검색 실패는 nonzero로 전달하고 기존 출력을 보존한다. 동시 실행의 최종 덮어쓰기와 실행 중 원본 변경은 별도 정책이 필요하다. Action이 생성 파일을 push하는 경우 생성 경로 제외, 쓰기 권한과 동시 실행 정책을 확인하며, 완료는 입력 목록·개수, 출력 해시, 생성 파일만 포함된 diff와 종료 상태로 판정한다.

## GitHub Actions 워크플로우

저장소의 `.github/workflows/` 디렉토리에 `main.yml` 또는 `build_total.yml` 파일을 둔다.

```yaml
name: Generate Total Source File

on:
  push:
    branches:
      - main  # 또는 master, develop 등 기본 브랜치명으로 변경한다.
    paths-ignore:
      - 'total/total.txt'

permissions:
  contents: write

concurrency:
  group: generate-total-${{ github.ref }}
  cancel-in-progress: true

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
