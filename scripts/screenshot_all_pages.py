#!/usr/bin/env python3
"""
Screenshot all MkDocs pages using Playwright with system Chromium.
Usage: python3 scripts/screenshot_all_pages.py [output_dir]
"""

import os
import sys
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:8000"
OUTPUT_DIR = (
    Path(sys.argv[1])
    if len(sys.argv) > 1
    else Path("/home/nodove/workspace/document/.sisyphus/screenshots")
)
CHROMIUM_PATH = "/usr/bin/chromium"

# All pages from mkdocs.yml nav (59 pages)
PAGES = [
    ("home", "/"),
    # Infrastructure
    ("infrastructure-index", "/infrastructure/"),
    ("infrastructure-proxmox-cluster", "/infrastructure/proxmox/cluster/"),
    ("infrastructure-proxmox-email-alerts", "/infrastructure/proxmox/email-alerts/"),
    (
        "infrastructure-proxmox-cluster-with-sbc",
        "/infrastructure/proxmox/cluster-with-sbc/",
    ),
    (
        "infrastructure-proxmox-snapshot-backup-template",
        "/infrastructure/proxmox/snapshot-backup-template/",
    ),
    (
        "infrastructure-proxmox-opnsense-vlan",
        "/infrastructure/proxmox/opnsense_vlan_setup/",
    ),
    (
        "infrastructure-networking-settings",
        "/infrastructure/networking/network-settings/",
    ),
    ("infrastructure-networking-nmcli", "/infrastructure/networking/nmcli-guide/"),
    ("infrastructure-networking-rsync", "/infrastructure/networking/rsync/"),
    ("infrastructure-networking-email", "/infrastructure/networking/email-config/"),
    ("infrastructure-storage-disk-format", "/infrastructure/storage/disk-format/"),
    ("infrastructure-storage-mounting", "/infrastructure/storage/mounting/"),
    ("infrastructure-storage-sshfs", "/infrastructure/storage/sshfs/"),
    (
        "infrastructure-monitoring-prometheus",
        "/infrastructure/monitoring/prometheus-grafana-loki/",
    ),
    (
        "infrastructure-monitoring-process",
        "/infrastructure/monitoring/process-management/",
    ),
    ("infrastructure-hardware-nano-pi", "/infrastructure/hardware/nano-pi-neo3/"),
    ("infrastructure-hardware-ssd", "/infrastructure/hardware/ssd-guide/"),
    # Security
    ("security-index", "/security/"),
    ("security-ssh-configuration", "/security/ssh/configuration/"),
    ("security-ssh-key-management", "/security/ssh/key-management/"),
    ("security-ssh-match-rules", "/security/ssh/match-rules/"),
    ("security-access-user-acl", "/security/access/user-acl/"),
    ("security-access-permissions", "/security/access/permissions/"),
    ("security-vpn-wireguard", "/security/vpn/wireguard/"),
    ("security-vpn-tailscale", "/security/vpn/tailscale/"),
    ("security-zerotrust-cloudflare", "/security/zerotrust/cloudflare/"),
    # Development
    ("development-index", "/development/"),
    ("development-docker-installation", "/development/docker/installation/"),
    ("development-docker-commands", "/development/docker/commands/"),
    ("development-docker-networking", "/development/docker/networking/"),
    ("development-docker-volumes", "/development/docker/volumes/"),
    ("development-docker-vaultwarden", "/development/docker/vaultwarden/"),
    ("development-docker-litellm", "/development/docker/litellm_copilot_guide/"),
    ("development-git-branch", "/development/git/branch-management/"),
    ("development-git-deployment", "/development/git/deployment/"),
    ("development-git-restore", "/development/git/restore-deletion/"),
    ("development-ide-vscode", "/development/ide/vscode-plugins/"),
    ("development-ide-code-server", "/development/ide/code-server/"),
    ("development-languages-java", "/development/languages/java-install/"),
    ("development-languages-gcc", "/development/languages/gcc/"),
    # Databases
    ("databases-index", "/databases/"),
    ("databases-installation", "/databases/installation/"),
    ("databases-postgresql", "/databases/postgresql-guide/"),
    ("databases-redis-overview", "/databases/redis/overview/"),
    ("databases-redis-springboot", "/databases/redis/springboot-integration/"),
    ("databases-jpa-overview", "/databases/jpa/overview/"),
    ("databases-jpa-querydsl", "/databases/jpa/querydsl/"),
    ("databases-jpa-relationships", "/databases/jpa/relationships/"),
    ("databases-jpa-lifecycle", "/databases/jpa/lifecycle/"),
    # Tools
    ("tools-index", "/tools/"),
    ("tools-terminal-modern-cli", "/tools/terminal/modern-cli-tools/"),
    ("tools-terminal-tmux", "/tools/terminal/tmux/"),
    ("tools-terminal-vim", "/tools/terminal/vim/"),
    ("tools-terminal-linux-commands", "/tools/terminal/linux-commands/"),
    ("tools-terminal-pet", "/tools/terminal/pet/"),
    ("tools-terminal-stow", "/tools/terminal/stow/"),
    ("tools-remote-guacamole", "/tools/remote/guacamole/"),
    ("tools-automation-selenium", "/tools/automation/selenium/"),
    ("tools-automation-change-detection", "/tools/automation/change-detection/"),
    ("tools-automation-schedule-manager", "/tools/automation/schedule-manager/"),
    ("tools-ai-langflow", "/tools/ai/langflow/"),
    ("tools-ai-gemini-shell", "/tools/ai/gemini-shell/"),
    ("tools-ai-mcp", "/tools/ai/mcp/"),
    ("tools-split-view", "/tools/split-view/"),
    # Linux
    ("linux-index", "/linux/"),
    ("linux-commands", "/linux/commands/"),
    ("linux-filesystem", "/linux/filesystem/"),
    ("linux-arch-installation", "/linux/arch/installation/"),
    ("linux-arch-kde-theme", "/linux/arch/kde-theme/"),
    ("linux-arch-troubleshooting", "/linux/arch/troubleshooting/"),
    ("linux-proxmox-drive-mount", "/linux/proxmox/drive-mount/"),
    ("linux-proxmox-migration", "/linux/proxmox/migration/"),
    ("linux-proxmox-wireguard", "/linux/proxmox/wireguard-vpn/"),
    ("linux-multimedia-ffmpeg", "/linux/multimedia/ffmpeg/"),
    # OS
    ("os-index", "/os/"),
    ("os-cpu-scheduling", "/os/cpu-scheduling/"),
    ("os-synchronization", "/os/synchronization/"),
    ("os-deadlocks", "/os/deadlocks/"),
    ("os-memory", "/os/memory/"),
    ("os-process", "/os/process/"),
    ("os-virtualization", "/os/virtualization/"),
    ("os-distributed-deadlocks", "/os/distributed-deadlocks/"),
    # Algorithms
    ("algorithms-index", "/algorithms/"),
    ("algorithms-pointers", "/algorithms/pointers/"),
    ("algorithms-function-pointers", "/algorithms/function-pointers/"),
    ("algorithms-oop-patterns", "/algorithms/oop-patterns/"),
    ("algorithms-architect-index", "/algorithms/algorithm-architect/"),
    ("algorithms-architect-readme", "/algorithms/algorithm-architect/README/"),
    ("algorithms-graph-bfs", "/algorithms/algorithm-architect/01-graph/01-bfs/"),
    ("algorithms-graph-dfs", "/algorithms/algorithm-architect/01-graph/02-dfs/"),
    (
        "algorithms-graph-dijkstra",
        "/algorithms/algorithm-architect/01-graph/03-dijkstra/",
    ),
    (
        "algorithms-graph-bellman-ford",
        "/algorithms/algorithm-architect/01-graph/04-bellman-ford/",
    ),
    (
        "algorithms-graph-floyd-warshall",
        "/algorithms/algorithm-architect/01-graph/05-floyd-warshall/",
    ),
    (
        "algorithms-sorting-binary-search",
        "/algorithms/algorithm-architect/02-sorting-searching/01-binary-search/",
    ),
    (
        "algorithms-sorting-quick-sort",
        "/algorithms/algorithm-architect/02-sorting-searching/02-quick-sort/",
    ),
    (
        "algorithms-sorting-merge-sort",
        "/algorithms/algorithm-architect/02-sorting-searching/03-merge-sort/",
    ),
    (
        "algorithms-dp-1d",
        "/algorithms/algorithm-architect/03-dynamic-programming/01-dp-1d/",
    ),
    (
        "algorithms-dp-2d",
        "/algorithms/algorithm-architect/03-dynamic-programming/02-dp-2d/",
    ),
    (
        "algorithms-dp-knapsack",
        "/algorithms/algorithm-architect/03-dynamic-programming/03-knapsack/",
    ),
    ("algorithms-greedy", "/algorithms/algorithm-architect/04-greedy/01-greedy/"),
    (
        "algorithms-tree-traversal",
        "/algorithms/algorithm-architect/05-tree/01-tree-traversal/",
    ),
    ("algorithms-tree-lca", "/algorithms/algorithm-architect/05-tree/02-lca/"),
    (
        "algorithms-union-find",
        "/algorithms/algorithm-architect/06-union-find/01-union-find/",
    ),
    (
        "algorithms-two-pointers",
        "/algorithms/algorithm-architect/07-two-pointers/01-two-pointers/",
    ),
    (
        "algorithms-sliding-window",
        "/algorithms/algorithm-architect/08-sliding-window/01-sliding-window/",
    ),
    (
        "algorithms-backtracking",
        "/algorithms/algorithm-architect/09-backtracking/01-backtracking/",
    ),
    (
        "algorithms-topological-sort",
        "/algorithms/algorithm-architect/10-topological-sort/01-topological-sort/",
    ),
    (
        "algorithms-bit-masking",
        "/algorithms/algorithm-architect/11-bit-masking/01-bit-masking/",
    ),
    ("algorithms-tooling", "/algorithms/algorithm-architect/convert_md_to_pdf.sh/"),
    # Compiler
    ("compiler-index", "/compiler/"),
    ("compiler-lexical-nfa", "/compiler/lexical/nfa/"),
    ("compiler-lexical-dfa", "/compiler/lexical/dfa/"),
    ("compiler-lexical-nfa-to-dfa", "/compiler/lexical/nfa-to-dfa/"),
    ("compiler-parsing-cfg", "/compiler/parsing/cfg/"),
    ("compiler-parsing-ll", "/compiler/parsing/ll-parser/"),
    ("compiler-parsing-lr", "/compiler/parsing/lr-parser/"),
    ("compiler-parsing-bottom-up", "/compiler/parsing/bottom-up/"),
    # Java
    ("java-index", "/java/"),
    ("java-core-concepts", "/java/core-concepts/"),
    ("java-memory-gc", "/java/memory-gc/"),
    # AI Engineering
    ("ai-bm25-attention", "/ai/bm25-vs-attention/"),
    ("ai-langchain-langgraph", "/ai/langchain-vs-langgraph/"),
    # Projects
    ("projects-index", "/projects/"),
    ("projects-cbt-system", "/projects/cbt-system/"),
    ("projects-emotion-diary", "/projects/emotion-diary/"),
    # Nginx
    ("nginx-index", "/nginx/"),
    ("nginx-configuration", "/nginx/configuration/"),
    ("nginx-proxy-manager", "/nginx/proxy-manager/"),
    ("nginx-k8s-deployment", "/nginx/docker-k8s-deployment/"),
    # Prompts
    ("prompts-index", "/prompts/"),
    ("prompts-docs-editor", "/prompts/docs-editor/"),
    ("prompts-database", "/prompts/database/"),
    ("prompts-architecture", "/prompts/architecture/"),
    # Extra
    ("extra-index", "/extra/"),
    ("extra-docker-index", "/extra/docker/"),
    ("extra-docker-stacks", "/extra/docker/stacks/"),
    ("extra-docker-stacks-databases", "/extra/docker/stacks/databases/"),
    ("extra-docker-stacks-automation", "/extra/docker/stacks/automation/"),
    ("extra-docker-stacks-devtools", "/extra/docker/stacks/devtools/"),
    ("extra-docker-stacks-security", "/extra/docker/stacks/security/"),
    ("extra-docker-stacks-media", "/extra/docker/stacks/media/"),
    ("extra-docker-stacks-storage", "/extra/docker/stacks/storage/"),
    ("extra-docker-stacks-misc", "/extra/docker/stacks/misc/"),
    (
        "extra-docker-stacks-misc-open-notebook",
        "/extra/docker/stacks/misc/open-notebook/",
    ),
    ("extra-docker-stacks-monitoring", "/extra/docker/stacks/monitoring/"),
    ("extra-docker-stacks-proxy", "/extra/docker/stacks/proxy/"),
]


def take_screenshots(
    output_dir: Path, pages: list, width: int = 1280, height: int = 900
):
    output_dir.mkdir(parents=True, exist_ok=True)
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=CHROMIUM_PATH,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ],
        )
        context = browser.new_context(
            viewport={"width": width, "height": height},
            locale="ko-KR",
        )
        page = context.new_page()

        # Block external requests to speed up
        def handle_route(route):
            url = route.request.url
            blocked_domains = [
                "polyfill.io",
                "cdn.jsdelivr.net/npm/mathjax",
                "fonts.googleapis.com",
                "fonts.gstatic.com",
            ]
            if any(d in url for d in blocked_domains):
                route.abort()
            else:
                route.continue_()

        page.route("**/*", handle_route)

        total = len(pages)
        for i, (name, path) in enumerate(pages, 1):
            url = BASE_URL + path
            screenshot_path = output_dir / f"{name}.png"

            print(f"[{i:3d}/{total}] {name} ... ", end="", flush=True)

            try:
                page.goto(url, wait_until="domcontentloaded", timeout=15000)
                # Wait for content to settle
                page.wait_for_timeout(800)

                # Full page screenshot
                page.screenshot(path=str(screenshot_path), full_page=True)

                # Gather some diagnostic info
                status_code = None
                try:
                    response = page.evaluate("() => document.readyState")
                except:
                    response = "unknown"

                # Check for common issues
                issues = []
                try:
                    # Check if page has content
                    content_inner = page.locator(".md-content__inner")
                    if content_inner.count() == 0:
                        issues.append("no-content-inner")

                    # Check for 404
                    title = page.title()
                    if "404" in title or "Not Found" in title:
                        issues.append("404-page")

                    # Check viewport width issues
                    scroll_width = page.evaluate(
                        "() => document.documentElement.scrollWidth"
                    )
                    if scroll_width > width + 20:
                        issues.append(f"horizontal-overflow:{scroll_width}px")

                    # Check for broken mermaid
                    mermaid_errors = page.locator(
                        ".mermaid-error, [data-processed='false']"
                    ).count()
                    if mermaid_errors > 0:
                        issues.append(f"mermaid-errors:{mermaid_errors}")

                    # Check for massive SVG overflow
                    svg_overflow = page.evaluate("""() => {
                        const svgs = document.querySelectorAll('svg');
                        for (const svg of svgs) {
                            const rect = svg.getBoundingClientRect();
                            if (rect.width > 1400 || rect.height > 3000) return true;
                        }
                        return false;
                    }""")
                    if svg_overflow:
                        issues.append("svg-overflow")

                except Exception as e:
                    issues.append(f"check-error:{str(e)[:50]}")

                result = {
                    "name": name,
                    "path": path,
                    "screenshot": str(screenshot_path),
                    "issues": issues,
                    "status": "ok" if not [i for i in issues if "404" in i] else "404",
                }
                results.append(result)

                status_str = "✓" if not issues else f"⚠ {', '.join(issues)}"
                print(status_str)

            except Exception as e:
                print(f"✗ ERROR: {e}")
                results.append(
                    {
                        "name": name,
                        "path": path,
                        "screenshot": str(screenshot_path),
                        "issues": [f"error:{str(e)[:100]}"],
                        "status": "error",
                    }
                )

        context.close()
        browser.close()

    # Save results
    results_path = output_dir / "scan_results.json"
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    # Summary
    total = len(results)
    ok = sum(1 for r in results if r["status"] == "ok" and not r["issues"])
    with_issues = sum(1 for r in results if r["issues"] and r["status"] != "error")
    errors = sum(1 for r in results if r["status"] == "error")

    print(f"\n{'=' * 60}")
    print(f"Total pages: {total}")
    print(f"Clean: {ok}")
    print(f"With issues: {with_issues}")
    print(f"Errors: {errors}")
    print(f"\nResults saved to: {results_path}")

    if with_issues > 0 or errors > 0:
        print("\nPages with issues:")
        for r in results:
            if r["issues"]:
                print(f"  - {r['name']}: {', '.join(r['issues'])}")

    return results


if __name__ == "__main__":
    print(f"Taking screenshots of {len(PAGES)} pages...")
    print(f"Output dir: {OUTPUT_DIR}")
    print(f"Chromium: {CHROMIUM_PATH}")
    print()
    take_screenshots(OUTPUT_DIR, PAGES)
