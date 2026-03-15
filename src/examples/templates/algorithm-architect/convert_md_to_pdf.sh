#!/bin/bash

# convert_md_to_pdf.sh
# Convert all Markdown files to PDF using pandoc with xelatex
# Usage: ./convert_md_to_pdf.sh [directory]

set -euo pipefail

# Configuration
DIRECTORY="${1:-.}"
PDF_ENGINE="xelatex"
MAIN_FONT="NanumGothic"
MAX_JOBS=4

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to convert a single file
convert_file() {
    local input_file="$1"
    local output_file="${input_file%.md}.pdf"
    
    echo -e "${YELLOW}Converting: $input_file -> $output_file${NC}"
    
    if pandoc "$input_file" \
        -o "$output_file" \
        --pdf-engine="$PDF_ENGINE" \
        -V mainfont="$MAIN_FONT" 2>/dev/null; then
        echo -e "${GREEN}Done: $input_file${NC}"
        return 0
    else
        echo -e "${RED}Failed: $input_file${NC}" >&2
        return 1
    fi
}

export -f convert_file
export PDF_ENGINE MAIN_FONT RED GREEN YELLOW NC

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo -e "${RED}Error: pandoc is not installed${NC}" >&2
    exit 1
fi

# Check if xelatex is installed
if ! command -v xelatex &> /dev/null; then
    echo -e "${RED}Error: xelatex is not installed${NC}" >&2
    exit 1
fi

# Count total files
total=$(find "$DIRECTORY" -type f -name "*.md" | wc -l)

if [ "$total" -eq 0 ]; then
    echo -e "${YELLOW}No .md files found in $DIRECTORY${NC}"
    exit 0
fi

echo "Found $total markdown files. Converting with $MAX_JOBS parallel jobs..."
echo ""

# Export to use in subshell
export total

# Find and convert files in parallel using GNU parallel or xargs
dry_run() {
    while IFS= read -r file; do
        convert_file "$file"
    done
}

if command -v parallel &> /dev/null; then
    # Use GNU parallel for better job control
    find "$DIRECTORY" -type f -name "*.md" -print0 | \
        parallel -0 -j "$MAX_JOBS" convert_file
else
    # Fallback to xargs with proper syntax (no -I with -P)
    # Use a wrapper script approach
    find "$DIRECTORY" -type f -name "*.md" -print0 | \
        xargs -0 -P "$MAX_JOBS" -n 1 bash -c 'convert_file "$@"' _
fi

echo ""
echo -e "${GREEN}Conversion complete!${NC}"
