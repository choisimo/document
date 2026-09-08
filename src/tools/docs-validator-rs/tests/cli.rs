use std::fs;
use std::path::Path;
use std::process::{Command, Output};

use tempfile::{tempdir, TempDir};

fn repository() -> TempDir {
    let temp = tempdir().unwrap();
    fs::create_dir_all(temp.path().join("content/docs/guide")).unwrap();
    fs::create_dir_all(temp.path().join("apps/docs-site")).unwrap();
    fs::write(
        temp.path().join("apps/docs-site/mkdocs.yml"),
        "docs_dir: ../../content/docs\n",
    )
    .unwrap();
    fs::write(
        temp.path().join("content/docs/index.md"),
        "# Home\n\n[Guide](guide/target.md#section)\n\n```mermaid\nflowchart TD\n  A --> B\n```\n",
    )
    .unwrap();
    fs::write(
        temp.path().join("content/docs/guide/target.md"),
        "# Guide\n\n## Section\n\nContent.\n",
    )
    .unwrap();
    // This obsolete tree must never become the default source scope.
    fs::create_dir_all(temp.path().join("docs/books/cs-references")).unwrap();
    fs::write(
        temp.path().join("docs/books/cs-references/bad.md"),
        "[Bad](absent.md)\n",
    )
    .unwrap();
    temp
}

fn run(cwd: &Path, args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_docs-validator-rs"))
        .current_dir(cwd)
        .args(args)
        .output()
        .unwrap()
}

#[test]
fn default_scope_and_manifest_are_identical_from_root_and_nested_checkout() {
    let repo = repository();
    let root = run(repo.path(), &["--list-files"]);
    let nested = run(&repo.path().join("apps/docs-site"), &["--list-files"]);
    assert!(
        root.status.success(),
        "{}",
        String::from_utf8_lossy(&root.stderr)
    );
    assert!(nested.status.success());
    assert_eq!(root.stdout, nested.stdout);
    let output = String::from_utf8(root.stdout).unwrap();
    let manifest: Vec<_> = output
        .lines()
        .filter(|line| line.starts_with("SCAN "))
        .collect();
    assert_eq!(manifest.len(), 2);
    assert!(manifest[0].ends_with("content/docs/guide/target.md"));
    assert!(manifest[1].ends_with("content/docs/index.md"));
    assert!(output.contains("PASS strict mermaid parsing: 1 blocks across 2 files"));
    assert!(output.contains("PASS strict document links: 1 references across 2 files"));
    assert!(output.contains("PASS markdown format conventions: 2 files checked"));
}

#[test]
fn malformed_corpus_fails_with_deterministic_diagnostics_and_manifest() {
    let repo = repository();
    fs::write(
        repo.path().join("content/docs/bad.md"),
        "# Bad\n### Jump\n\n[Missing](missing.md)\n\n```mermaid\nflowchart TD\n  A -->\n```\n",
    )
    .unwrap();
    let first = run(repo.path(), &["--list-files"]);
    let second = run(repo.path(), &["--list-files"]);
    assert_eq!(first.status.code(), Some(1));
    assert_eq!(first.stdout, second.stdout);
    let output = String::from_utf8(first.stdout).unwrap();
    for kind in ["[mermaid]", "[links]", "[format]"] {
        assert!(output.contains(kind), "{output}");
    }
    assert_eq!(
        output
            .lines()
            .filter(|line| line.starts_with("SCAN "))
            .count(),
        3
    );
    let summary = run(repo.path(), &["--summary-only"]);
    assert_eq!(summary.status.code(), Some(1));
    assert!(!String::from_utf8(summary.stdout)
        .unwrap()
        .contains("[links]"));
}

#[test]
fn explicit_scope_uses_docs_base_for_cross_scope_anchors() {
    let repo = repository();
    fs::write(
        repo.path().join("content/docs/guide/target.md"),
        "# Guide\n\n[Home](/index.md#home)\n",
    )
    .unwrap();
    let output = run(
        &repo.path().join("apps/docs-site"),
        &[
            "--root",
            "content/docs/guide",
            "--check",
            "links",
            "--list-files",
        ],
    );
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stdout)
    );
    let text = String::from_utf8(output.stdout).unwrap();
    assert_eq!(
        text.lines()
            .filter(|line| line.starts_with("SCAN "))
            .count(),
        1
    );
    assert!(text.contains("1 references across 1 files"));
}

#[test]
fn missing_and_empty_scope_fail_instead_of_reporting_a_vacuous_pass() {
    let repo = repository();
    let missing = run(repo.path(), &["--root", "absent"]);
    assert!(!missing.status.success());
    assert!(String::from_utf8_lossy(&missing.stderr).contains("source root does not exist"));
    fs::create_dir(repo.path().join("empty")).unwrap();
    let empty = run(repo.path(), &["--root", "empty"]);
    assert!(!empty.status.success());
    assert!(String::from_utf8_lossy(&empty.stderr).contains("no markdown files"));
}

#[test]
fn link_root_is_opt_in_and_resolves_from_nested_checkouts_without_scanning_assets() {
    let repo = repository();
    let site = repo.path().join("dist/site");
    fs::create_dir_all(site.join("raw/catalog")).unwrap();
    fs::write(site.join("raw/compose.yaml"), "services: {}\n").unwrap();
    fs::write(site.join("raw/catalog/index.html"), "<h1>Catalog</h1>").unwrap();
    fs::write(site.join("raw/README.md"), "# Install\n").unwrap();
    fs::write(
        repo.path().join("content/docs/index.md"),
        "# Home\n\n[Compose](/raw/compose.yaml)\n[Catalog](/raw/catalog/)\n[Readme](/raw/README.md#install)\n",
    )
    .unwrap();
    let disabled = run(repo.path(), &["--check", "links"]);
    assert_eq!(disabled.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&disabled.stdout).contains("3 errors in 3 references"));
    let args = [
        "--link-root",
        "dist/site",
        "--check",
        "links",
        "--list-files",
    ];
    let root = run(repo.path(), &args);
    let nested = run(&repo.path().join("apps/docs-site"), &args);
    assert!(
        root.status.success(),
        "{}",
        String::from_utf8_lossy(&root.stdout)
    );
    assert!(nested.status.success());
    assert_eq!(root.stdout, nested.stdout);
    let output = String::from_utf8(root.stdout).unwrap();
    assert!(output.contains("3 references across 2 files"));
    assert_eq!(
        output
            .lines()
            .filter(|line| line.starts_with("SCAN "))
            .count(),
        2
    );
    assert!(!output
        .lines()
        .filter(|line| line.starts_with("SCAN "))
        .any(|line| line.contains("dist/site")));

    fs::write(site.join("raw/README.md"), "# Wrong Anchor\n").unwrap();
    let broken = run(repo.path(), &args);
    assert_eq!(broken.status.code(), Some(1));
    assert!(String::from_utf8_lossy(&broken.stdout).contains("missing anchor '#install'"));
}

#[test]
fn link_root_does_not_hide_source_anchor_errors_or_relative_link_typos() {
    let repo = repository();
    let site = repo.path().join("dist/site");
    fs::create_dir_all(site.join("guide/target")).unwrap();
    fs::create_dir_all(site.join("raw")).unwrap();
    fs::write(
        site.join("guide/target/index.html"),
        "<h1 id=\"generated\">Generated</h1>",
    )
    .unwrap();
    fs::write(site.join("raw/compose.yaml"), "services: {}\n").unwrap();
    fs::write(
        repo.path().join("content/docs/index.md"),
        "# Home\n\n[Source good](/guide/target/#section)\n[Source bad](/guide/target/#generated)\n[Relative typo](raw/compose.yaml)\n[Missing asset](/raw/missing.yaml)\n",
    )
    .unwrap();
    let result = run(
        repo.path(),
        &["--link-root", "dist/site", "--check", "links"],
    );
    assert_eq!(result.status.code(), Some(1));
    let output = String::from_utf8(result.stdout).unwrap();
    assert!(output.contains("3 errors in 4 references"), "{output}");
    assert!(output.contains("missing anchor '#generated'"));
    assert!(output.contains("content/docs/guide/target.md"));
    assert!(output.contains("target not found: raw/compose.yaml"));
    assert!(output.contains("target not found: /raw/missing.yaml"));
}

#[test]
fn generated_markdown_files_do_not_prove_nonexistent_published_routes() {
    let repo = repository();
    let site = repo.path().join("dist/site");
    fs::create_dir_all(site.join("raw/md-only")).unwrap();
    fs::write(site.join("raw/topic.md"), "# Topic\n").unwrap();
    fs::write(site.join("raw/md-only/index.md"), "# Index\n").unwrap();
    fs::write(
        repo.path().join("content/docs/index.md"),
        "# Home\n\n[Alias](/raw/topic)\n[Directory](/raw/md-only/)\n[Trailing slash](/raw/topic.md/)\n[Exact file](/raw/topic.md#topic)\n",
    )
    .unwrap();
    let output = run(
        repo.path(),
        &["--link-root", "dist/site", "--check", "links"],
    );
    assert_eq!(output.status.code(), Some(1));
    let text = String::from_utf8(output.stdout).unwrap();
    assert!(text.contains("3 errors in 4 references"), "{text}");
    assert!(text.contains("target not found: /raw/topic"));
    assert!(text.contains("target not found: /raw/md-only/"));
    assert!(text.contains("target not found: /raw/topic.md/"));
}

#[test]
fn invalid_link_root_fails_with_an_actionable_error() {
    let repo = repository();
    let missing = run(repo.path(), &["--link-root", "absent"]);
    assert_eq!(missing.status.code(), Some(1));
    assert!(
        String::from_utf8_lossy(&missing.stderr).contains("link root is not an existing directory")
    );
    let file = run(repo.path(), &["--link-root", "content/docs/index.md"]);
    assert_eq!(file.status.code(), Some(1));
    assert!(
        String::from_utf8_lossy(&file.stderr).contains("link root is not an existing directory")
    );
}
