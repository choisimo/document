#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
OUTPUT_ROOT="${1:-${REPO_ROOT}/dist/site/extra}"

mkdir -p "${OUTPUT_ROOT}"

sync_dir() {
    local source_rel="$1"
    local dest_rel="$2"
    shift 2
    local source_dir="${REPO_ROOT}/${source_rel}"
    local dest_dir="${OUTPUT_ROOT}/${dest_rel}"
    local -a extra_args=("$@")

    if [[ ! -d "${source_dir}" ]]; then
        echo "skip missing directory: ${source_rel}"
        return
    fi

    mkdir -p "${dest_dir}"
    echo "sync ${source_rel} -> ${dest_rel}"
    rsync -a \
        --exclude='.git' \
        --exclude='*.class' \
        --exclude='*.pyc' \
        --exclude='__pycache__' \
        --exclude='.ruff_cache' \
        --exclude='target/' \
        --exclude='.sourcebot/' \
        --exclude='.env' \
        --exclude='*.secret' \
        --exclude='*.authjs-secret' \
        --exclude='*.rdb' \
        "${extra_args[@]}" \
        "${source_dir}/" "${dest_dir}/"
}

sync_file() {
    local source_rel="$1"
    local dest_rel="$2"
    local source_file="${REPO_ROOT}/${source_rel}"
    local dest_file="${OUTPUT_ROOT}/${dest_rel}"

    if [[ ! -f "${source_file}" ]]; then
        echo "skip missing file: ${source_rel}"
        return
    fi

    mkdir -p "$(dirname "${dest_file}")"
    cp "${source_file}" "${dest_file}"
}

generate_index_for_dir() {
    local dir_path="$1"
    local root_path="$2"
    local index_file="${dir_path}/index.html"

    if [[ -f "${index_file}" ]]; then
        return
    fi

    local rel_path="${dir_path#${OUTPUT_ROOT}}"
    rel_path="${rel_path#/}"
    local route_path="/extra"
    if [[ -n "${rel_path}" ]]; then
        route_path="${route_path}/${rel_path}"
    fi
    local parent_link=""
    if [[ "${dir_path}" != "${root_path}" ]]; then
        parent_link='<li><a href="../">..</a></li>'
    fi

    mapfile -t entries < <(
        find "${dir_path}" -mindepth 1 -maxdepth 1 \
            \( -type d -o -type f \) \
            ! -name 'index.html' \
            -printf '%P\n' | sort
    )

    {
        printf '%s\n' '<!DOCTYPE html>'
        printf '%s\n' '<html lang="ko">'
        printf '%s\n' '<head>'
        printf '%s\n' '  <meta charset="utf-8">'
        printf '%s\n' '  <meta name="viewport" content="width=device-width, initial-scale=1">'
        printf '  <title>%s</title>\n' "${route_path}"
        printf '%s\n' '  <style>'
        printf '%s\n' '    :root { color-scheme: light dark; }'
        printf '%s\n' '    body { font-family: "JetBrains Mono", ui-monospace, monospace; margin: 2rem auto; max-width: 960px; padding: 0 1rem; line-height: 1.6; }'
        printf '%s\n' '    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }'
        printf '%s\n' '    p { color: #6b7280; margin-top: 0; }'
        printf '%s\n' '    ul { list-style: none; padding: 0; margin: 1.5rem 0 0; }'
        printf '%s\n' '    li { margin: 0.35rem 0; }'
        printf '%s\n' '    a { color: inherit; text-decoration: none; }'
        printf '%s\n' '    a:hover { text-decoration: underline; }'
        printf '%s\n' '    code { background: rgba(127, 127, 127, 0.12); border-radius: 4px; padding: 0.1rem 0.35rem; }'
        printf '%s\n' '  </style>'
        printf '%s\n' '</head>'
        printf '%s\n' '<body>'
        printf '  <h1>%s</h1>\n' "${route_path}"
        printf '%s\n' '  <p>동기화된 정적 자산 디렉터리입니다.</p>'
        printf '%s\n' '  <ul>'
        printf '%s\n' "    ${parent_link}"

        for entry in "${entries[@]}"; do
            if [[ -d "${dir_path}/${entry}" ]]; then
                printf '    <li><a href="%s/"><code>%s/</code></a></li>\n' "${entry}" "${entry}"
            else
                printf '    <li><a href="%s"><code>%s</code></a></li>\n' "${entry}" "${entry}"
            fi
        done

        printf '%s\n' '  </ul>'
        printf '%s\n' '</body>'
        printf '%s\n' '</html>'
    } > "${index_file}"
}

generate_indexes() {
    local root_rel="$1"
    local root_dir="${OUTPUT_ROOT}/${root_rel}"

    if [[ ! -d "${root_dir}" ]]; then
        return
    fi

    while IFS= read -r dir_path; do
        generate_index_for_dir "${dir_path}" "${root_dir}"
    done < <(find "${root_dir}" -type d | sort)
}

sync_dir "src/automation" "scripts"
sync_dir "infra/docker" "docker"
sync_dir "infra/configs" "configs"
sync_dir "content/rendered" "project-docs"
sync_dir "content/archive/legacy" "legacy"
sync_dir "content/prompts" "prompts-raw"
sync_dir "src/mcp" "mcp" "--no-links"
sync_dir "content/notes" "memo"
sync_dir "src/examples/simulator/javascript" "algorithm-simulator"
sync_dir "src/examples/data-structures" "algorithm-code/data-structures"
sync_dir "src/examples/architect-code" "algorithm-code/code"
sync_dir "src/examples/c-lang" "algorithm-code/C-lang"
sync_dir "src/examples/simulator" "algorithm-code/simulator"
sync_file "src/examples/README.md" "algorithm-code/README.md"
sync_file "src/examples/REVIEW_REPORT.md" "algorithm-code/REVIEW_REPORT.md"

generate_indexes "scripts"
generate_indexes "configs"
generate_indexes "project-docs"
generate_indexes "legacy"
generate_indexes "prompts-raw"
generate_indexes "mcp"
generate_indexes "memo"
generate_indexes "algorithm-code"
generate_indexes "docker"

echo "synced extra assets to ${OUTPUT_ROOT}"
