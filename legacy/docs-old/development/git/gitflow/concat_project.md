Okay, I can help you with that! To automatically run your `file_concatter.sh` script, create a `total` directory, and place the output file (let's call it `total.txt`) inside it every time you push to your GitHub project, you'll need to use **GitHub Actions**.

Here's how you can set it up:

## 1. Modify Your Shell Script (Optional but Recommended)

It's good practice for your script to handle the directory creation and specific output path.

Here's an updated version of your `file_concatter.sh` script. I've made the following changes:
* The default output directory is now `total/`.
* The default output filename is `total.txt`.
* The script will create the `total` directory if it doesn't exist.

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

**Key changes in the script:**
* `output_dir="total"` and `output_file_name="total.txt"` are new default variables.
* `output_path="$output_dir/$output_file_name"` combines them.
* `mkdir -p "$output_dir"` creates the `total` directory if it doesn't exist.
* The script now checks if a found file is within the `output_dir` itself to prevent trying to add `total/total.txt` to itself if the script is run multiple times or if `start_dir` includes `total`.
* Improved the final count message to be more accurate by counting the separators in the output file.

---
## 2. Create a GitHub Actions Workflow File

In your GitHub repository, create a directory named `.github` and inside it, another directory named `workflows`. In the `.github/workflows` directory, create a YAML file (e.g., `main.yml` or `build_total.yml`).

```yaml
name: Generate Total Source File

on:
  push:
    branches:
      - main  # 또는 master, develop 등 기본 브랜치명으로 변경하세요.

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Make script executable
      run: chmod +x ./file_concatter.sh # 스크립트 경로가 다르면 수정하세요.

    - name: Run file_concatter.sh
      run: ./file_concatter.sh # 스크립트 경로가 다르면 수정하세요.

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

**Explanation of the `main.yml` file:**

* **`name: Generate Total Source File`**: The name of your workflow, which will appear in the Actions tab of your GitHub repository.
* **`on:`**: Defines the trigger for the workflow.
    * **`push:`**: The workflow runs on push events.
    * **`branches:`**:
        * **`- main`**: Specifies that the workflow should only run for pushes to the `main` branch. You can change this to your default branch (e.g., `master`) or add other branches.
* **`jobs:`**: Defines one or more jobs that run when the workflow is triggered.
    * **`build:`**: The ID of the job (you can name it anything).
    * **`runs-on: ubuntu-latest`**: Specifies that the job will run on the latest version of an Ubuntu virtual machine provided by GitHub.
    * **`steps:`**: A sequence of tasks to be executed.
        * **`name: Checkout repository`**: A descriptive name for the step.
            * **`uses: actions/checkout@v4`**: This uses a pre-built action to check out your repository's code into the runner environment.
        * **`name: Make script executable`**:
            * **`run: chmod +x ./file_concatter.sh`**: This command makes your shell script executable. Adjust the path (`./file_concatter.sh`) if your script is in a different location.
        * **`name: Run file_concatter.sh`**:
            * **`run: ./file_concatter.sh`**: This command executes your script. The script will create the `total/total.txt` file.
        * **`name: Commit and push if changes`**: This step commits the generated `total/total.txt` file back to your repository if it has changed.
            * `git config --global user.name 'github-actions[bot]'`: Sets the Git username for the commit.
            * `git config --global user.email 'github-actions[bot]@users.noreply.github.com'`: Sets the Git email for the commit.
            * `git add total/total.txt`: Stages the generated file.
            * `if ! git diff --staged --quiet; then ... else ... fi`: This checks if there are any staged changes. If `total.txt` hasn't changed since the last commit, it won't create an empty commit.
            * `git commit -m "Automated: Update total.txt"`: Commits the changes with a message.
            * `git push`: Pushes the commit to the repository.

---
## 3. How to Use

1.  **Save your script**: Make sure `file_concatter.sh` (preferably the modified version) is in the root directory of your project (or adjust the path in the YAML file if it's elsewhere).
2.  **Create the workflow file**:
    * In your repository, go to the `.github/workflows/` directory (create these directories if they don't exist).
    * Create a new file named `main.yml` (or any other `.yml` name) and paste the YAML content into it.
3.  **Commit and Push**:
    * Commit the `file_concatter.sh` script (if updated) and the new `.github/workflows/main.yml` file to your repository.
    * Push these changes to your `main` (or specified) branch on GitHub.

Now, every time you push to the `main` branch, the GitHub Action will automatically:
1.  Check out your code.
2.  Run your `file_concatter.sh` script.
3.  The script will create `total/total.txt` with the concatenated content.
4.  The action will commit `total/total.txt` back to your repository if its content has changed.

You can view the progress and logs of your actions in the "Actions" tab of your GitHub repository. 🚀