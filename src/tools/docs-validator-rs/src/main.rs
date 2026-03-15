use std::path::PathBuf;

use anyhow::Result;
use clap::{Parser, ValueEnum};
use docs_validator_rs::{validate, CheckKind, ValidationOptions};

#[derive(Debug, Clone, Copy, ValueEnum)]
enum CheckMode {
    All,
    Mermaid,
    Links,
    Format,
}

#[derive(Debug, Parser)]
#[command(name = "docs-validator-rs")]
#[command(about = "Strict Mermaid and document link validator for markdown docs")]
struct Cli {
    /// Root directory to scan for source markdown files
    #[arg(long, default_value = "docs/books/cs-references")]
    root: PathBuf,

    /// Base docs directory used to resolve absolute links (e.g. /books/...)
    #[arg(long, default_value = "docs")]
    docs_base: PathBuf,

    /// Which checks to run
    #[arg(long, value_enum, default_value = "all")]
    check: CheckMode,

    /// Print only pass/fail summary lines, not every issue
    #[arg(long, default_value_t = false)]
    summary_only: bool,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let repo_root = detect_repo_root().unwrap_or(std::env::current_dir()?);
    let source_root = resolve_input_path(&repo_root, cli.root);
    let docs_base = resolve_input_path(&repo_root, cli.docs_base);

    let (check_mermaid, check_links, check_format) = match cli.check {
        CheckMode::All => (true, true, true),
        CheckMode::Mermaid => (true, false, false),
        CheckMode::Links => (false, true, false),
        CheckMode::Format => (false, false, true),
    };

    let report = validate(&ValidationOptions {
        source_root,
        docs_base,
        check_mermaid,
        check_links,
        check_format,
    })?;

    let mermaid_issues = report
        .issues
        .iter()
        .filter(|i| i.kind == CheckKind::Mermaid)
        .count();
    let link_issues = report
        .issues
        .iter()
        .filter(|i| i.kind == CheckKind::Links)
        .count();
    let format_issues = report
        .issues
        .iter()
        .filter(|i| i.kind == CheckKind::Format)
        .count();

    if check_mermaid {
        if mermaid_issues == 0 {
            println!(
                "PASS strict mermaid parsing: {} blocks across {} files",
                report.mermaid_blocks, report.scanned_files
            );
        } else {
            println!(
                "FAIL strict mermaid parsing: {} errors in {} blocks",
                mermaid_issues, report.mermaid_blocks
            );
        }
    }

    if check_links {
        if link_issues == 0 {
            println!(
                "PASS strict document links: {} references across {} files",
                report.links_checked, report.scanned_files
            );
        } else {
            println!(
                "FAIL strict document links: {} errors in {} references",
                link_issues, report.links_checked
            );
        }
    }

    if check_format {
        if format_issues == 0 {
            println!(
                "PASS markdown format conventions: {} files checked",
                report.format_files_checked
            );
        } else {
            println!(
                "FAIL markdown format conventions: {} issues across {} files",
                format_issues, report.format_files_checked
            );
        }
    }

    if !report.issues.is_empty() && !cli.summary_only {
        for issue in &report.issues {
            let kind = match issue.kind {
                CheckKind::Mermaid => "mermaid",
                CheckKind::Links => "links",
                CheckKind::Format => "format",
            };
            let line = issue
                .line
                .map(|v| v.to_string())
                .unwrap_or_else(|| "-".to_string());
            println!(
                "[{kind}] {}:{} {}",
                issue.file.display(),
                line,
                issue.detail
            );
        }
    }

    if !report.issues.is_empty() {
        std::process::exit(1);
    }

    Ok(())
}

fn resolve_input_path(repo_root: &std::path::Path, path: PathBuf) -> PathBuf {
    if path.is_absolute() {
        return path;
    }
    repo_root.join(path)
}

fn detect_repo_root() -> Option<PathBuf> {
    let mut dir = std::env::current_dir().ok()?;
    loop {
        let has_git = dir.join(".git").exists();
        let has_docs = dir.join("docs").is_dir() && dir.join("mkdocs.yml").is_file();
        if has_git || has_docs {
            return Some(dir);
        }
        if !dir.pop() {
            break;
        }
    }
    None
}
