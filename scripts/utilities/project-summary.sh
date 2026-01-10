#!/bin/bash

# Exit on error
set -e

# Default values
OUTPUT_FILE="project_summary.txt"
OUTPUT_DIR="." 
MAX_DEPTH_ARG="" 
CLI_EXCLUDE_PATTERNS="" 
CLI_ESSENTIAL_FILES=""  

# Predefined essential file patterns
DEFAULT_ESSENTIAL_FILES=(
  "README.md" "readme.md" "README.rst" "README.txt"
  "package.json" "composer.json" "pom.xml" "build.gradle" "requirements.txt" "Pipfile" "Gemfile"
  "Dockerfile" "docker-compose.yml" "docker-compose.yaml"
  "Makefile" "Jenkinsfile" ".gitlab-ci.yml" ".travis.yml"
  "*.config.js" "*.config.ts" "*.config.mjs" "*.config.cjs"
  "webpack.config.*" "vite.config.*" "rollup.config.*" "tsconfig.json" "jsconfig.json"
  "next.config.*" # Catches next.config.mjs, next.config.js etc.
  "manage.py" "app.py" "main.py" "server.js" "index.js" "main.go"
  ".env.example" ".env.sample" "settings.py" "config.py"
  "src*/*.js" "src*/*.ts" "src*/*.jsx" "src*/*.tsx" "src*/*.py" "src*/*.java" "src*/*.go" "src*/*.rb" "src*/*.php"
  "app*/*.js" "app*/*.ts" "app*/*.jsx" "app*/*.tsx" "app*/*.py" 
  "components*/*.js" "components*/*.jsx" "components*/*.ts" "components*/*.tsx"
  "pages*/*.js" "pages*/*.jsx" "pages*/*.ts" "pages*/*.tsx"
  "lib*/*.js" "lib*/*.ts" "lib*/*.py" 
  "api*/*.ts" "api*/*.js" "api*/*.py"
  "routes*/*.js" "routes*/*.ts" "routes*/*.py"
  "controllers*/*.js" "controllers*/*.ts" "controllers*/*.py"
  "models*/*.js" "models*/*.ts" "models*/*.py"
  "types*/*.d.ts" 
  "css*/*.css" "scss*/*.scss" "sass*/*.sass" "app*/globals.css" # Added app/globals.css based on tree
  "tailwind.config.*" "postcss.config.*" 
  ".gitignore" ".dockerignore" "components.json" 
  "next-env.d.ts" 
)


# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# --- Function to add file content to the report ---
add_file_to_report() {
  local file_path="$1"
  local rel_path="${file_path#"$PROJECT_PATH_ABS"/}"

  echo 
  echo "# File: $rel_path"
  echo "#$(printf '=%.0s' {1..77})" 
  echo

  if [[ -f "$file_path" && -r "$file_path" ]]; then
    LC_ALL=C awk '{printf "%5d | %s\n", NR, $0}' < "$file_path" || echo "      [Could not read or process content for $rel_path (awk error)]"
  elif [[ ! -f "$file_path" ]]; then
    echo "      [File not found (unexpected): $rel_path]"
  elif [[ ! -r "$file_path" ]]; then
    echo "      [File not readable (permission issue?): $rel_path]"
  else
    echo "      [Could not process file: $rel_path]"
  fi

  echo
  echo "#$(printf -- '-%.0s' {1..80})" 
  echo 
}


# --- Print usage information ---
print_usage() {
  echo -e "${BLUE}Usage: $0 [PROJECT_PATH] [OPTIONS]${NC}"
  echo
  echo "Generates a comprehensive report of essential project files, including a directory tree"
  echo "and the content of selected files."
  echo
  echo -e "${YELLOW}Options:${NC}"
  echo "  --essential-files \"<p1>;<p2>;...\"  Semicolon-separated file patterns to include (e.g., \"*.ts;src/**/*.js\")."
  echo "                                     Overrides default essential files list."
  echo "  --output-file <filename>           Output filename (default: project_summary.txt)."
  echo "  --output-dir <directory>           Output directory for the report (default: project root or current dir if project_path is '.')."
  echo "  --max-depth <number>               Maximum depth for directory tree (e.g., 2 for 'tree -L 2')."
  echo "  --exclude <pattern1,pattern2,...>  Comma-separated patterns to exclude from tree and content (e.g., \"node_modules,*.log\")."
  echo "  -h, --help                         Show this help message."
  echo
  echo -e "${YELLOW}Examples:${NC}"
  echo "  $0 . --output-file my_project_summary.txt"
  echo "  $0 /path/to/my/project --exclude \"node_modules,dist,build\" --max-depth 3"
  echo "  $0 ../my-app --essential-files \"src/*.js;public/index.html\""
}

# --- Parse command line arguments ---
PROJECT_PATH_ARG="" 

while [[ $# -gt 0 ]]; do
  case $1 in
    --essential-files)
      CLI_ESSENTIAL_FILES="$2"
      shift 2
      ;;
    --output-file)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --max-depth)
      if [[ "$2" =~ ^[0-9]+$ ]]; then
        MAX_DEPTH_ARG="$2"
      else
        echo -e "${RED}Error: --max-depth requires a numeric argument.${NC}" >&2
        exit 1
      fi
      shift 2
      ;;
    --exclude)
      CLI_EXCLUDE_PATTERNS="$2"
      shift 2
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    -*) 
      echo -e "${RED}Error: Unknown option: $1${NC}" >&2
      print_usage
      exit 1
      ;;
    *) 
      if [[ -z "$PROJECT_PATH_ARG" ]]; then
        PROJECT_PATH_ARG="$1"
      else
        echo -e "${RED}Error: Too many arguments. Project path already set to '$PROJECT_PATH_ARG'. Encountered: $1${NC}" >&2
        print_usage
        exit 1
      fi
      shift
      ;;
  esac
done

# --- Validate and resolve project path ---
if [[ -z "$PROJECT_PATH_ARG" ]]; then
  PROJECT_PATH_ARG="." 
fi

if [[ ! -d "$PROJECT_PATH_ARG" ]]; then
  echo -e "${RED}Error: Project directory does not exist: $PROJECT_PATH_ARG${NC}" >&2
  exit 1
fi

PROJECT_PATH_ABS=$(cd "$PROJECT_PATH_ARG" && pwd)
if [[ -z "$PROJECT_PATH_ABS" ]]; then
    echo -e "${RED}Error: Could not resolve absolute path for $PROJECT_PATH_ARG${NC}" >&2
    exit 1
fi

# --- Determine and create output directory ---
FINAL_OUTPUT_DIR="$OUTPUT_DIR"
if [[ "$OUTPUT_DIR" == "." ]]; then
    if [[ "$PROJECT_PATH_ARG" == "." ]]; then # If project path is also '.', output to current resolved dir
        FINAL_OUTPUT_DIR=$(pwd)
    else # If project path is specific, output to that project path
        FINAL_OUTPUT_DIR="$PROJECT_PATH_ABS"
    fi
fi

mkdir -p "$FINAL_OUTPUT_DIR"
FINAL_OUTPUT_PATH="$FINAL_OUTPUT_DIR/$OUTPUT_FILE"
FIND_STDERR_LOG="${FINAL_OUTPUT_DIR}/find_stderr.log" 

# --- Check for 'tree' command ---
if ! command -v tree &> /dev/null; then
  echo -e "${YELLOW}Warning: 'tree' command not found. Directory structure will be listed using 'find'.${NC}"
  USE_TREE=false
else
  USE_TREE=true
fi

# --- Interactive Exclusion Enhancement ---
echo -e "${BLUE}Inspecting project for common directories to exclude...${NC}"
COMMON_EXCLUDES_FOUND_IN_PROJECT=()
COMMON_EXCLUDE_CANDIDATES=("node_modules" ".git" "vendor" "build" "dist" "target" "out" ".*cache" "__pycache__" ".venv" "venv" "coverage" "docs/_build" "site" "public/build" "app/tmp" "tmp" "temp" "log" "logs" ".idea" ".vscode" ".DS_Store" "*.egg-info" "*.pyc" "*.pyo" "*.swp" "*.swo" ".next")

ORIGINAL_PWD=$(pwd)
cd "$PROJECT_PATH_ABS" || { echo -e "${RED}Error: Could not change to project directory $PROJECT_PATH_ABS${NC}"; exit 1; }

for pattern_candidate in "${COMMON_EXCLUDE_CANDIDATES[@]}"; do
    if [[ -e "$pattern_candidate" ]]; then # Check if file or directory exists with this name
        is_already_added=false
        for existing_item in "${COMMON_EXCLUDES_FOUND_IN_PROJECT[@]}"; do
            if [[ "$existing_item" == "$pattern_candidate" ]]; then
                is_already_added=true
                break
            fi
        done
        if ! $is_already_added; then
            COMMON_EXCLUDES_FOUND_IN_PROJECT+=("$pattern_candidate")
        fi
    fi
done
cd "$ORIGINAL_PWD" || exit # Go back to original directory

# Remove duplicates from found common excludes (though logic above tries to prevent it)
if [[ ${#COMMON_EXCLUDES_FOUND_IN_PROJECT[@]} -gt 0 ]]; then
    COMMON_EXCLUDES_FOUND_IN_PROJECT=($(printf "%s\n" "${COMMON_EXCLUDES_FOUND_IN_PROJECT[@]}" | sort -u | tr '\n' ' '))
fi

USER_INTERACTIVE_EXCLUDES_STR=""
if [[ ${#COMMON_EXCLUDES_FOUND_IN_PROJECT[@]} -gt 0 ]]; then
    echo -e "${YELLOW}Common files/directories found in '$PROJECT_PATH_ABS' that you might want to exclude:${NC}"
    for item in "${COMMON_EXCLUDES_FOUND_IN_PROJECT[@]}"; do
        echo "  - $item"
    done
    read -rp "Enter names from list or other patterns to exclude (space-separated), or Enter to skip: " USER_INTERACTIVE_EXCLUDES_STR
else
    read -rp "No common large directories automatically detected. Enter patterns to exclude (space-separated), or Enter to skip: " USER_INTERACTIVE_EXCLUDES_STR
fi

CLI_EXCLUDES_ARR=()
if [[ -n "$CLI_EXCLUDE_PATTERNS" ]]; then # CLI_EXCLUDE_PATTERNS is comma-separated
    IFS=',' read -ra CLI_EXCLUDES_ARR <<< "$CLI_EXCLUDE_PATTERNS"
fi

USER_INTERACTIVE_EXCLUDES_ARR=()
if [[ -n "$USER_INTERACTIVE_EXCLUDES_STR" ]]; then # USER_INTERACTIVE_EXCLUDES_STR is space-separated
    IFS=' ' read -ra USER_INTERACTIVE_EXCLUDES_ARR <<< "$USER_INTERACTIVE_EXCLUDES_STR"
fi

ALL_EXCLUDE_PATTERNS_ARR=()
# Add trimmed patterns from CLI
for item in "${CLI_EXCLUDES_ARR[@]}"; do
    trimmed_item=$(echo "$item" | xargs) # xargs trims whitespace
    if [[ -n "$trimmed_item" ]]; then ALL_EXCLUDE_PATTERNS_ARR+=("$trimmed_item"); fi
done
# Add trimmed patterns from user interaction
for item in "${USER_INTERACTIVE_EXCLUDES_ARR[@]}"; do
    trimmed_item=$(echo "$item" | xargs)
    if [[ -n "$trimmed_item" ]]; then ALL_EXCLUDE_PATTERNS_ARR+=("$trimmed_item"); fi
done

# Remove duplicates from combined list
if [[ ${#ALL_EXCLUDE_PATTERNS_ARR[@]} -gt 0 ]]; then
    ALL_EXCLUDE_PATTERNS_ARR=($(printf "%s\n" "${ALL_EXCLUDE_PATTERNS_ARR[@]}" | sort -u | tr '\n' ' '))
fi
echo -e "${BLUE}Final exclusion patterns being used: ${ALL_EXCLUDE_PATTERNS_ARR[*]:-None}${NC}"


# --- Start generating the report ---
echo -e "${GREEN}Generating report... Output will be saved to: $FINAL_OUTPUT_PATH${NC}"
>"$FIND_STDERR_LOG" # Clear previous find stderr log

{ # Start of block redirected to output file
  echo "========================================"
  echo "Project Summary Report"
  echo "========================================"
  echo "Project Path: $PROJECT_PATH_ABS"
  echo "Generated: $(date)"
  echo
  if [[ ${#ALL_EXCLUDE_PATTERNS_ARR[@]} -gt 0 ]]; then
    echo "Exclusion Patterns Applied: ${ALL_EXCLUDE_PATTERNS_ARR[*]}"
  else
    echo "Exclusion Patterns Applied: None"
  fi
  echo

  echo "========================================"
  echo "Project Directory Structure"
  echo "========================================"

  if $USE_TREE; then
    TREE_CMD_ARRAY=(tree -a -C --charset ascii) 
    if [[ -n "$MAX_DEPTH_ARG" ]]; then
      TREE_CMD_ARRAY+=("-L" "$MAX_DEPTH_ARG")
    fi
    if [[ ${#ALL_EXCLUDE_PATTERNS_ARR[@]} -gt 0 ]]; then
      TREE_CMD_ARRAY+=(-I)
      # Join patterns with | for tree's -I option (expects single string of |-separated patterns)
      exclude_tree_str=$(printf "%s|" "${ALL_EXCLUDE_PATTERNS_ARR[@]}")
      TREE_CMD_ARRAY+=("${exclude_tree_str%|}") # Remove trailing |
    fi
    TREE_CMD_ARRAY+=("--" "$PROJECT_PATH_ABS") # -- to signify end of options
    "${TREE_CMD_ARRAY[@]}" || echo -e "${YELLOW}Tree command encountered an issue or directory is empty.${NC}"
  else
    echo "(Tree command not found. Listing directories using find... Exclusions may not be fully applied to this view)"
    find_list_dirs_cmd=("find" "$PROJECT_PATH_ABS" -mindepth 1 -maxdepth ${MAX_DEPTH_ARG:-5}) 
    if [[ ${#ALL_EXCLUDE_PATTERNS_ARR[@]} -gt 0 ]]; then
        for pattern in "${ALL_EXCLUDE_PATTERNS_ARR[@]}"; do
            find_list_dirs_cmd+=(-not -path "*/$pattern/*" -and -not -path "*/$pattern")
        done
    fi
    find_list_dirs_cmd+=(-type d -print)
    "${find_list_dirs_cmd[@]}" | sed -e "s#^${PROJECT_PATH_ABS}#.#" -e 's/[^/]*\//  |/g' -e 's/|--/ /' \
    || echo -e "${YELLOW}Find command for directory listing failed.${NC}"
  fi

  echo
  echo "========================================"
  echo "Essential Files Content"
  echo "========================================"
  echo

  TARGET_ESSENTIAL_PATTERNS_ARR=()
  if [[ -z "$CLI_ESSENTIAL_FILES" ]]; then
    TARGET_ESSENTIAL_PATTERNS_ARR=("${DEFAULT_ESSENTIAL_FILES[@]}")
  else
    IFS=';' read -ra TMP_PATTERNS <<< "$CLI_ESSENTIAL_FILES"
    for p_item in "${TMP_PATTERNS[@]}"; do
        trimmed_p_item=$(echo "$p_item" | xargs)
        if [[ -n "$trimmed_p_item" ]]; then TARGET_ESSENTIAL_PATTERNS_ARR+=("$trimmed_p_item"); fi
    done
  fi

  if [[ ${#TARGET_ESSENTIAL_PATTERNS_ARR[@]} -eq 0 ]]; then
      echo "No essential file patterns specified or found. Skipping file content."
  else
      echo -e "${BLUE}Processing essential files matching patterns: ${TARGET_ESSENTIAL_PATTERNS_ARR[*]}${NC}"
      
      FIND_EXCLUDE_PRUNE_ARGS=()
      if [[ ${#ALL_EXCLUDE_PATTERNS_ARR[@]} -gt 0 ]]; then
          FIND_EXCLUDE_PRUNE_ARGS+=(\() 
          first_exclude_group=true
          for pattern in "${ALL_EXCLUDE_PATTERNS_ARR[@]}"; do
              if ! $first_exclude_group; then
                  FIND_EXCLUDE_PRUNE_ARGS+=(-o) 
              fi
              # For each exclusion pattern, create a group to match the pattern itself (as name) or as a path component
              FIND_EXCLUDE_PRUNE_ARGS+=(\( -name "$pattern" -o -path "*/$pattern/*" \))
              first_exclude_group=false
          done
          FIND_EXCLUDE_PRUNE_ARGS+=(\) -prune -o) 
      fi

      FIND_ESSENTIAL_MATCH_ARGS=()
      if [[ ${#TARGET_ESSENTIAL_PATTERNS_ARR[@]} -gt 0 ]]; then
          FIND_ESSENTIAL_MATCH_ARGS+=(\() 
          first_essential=true
          for pattern in "${TARGET_ESSENTIAL_PATTERNS_ARR[@]}"; do
              if ! $first_essential; then
                  FIND_ESSENTIAL_MATCH_ARGS+=(-o)
              fi
              if [[ "$pattern" == *"/"* ]]; then
                  if [[ "$pattern" != "*/"* && "$pattern" != "./"* ]]; then
                      FIND_ESSENTIAL_MATCH_ARGS+=(-path "*/$pattern")
                  else
                      FIND_ESSENTIAL_MATCH_ARGS+=(-path "$pattern")
                  fi
              else
                  FIND_ESSENTIAL_MATCH_ARGS+=(-name "$pattern")
              fi
              first_essential=false
          done
          FIND_ESSENTIAL_MATCH_ARGS+=(\)) 
      fi

      # Check if there are valid essential match arguments to proceed with find
      if [[ ${#FIND_ESSENTIAL_MATCH_ARGS[@]} -gt 2 || (${#FIND_ESSENTIAL_MATCH_ARGS[@]} -eq 1 && -n "${FIND_ESSENTIAL_MATCH_ARGS[0]}" && "${FIND_ESSENTIAL_MATCH_ARGS[0]}" != "(" && "${FIND_ESSENTIAL_MATCH_ARGS[0]}" != ")") ]]; then
          find_cmd_array=("find" "$PROJECT_PATH_ABS") 

          if [[ ${#FIND_EXCLUDE_PRUNE_ARGS[@]} -gt 0 ]]; then
            find_cmd_array+=("${FIND_EXCLUDE_PRUNE_ARGS[@]}")
          fi
          find_cmd_array+=(-type f) 
          
          # Conditionally add essential match arguments if they are valid
          if [[ ${#FIND_ESSENTIAL_MATCH_ARGS[@]} -gt 0 && "${FIND_ESSENTIAL_MATCH_ARGS[0]}" != ")" ]]; then 
             find_cmd_array+=("${FIND_ESSENTIAL_MATCH_ARGS[@]}")
          fi
          # Ensure -print0 is always added if we proceed
          find_cmd_array+=(-print0)

          echo -e "${YELLOW}DEBUG: Executing find command (see $FIND_STDERR_LOG for errors):${NC}" >&2
          printf "  %q\n" "${find_cmd_array[@]}" >&2 

          file_count=0
          # Execute find and read its output. Redirect find's stderr to the log file.
          while IFS= read -r -d $'\0' file_to_report; do
            add_file_to_report "$file_to_report"
            file_count=$((file_count + 1))
          done < <("${find_cmd_array[@]}" 2>>"$FIND_STDERR_LOG")


          if [[ $file_count -eq 0 ]]; then
              echo -e "${RED}No files matched the essential criteria after exclusions.${NC}"
              if [[ -s "$FIND_STDERR_LOG" ]]; then 
                echo -e "${RED}Find command reported errors. Check $FIND_STDERR_LOG ${NC}" >&2
              else
                echo -e "${YELLOW}Find command executed without error, but found no matching files. Check patterns and exclusions.${NC}" >&2
                echo -e "${YELLOW}Consider if essential file patterns (DEFAULT_ESSENTIAL_FILES or --essential-files) are too restrictive or conflict with exclusions.${NC}" >&2
              fi
          else
              echo -e "${GREEN}Included content from $file_count essential file(s).${NC}"
          fi
      else
          echo "No valid essential file patterns to process into find arguments after parsing."
      fi
  fi # End of if [[ ${#TARGET_ESSENTIAL_PATTERNS_ARR[@]} -eq 0 ]]

  echo
  echo "========================================"
  echo "End of Report"
  echo "========================================"
} > "$FINAL_OUTPUT_PATH" # End of block redirected to output file

echo -e "${GREEN}Report generated successfully:${NC} $FINAL_OUTPUT_PATH"
if [[ -s "$FIND_STDERR_LOG" ]]; then # Check if log file is not empty and not just whitespace
    echo -e "${YELLOW}Note: 'find' command reported messages to $FIND_STDERR_LOG. Please review if results are unexpected.${NC}"
fi
